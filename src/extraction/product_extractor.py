"""Extract product intelligence from scraped content using Claude."""

from .llm import extract_structured

SYSTEM = """You are a product intelligence analyst. Analyze website content to understand a company's product offering.
Always respond with valid JSON only."""


def extract_product_intelligence(company_name: str, pages_content: list[dict]) -> dict:
    """Extract product features, tech stack clues, and positioning.

    Returns:
        dict with: features_by_category, tech_stack_clues, product_positioning, target_market
    """
    # Prioritize features and product pages
    priority = [p for p in pages_content if p.get("page_type") in ("features", "home")]
    other = [p for p in pages_content if p not in priority]
    ordered = (priority + other)[:8]

    combined = ""
    for p in ordered:
        combined += f"\n--- {p['title']} ({p['page_type']}) ---\n{p['content'][:2500]}\n"

    prompt = f"""Analyze the following website content for "{company_name}" and extract product intelligence.

{combined}

Return JSON with this exact structure:
{{
  "features_by_category": {{
    "Category Name": ["Feature 1", "Feature 2"],
    "Another Category": ["Feature A"]
  }},
  "tech_stack_clues": [
    "Technology or framework mentioned or implied"
  ],
  "product_positioning": "A paragraph describing how this product positions itself in the market",
  "target_market": "A paragraph describing the target market and ideal customer"
}}

Be thorough - extract ALL features you can identify, organized into logical categories.
Look for tech stack clues in page source hints, mentioned integrations, API references, etc."""

    result = extract_structured(SYSTEM, prompt)
    defaults = {
        "features_by_category": {},
        "tech_stack_clues": [],
        "product_positioning": "",
        "target_market": "",
    }
    for k, v in defaults.items():
        result.setdefault(k, v)
    return result
