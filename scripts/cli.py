#!/usr/bin/env python3
"""MarketLens CLI — command-line interface for competitive intelligence."""

import sys
import os
import asyncio
import json

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.markdown import Markdown

from src.db.models import init_db, SessionLocal, Company
from src.scraper.crawler import scrape_site
from src.extraction.company_extractor import (
    extract_company_info, extract_blog_posts, extract_events, extract_pricing,
)
from src.extraction.product_extractor import extract_product_intelligence
from src.extraction.marketing_extractor import extract_marketing_intelligence
from src.db.models import (
    ScrapedPage, Feature, PricingTier, BlogPost, Event,
    ProductIntelligence, MarketingIntelligence,
)
from src.db.vectorstore import vector_store
from src.analysis.comparison import get_feature_matrix, identify_gaps
from src.analysis.targeting_matrix import build_targeting_matrix, format_matrix_text
from src.reports.assessment import generate_executive_summary, generate_full_report
from src.agent.agent import agent

console = Console()


@click.group()
def cli():
    """MarketLens — Competitive Intelligence Platform"""
    init_db()


@cli.command()
@click.argument("url")
@click.option("--max-pages", default=15, help="Max pages to scrape")
@click.option("--mine", is_flag=True, help="Mark as your company")
def scrape(url: str, max_pages: int, mine: bool):
    """Scrape a competitor website and extract intelligence."""
    console.print(f"[bold blue]Scraping {url}...[/]")

    pages = asyncio.run(scrape_site(url, max_pages=max_pages))
    if not pages:
        console.print("[red]No pages scraped.[/]")
        return

    console.print(f"[green]Scraped {len(pages)} pages[/]")
    pages_data = [
        {"url": p.url, "title": p.title, "content": p.content, "page_type": p.page_type}
        for p in pages
    ]

    # Extract
    console.print("[blue]Extracting company info...[/]")
    info = extract_company_info(pages_data)

    db = SessionLocal()
    try:
        company = Company(
            name=info.get("name") or url,
            url=url.rstrip("/"),
            description=info.get("description", ""),
            industry=info.get("industry", ""),
            logo_url=info.get("logo_url", ""),
            is_mine=mine,
            socials=info.get("socials", {}),
            contact_info=info.get("contact_info", {}),
        )
        db.add(company)
        db.flush()

        for p in pages:
            sp = ScrapedPage(company_id=company.id, url=p.url, title=p.title, content=p.content, page_type=p.page_type)
            db.add(sp)
            db.flush()
            vector_store.upsert_page(company.id, company.name, sp.id, sp.title, sp.content, sp.page_type)

        console.print("[blue]Extracting blog posts...[/]")
        for bp in extract_blog_posts(pages_data):
            db.add(BlogPost(company_id=company.id, title=bp.get("title", ""), url=bp.get("url", ""), summary=bp.get("summary", ""), tags=bp.get("tags", [])))

        console.print("[blue]Extracting events...[/]")
        for ev in extract_events(pages_data):
            db.add(Event(company_id=company.id, name=ev.get("name", ""), url=ev.get("url", ""), description=ev.get("description", ""), location=ev.get("location", ""), event_type=ev.get("event_type", "conference")))

        console.print("[blue]Extracting pricing...[/]")
        for tier in extract_pricing(pages_data):
            db.add(PricingTier(company_id=company.id, name=tier.get("name", ""), price=tier.get("price", ""), billing_period=tier.get("billing_period", "monthly"), features=tier.get("features", []), is_popular=tier.get("is_popular", False)))

        console.print("[blue]Analyzing product intelligence...[/]")
        pi_data = extract_product_intelligence(company.name, pages_data)
        db.add(ProductIntelligence(company_id=company.id, features_by_category=pi_data.get("features_by_category", {}), tech_stack_clues=pi_data.get("tech_stack_clues", []), product_positioning=pi_data.get("product_positioning", ""), target_market=pi_data.get("target_market", "")))
        for cat, feats in pi_data.get("features_by_category", {}).items():
            for fname in feats:
                db.add(Feature(company_id=company.id, name=fname, category=cat))

        console.print("[blue]Analyzing marketing intelligence...[/]")
        mi_data = extract_marketing_intelligence(company.name, pages_data)
        db.add(MarketingIntelligence(company_id=company.id, value_propositions=mi_data.get("value_propositions", []), target_personas=mi_data.get("target_personas", []), key_messages=mi_data.get("key_messages", []), differentiators=mi_data.get("differentiators", []), pain_points=mi_data.get("pain_points", []), tone=mi_data.get("tone", "")))

        vector_store.upsert_company_data(company.id, company.name, {"product_intelligence": pi_data, "marketing_intelligence": mi_data})

        db.commit()
        console.print(Panel(f"[bold green]✓ {company.name}[/] added (id={company.id})\n"
                            f"Pages: {len(pages)} | Features: {sum(len(f) for f in pi_data.get('features_by_category', {}).values())}",
                            title="Scrape Complete"))
    finally:
        db.close()


@cli.command("list")
def list_companies():
    """List all tracked companies."""
    db = SessionLocal()
    companies = db.query(Company).all()
    db.close()

    if not companies:
        console.print("[yellow]No companies tracked yet. Use 'scrape' to add one.[/]")
        return

    table = Table(title="Tracked Companies")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="bold")
    table.add_column("URL")
    table.add_column("Industry")
    table.add_column("Mine", style="green")

    for c in companies:
        table.add_row(str(c.id), c.name, c.url, c.industry, "✓" if c.is_mine else "")

    console.print(table)


@cli.command()
@click.argument("company_id", type=int)
def set_mine(company_id: int):
    """Set a company as yours for comparison."""
    db = SessionLocal()
    db.query(Company).filter(Company.is_mine == True).update({"is_mine": False})
    c = db.query(Company).get(company_id)
    if not c:
        console.print("[red]Company not found[/]")
        db.close()
        return
    c.is_mine = True
    db.commit()
    console.print(f"[green]✓ {c.name} set as your company[/]")
    db.close()


@cli.command()
def compare():
    """Show feature comparison matrix."""
    db = SessionLocal()
    matrix = get_feature_matrix(db)
    db.close()

    companies = matrix["companies"]
    if not companies:
        console.print("[yellow]No companies to compare.[/]")
        return

    for cat, features in matrix["categories"].items():
        table = Table(title=cat)
        table.add_column("Feature", style="bold")
        for c in companies:
            table.add_column(c)
        for fname, presence in features.items():
            row = [fname] + ["✅" if presence.get(c) else "❌" for c in companies]
            table.add_row(*row)
        console.print(table)
        console.print()


@cli.command()
def gaps():
    """Show gap analysis for your company."""
    db = SessionLocal()
    my = db.query(Company).filter(Company.is_mine == True).first()
    if not my:
        console.print("[red]No company set as yours. Use 'set-mine' first.[/]")
        db.close()
        return

    result = identify_gaps(db, my.id)
    db.close()

    console.print(Panel(f"[bold]Gap Analysis for {my.name}[/]"))

    if result.get("missing_features"):
        console.print("\n[bold red]Missing Features:[/]")
        for cat, feats in result["missing_features"].items():
            console.print(f"  [cyan]{cat}:[/] {', '.join(feats)}")

    if result.get("unique_features"):
        console.print("\n[bold green]Your Unique Features:[/]")
        for cat, feats in result["unique_features"].items():
            console.print(f"  [cyan]{cat}:[/] {', '.join(feats)}")

    if result.get("market_gaps"):
        console.print(f"\n[bold yellow]Untapped Markets:[/] {', '.join(result['market_gaps'])}")

    if result.get("messaging_gaps"):
        console.print("\n[bold yellow]Messaging Gaps:[/]")
        for g in result["messaging_gaps"]:
            console.print(f"  - {g}")


@cli.command()
def targeting():
    """Show market targeting matrix."""
    db = SessionLocal()
    data = build_targeting_matrix(db)
    db.close()
    console.print(Panel(format_matrix_text(data), title="Market Targeting Matrix"))


@cli.command()
def report():
    """Generate full competitive assessment report."""
    db = SessionLocal()
    my = db.query(Company).filter(Company.is_mine == True).first()
    if not my:
        console.print("[red]No company set as yours. Use 'set-mine' first.[/]")
        db.close()
        return

    console.print("[blue]Generating report (this may take a minute)...[/]")
    md = generate_full_report(db, my.id)
    db.close()

    console.print(Markdown(md))

    # Also save to file
    out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "report.md")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        f.write(md)
    console.print(f"\n[green]Report saved to {out_path}[/]")


@cli.command()
def chat():
    """Interactive chat with the MarketLens AI agent."""
    console.print(Panel("[bold]MarketLens AI Agent[/]\nAsk questions about your competitive landscape.\nType 'quit' to exit."))

    while True:
        try:
            query = console.input("[bold cyan]You>[/] ")
        except (EOFError, KeyboardInterrupt):
            break

        if query.strip().lower() in ("quit", "exit", "q"):
            break
        if not query.strip():
            continue

        with console.status("[blue]Thinking...[/]"):
            response = agent.query(query)

        console.print(Panel(Markdown(response), title="MarketLens AI"))


@cli.command()
def events():
    """Show all tracked events."""
    db = SessionLocal()
    from src.db.models import Event as EventModel
    all_events = db.query(EventModel).join(Company).all()
    db.close()

    if not all_events:
        console.print("[yellow]No events tracked.[/]")
        return

    table = Table(title="Competitor Events Calendar")
    table.add_column("Company", style="cyan")
    table.add_column("Event", style="bold")
    table.add_column("Date")
    table.add_column("Location")
    table.add_column("Type")

    for e in all_events:
        table.add_row(e.company.name, e.name, str(e.event_date) if e.event_date else "TBD", e.location, e.event_type)

    console.print(table)


if __name__ == "__main__":
    cli()
