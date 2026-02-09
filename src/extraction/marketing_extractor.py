"""Extract marketing intelligence from scraped content using Claude."""

from .llm import extract_structured

SYSTEM = """You are a marketing intelligence analyst. Analyze website content to understand a company's marketing strategy and messaging.
Always respond with valid JSON only."""


def extract_marketing_intelligence(company_name: str, pages_content: list[dict]) -> dict:
    """Extract value props, personas, messaging, differentiators, pain points.

    Returns:
        dict with: value_propositions, target_personas, key_messages, differentiators, pain_points, tone
    """
    # Use home + about + features pages for marketing analysis
    priority_types = ("home", "about", "features", "general")
    ordered = sorted(pages_content, key=lambda p: 0 if p.get("page_type") in priority_types else 1)[:8]

    combined = ""
    for p in ordered:
        combined += f"\n--- {p['title']} ({p['page_type']}) ---\n{p['content'][:2500]}\n"

    prompt = f"""Analyze the following website content for "{company_name}" and extract marketing intelligence.

{combined}

Return JSON with this exact structure:
{{
  "value_propositions": [
    "Core value proposition 1",
    "Core value proposition 2"
  ],
  "target_personas": [
    {{
      "name": "Persona name (e.g. 'Enterprise CTO')",
      "description": "Brief description of this target persona",
      "pain_points": ["Pain point 1", "Pain point 2"],
      "verticals": ["Industry 1", "Industry 2"]
    }}
  ],
  "key_messages": [
    "Key marketing message 1",
    "Key marketing message 2"
  ],
  "differentiators": [
    "Claimed differentiator 1",
    "Claimed differentiator 2"
  ],
  "pain_points": [
    "Pain point they sell against 1",
    "Pain point they sell against 2"
  ],
  "tone": "Description of overall marketing tone (e.g. 'Professional and enterprise-focused')"
}}

Be thorough. Read between the lines — identify implied personas and unstated differentiators."""

    result = extract_structured(SYSTEM, prompt)
    defaults = {
        "value_propositions": [],
        "target_personas": [],
        "key_messages": [],
        "differentiators": [],
        "pain_points": [],
        "tone": "",
    }
    for k, v in defaults.items():
        result.setdefault(k, v)
    return result
