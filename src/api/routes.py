"""FastAPI routes for MarketLens."""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from src.db.models import (
    get_db, Company, ScrapedPage, Feature, PricingTier, BlogPost, Event,
    ProductIntelligence, MarketingIntelligence,
)
from src.db.vectorstore import vector_store
from src.scraper.crawler import scrape_site
from src.extraction.company_extractor import (
    extract_company_info, extract_blog_posts, extract_events, extract_pricing,
)
from src.extraction.product_extractor import extract_product_intelligence
from src.extraction.marketing_extractor import extract_marketing_intelligence
from src.analysis.comparison import (
    get_feature_matrix, get_marketing_comparison, get_persona_overlap, identify_gaps,
)
from src.analysis.targeting_matrix import build_targeting_matrix, format_matrix_text
from src.reports.assessment import generate_executive_summary, generate_full_report
from src.agent.agent import agent
from .schemas import (
    ScrapeRequest, CompanyResponse, AgentQuery, AgentResponse,
    ComparisonRequest, ReportRequest,
)

router = APIRouter()


# ── Companies ──────────────────────────────────────────────

@router.get("/companies", response_model=list[CompanyResponse])
def list_companies(db: Session = Depends(get_db)):
    return db.query(Company).all()


@router.get("/companies/{company_id}", response_model=CompanyResponse)
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).get(company_id)
    if not company:
        raise HTTPException(404, "Company not found")
    return company


@router.delete("/companies/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).get(company_id)
    if not company:
        raise HTTPException(404, "Company not found")
    vector_store.delete_company(company_id)
    db.delete(company)
    db.commit()
    return {"status": "deleted"}


@router.post("/companies/{company_id}/set-mine")
def set_my_company(company_id: int, db: Session = Depends(get_db)):
    """Designate a company as yours."""
    # Unset any current
    db.query(Company).filter(Company.is_mine == True).update({"is_mine": False})
    company = db.query(Company).get(company_id)
    if not company:
        raise HTTPException(404, "Company not found")
    company.is_mine = True
    db.commit()
    return {"status": "ok", "my_company": company.name}


# ── Scraping ───────────────────────────────────────────────

@router.post("/scrape")
async def scrape_company(req: ScrapeRequest, db: Session = Depends(get_db)):
    """Scrape a competitor website, extract intelligence, and store everything."""
    # Check if already exists
    existing = db.query(Company).filter(Company.url == req.url.rstrip("/")).first()
    if existing:
        raise HTTPException(409, f"Company already tracked (id={existing.id}). Delete first to re-scrape.")

    # 1. Scrape
    pages = await scrape_site(req.url, max_pages=req.max_pages)
    if not pages:
        raise HTTPException(400, "Could not scrape any pages from this URL")

    pages_data = [
        {"url": p.url, "title": p.title, "content": p.content, "page_type": p.page_type}
        for p in pages
    ]

    # 2. Extract company info
    info = extract_company_info(pages_data)

    # 3. Create company
    company = Company(
        name=info.get("name") or req.url,
        url=req.url.rstrip("/"),
        description=info.get("description", ""),
        industry=info.get("industry", ""),
        logo_url=info.get("logo_url", ""),
        is_mine=req.is_mine,
        socials=info.get("socials", {}),
        contact_info=info.get("contact_info", {}),
    )
    db.add(company)
    db.flush()

    # 4. Store scraped pages
    for p in pages:
        sp = ScrapedPage(
            company_id=company.id,
            url=p.url,
            title=p.title,
            content=p.content,
            page_type=p.page_type,
        )
        db.add(sp)
        db.flush()
        vector_store.upsert_page(company.id, company.name, sp.id, sp.title, sp.content, sp.page_type)

    # 5. Extract blog posts
    blog_posts = extract_blog_posts(pages_data)
    for bp in blog_posts:
        db.add(BlogPost(
            company_id=company.id,
            title=bp.get("title", ""),
            url=bp.get("url", ""),
            summary=bp.get("summary", ""),
            tags=bp.get("tags", []),
        ))

    # 6. Extract events
    events = extract_events(pages_data)
    for ev in events:
        db.add(Event(
            company_id=company.id,
            name=ev.get("name", ""),
            url=ev.get("url", ""),
            description=ev.get("description", ""),
            location=ev.get("location", ""),
            event_type=ev.get("event_type", "conference"),
        ))

    # 7. Extract pricing
    pricing = extract_pricing(pages_data)
    for tier in pricing:
        db.add(PricingTier(
            company_id=company.id,
            name=tier.get("name", ""),
            price=tier.get("price", ""),
            billing_period=tier.get("billing_period", "monthly"),
            features=tier.get("features", []),
            is_popular=tier.get("is_popular", False),
        ))

    # 8. Product intelligence
    product_intel = extract_product_intelligence(company.name, pages_data)
    pi = ProductIntelligence(
        company_id=company.id,
        features_by_category=product_intel.get("features_by_category", {}),
        tech_stack_clues=product_intel.get("tech_stack_clues", []),
        product_positioning=product_intel.get("product_positioning", ""),
        target_market=product_intel.get("target_market", ""),
    )
    db.add(pi)

    # Store individual features from product intel
    for cat, feats in product_intel.get("features_by_category", {}).items():
        for fname in feats:
            db.add(Feature(company_id=company.id, name=fname, category=cat))

    # 9. Marketing intelligence
    mkt_intel = extract_marketing_intelligence(company.name, pages_data)
    mi = MarketingIntelligence(
        company_id=company.id,
        value_propositions=mkt_intel.get("value_propositions", []),
        target_personas=mkt_intel.get("target_personas", []),
        key_messages=mkt_intel.get("key_messages", []),
        differentiators=mkt_intel.get("differentiators", []),
        pain_points=mkt_intel.get("pain_points", []),
        tone=mkt_intel.get("tone", ""),
    )
    db.add(mi)

    # 10. Index intelligence in vector store
    vector_store.upsert_company_data(company.id, company.name, {
        "product_intelligence": product_intel,
        "marketing_intelligence": mkt_intel,
        "pricing": pricing,
        "company_info": info,
    })

    db.commit()

    return {
        "status": "success",
        "company_id": company.id,
        "company_name": company.name,
        "pages_scraped": len(pages),
        "features_extracted": sum(len(f) for f in product_intel.get("features_by_category", {}).values()),
        "pricing_tiers": len(pricing),
        "blog_posts": len(blog_posts),
        "events": len(events),
    }


# ── Intelligence ───────────────────────────────────────────

@router.get("/companies/{company_id}/product-intelligence")
def get_product_intel(company_id: int, db: Session = Depends(get_db)):
    pi = db.query(ProductIntelligence).filter(ProductIntelligence.company_id == company_id).first()
    if not pi:
        raise HTTPException(404, "No product intelligence for this company")
    return {
        "features_by_category": pi.features_by_category,
        "tech_stack_clues": pi.tech_stack_clues,
        "product_positioning": pi.product_positioning,
        "target_market": pi.target_market,
    }


@router.get("/companies/{company_id}/marketing-intelligence")
def get_marketing_intel(company_id: int, db: Session = Depends(get_db)):
    mi = db.query(MarketingIntelligence).filter(MarketingIntelligence.company_id == company_id).first()
    if not mi:
        raise HTTPException(404, "No marketing intelligence for this company")
    return {
        "value_propositions": mi.value_propositions,
        "target_personas": mi.target_personas,
        "key_messages": mi.key_messages,
        "differentiators": mi.differentiators,
        "pain_points": mi.pain_points,
        "tone": mi.tone,
    }


@router.get("/companies/{company_id}/pricing")
def get_pricing(company_id: int, db: Session = Depends(get_db)):
    tiers = db.query(PricingTier).filter(PricingTier.company_id == company_id).all()
    return [
        {"name": t.name, "price": t.price, "billing_period": t.billing_period,
         "features": t.features, "is_popular": t.is_popular}
        for t in tiers
    ]


@router.get("/companies/{company_id}/events")
def get_events(company_id: int, db: Session = Depends(get_db)):
    events = db.query(Event).filter(Event.company_id == company_id).all()
    return [
        {"name": e.name, "url": e.url, "description": e.description,
         "event_date": str(e.event_date) if e.event_date else None,
         "location": e.location, "event_type": e.event_type}
        for e in events
    ]


@router.get("/events")
def get_all_events(db: Session = Depends(get_db)):
    """Get all events across all companies (calendar view)."""
    events = db.query(Event).join(Company).all()
    return [
        {"company": e.company.name, "name": e.name, "url": e.url,
         "description": e.description,
         "event_date": str(e.event_date) if e.event_date else None,
         "location": e.location, "event_type": e.event_type}
        for e in events
    ]


# ── Analysis ───────────────────────────────────────────────

@router.post("/analysis/feature-matrix")
def feature_matrix(req: ComparisonRequest, db: Session = Depends(get_db)):
    return get_feature_matrix(db, req.company_ids)


@router.post("/analysis/marketing-comparison")
def marketing_comparison(req: ComparisonRequest, db: Session = Depends(get_db)):
    return get_marketing_comparison(db, req.company_ids)


@router.post("/analysis/persona-overlap")
def persona_overlap(req: ComparisonRequest, db: Session = Depends(get_db)):
    return get_persona_overlap(db, req.company_ids)


@router.post("/analysis/gaps")
def gap_analysis(req: ReportRequest, db: Session = Depends(get_db)):
    return identify_gaps(db, req.my_company_id)


@router.post("/analysis/targeting-matrix")
def targeting_matrix(req: ComparisonRequest, db: Session = Depends(get_db)):
    data = build_targeting_matrix(db, req.company_ids)
    data["formatted"] = format_matrix_text(data)
    return data


# ── Reports ────────────────────────────────────────────────

@router.post("/reports/executive-summary")
def executive_summary(req: ReportRequest, db: Session = Depends(get_db)):
    return {"summary": generate_executive_summary(db, req.my_company_id)}


@router.post("/reports/full")
def full_report(req: ReportRequest, db: Session = Depends(get_db)):
    return {"report": generate_full_report(db, req.my_company_id)}


# ── Agent ──────────────────────────────────────────────────

@router.post("/agent/query", response_model=AgentResponse)
def agent_query(req: AgentQuery, db: Session = Depends(get_db)):
    response = agent.query(req.query, db)
    return AgentResponse(response=response)


@router.post("/agent/reset")
def agent_reset():
    agent.reset()
    return {"status": "conversation reset"}


# ── Search ─────────────────────────────────────────────────

@router.get("/search")
def search(q: str, n: int = 10, company_id: int | None = None):
    results = vector_store.search(q, n_results=n, company_id=company_id)
    return {"query": q, "results": results}
