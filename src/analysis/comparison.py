"""Competitive comparison analysis — feature matrix, messaging, personas, gaps."""

from sqlalchemy.orm import Session
from src.db.models import Company, Feature, ProductIntelligence, MarketingIntelligence
from src.extraction.llm import call_claude, extract_structured


def get_feature_matrix(db: Session, company_ids: list[int] | None = None) -> dict:
    """Build a feature comparison matrix across companies.

    Returns:
        {
            "companies": ["Company A", "Company B"],
            "categories": {
                "Category": {
                    "Feature X": {"Company A": true, "Company B": false},
                }
            }
        }
    """
    query = db.query(Company)
    if company_ids:
        query = query.filter(Company.id.in_(company_ids))
    companies = query.all()

    company_names = [c.name for c in companies]
    categories: dict[str, dict[str, dict[str, bool]]] = {}

    for company in companies:
        for feature in company.features:
            cat = feature.category or "General"
            if cat not in categories:
                categories[cat] = {}
            if feature.name not in categories[cat]:
                categories[cat][feature.name] = {n: False for n in company_names}
            categories[cat][feature.name][company.name] = True

    return {"companies": company_names, "categories": categories}


def get_marketing_comparison(db: Session, company_ids: list[int] | None = None) -> dict:
    """Compare marketing messages across companies."""
    query = db.query(Company)
    if company_ids:
        query = query.filter(Company.id.in_(company_ids))
    companies = query.all()

    comparison = {}
    for company in companies:
        mi = company.marketing_intel
        if mi:
            comparison[company.name] = {
                "value_propositions": mi.value_propositions or [],
                "key_messages": mi.key_messages or [],
                "differentiators": mi.differentiators or [],
                "tone": mi.tone or "",
                "pain_points": mi.pain_points or [],
            }
        else:
            comparison[company.name] = {
                "value_propositions": [], "key_messages": [],
                "differentiators": [], "tone": "", "pain_points": [],
            }

    return comparison


def get_persona_overlap(db: Session, company_ids: list[int] | None = None) -> dict:
    """Analyze target persona overlap between companies.

    Returns:
        {
            "companies": {...company: [personas]},
            "overlap_matrix": {...company: {...company: [shared_verticals]}},
            "unique_personas": {...company: [unique_personas]}
        }
    """
    query = db.query(Company)
    if company_ids:
        query = query.filter(Company.id.in_(company_ids))
    companies = query.all()

    company_personas: dict[str, list[dict]] = {}
    company_verticals: dict[str, set[str]] = {}

    for company in companies:
        mi = company.marketing_intel
        personas = mi.target_personas if mi else []
        company_personas[company.name] = personas
        verticals = set()
        for p in personas:
            if isinstance(p, dict):
                verticals.update(p.get("verticals", []))
        company_verticals[company.name] = verticals

    # Overlap matrix
    names = list(company_personas.keys())
    overlap_matrix = {}
    for a in names:
        overlap_matrix[a] = {}
        for b in names:
            if a == b:
                overlap_matrix[a][b] = list(company_verticals[a])
            else:
                shared = company_verticals[a] & company_verticals[b]
                overlap_matrix[a][b] = list(shared)

    # Unique verticals
    unique = {}
    for name in names:
        others = set()
        for other_name, verts in company_verticals.items():
            if other_name != name:
                others.update(verts)
        unique[name] = list(company_verticals[name] - others)

    return {
        "companies": company_personas,
        "overlap_matrix": overlap_matrix,
        "unique_personas": unique,
    }


def identify_gaps(db: Session, my_company_id: int) -> dict:
    """Identify feature and market gaps for your company vs competitors.

    Returns:
        {
            "missing_features": {"Category": ["feature not in your product"]},
            "unique_features": {"Category": ["feature only you have"]},
            "market_gaps": ["verticals no one targets well"],
            "messaging_gaps": ["differentiators competitors claim that you don't"]
        }
    """
    my_company = db.query(Company).get(my_company_id)
    if not my_company:
        return {"error": "Company not found"}

    competitors = db.query(Company).filter(Company.id != my_company_id).all()
    if not competitors:
        return {"error": "No competitors tracked"}

    # Feature gaps
    my_features = {f.name.lower() for f in my_company.features}
    competitor_features: dict[str, set[str]] = {}
    all_competitor_features: dict[str, str] = {}  # name -> category

    for comp in competitors:
        for f in comp.features:
            all_competitor_features[f.name.lower()] = f.category or "General"
            competitor_features.setdefault(comp.name, set()).add(f.name.lower())

    missing = {}
    for fname, cat in all_competitor_features.items():
        if fname not in my_features:
            missing.setdefault(cat, []).append(fname)

    unique = {}
    all_comp_flat = set()
    for s in competitor_features.values():
        all_comp_flat.update(s)
    for f in my_company.features:
        if f.name.lower() not in all_comp_flat:
            unique.setdefault(f.category or "General", []).append(f.name)

    # Market gaps
    my_verticals = set()
    if my_company.marketing_intel:
        for p in (my_company.marketing_intel.target_personas or []):
            if isinstance(p, dict):
                my_verticals.update(p.get("verticals", []))

    all_verticals = set(my_verticals)
    for comp in competitors:
        if comp.marketing_intel:
            for p in (comp.marketing_intel.target_personas or []):
                if isinstance(p, dict):
                    all_verticals.update(p.get("verticals", []))

    # Verticals targeted by competitors but not by us
    comp_verticals = all_verticals - my_verticals

    # Messaging gaps
    my_diffs = set()
    if my_company.marketing_intel:
        my_diffs = {d.lower() for d in (my_company.marketing_intel.differentiators or [])}

    comp_diffs = []
    for comp in competitors:
        if comp.marketing_intel:
            for d in (comp.marketing_intel.differentiators or []):
                if d.lower() not in my_diffs:
                    comp_diffs.append(f"{comp.name}: {d}")

    return {
        "missing_features": missing,
        "unique_features": unique,
        "market_gaps": list(comp_verticals),
        "messaging_gaps": comp_diffs,
    }
