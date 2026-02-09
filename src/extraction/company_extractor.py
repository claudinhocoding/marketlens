"""Extract company information from scraped pages using Claude."""

from .llm import extract_structured


SYSTEM = """You are a competitive intelligence analyst. Extract structured company information from website content.
Always respond with valid JSON only, no other text."""


def extract_company_info(pages_content: list[dict]) -> dict:
    """Extract company name, description, socials, contact from page content.

    Args:
        pages_content: list of {"url": str, "title": str, "content": str, "page_type": str}

    Returns:
        dict with keys: name, description, industry, socials, contact_info, logo_url
    """
    # Combine relevant pages (home, about, contact)
    relevant = [p for p in pages_content if p.get("page_type") in ("home", "about", "contact", "general")]
    if not relevant:
        relevant = pages_content[:3]

    combined = ""
    for p in relevant[:5]:
        combined += f"\n--- Page: {p['title']} ({p['url']}) ---\n{p['content'][:3000]}\n"

    prompt = f"""Analyze the following website content and extract company information.

{combined}

Return JSON with this exact structure:
{{
  "name": "Company Name",
  "description": "One paragraph company description",
  "industry": "Primary industry/sector",
  "socials": {{
    "twitter": "url or null",
    "linkedin": "url or null",
    "github": "url or null",
    "facebook": "url or null",
    "youtube": "url or null"
  }},
  "contact_info": {{
    "email": "email or null",
    "phone": "phone or null",
    "address": "address or null"
  }},
  "logo_url": "logo image URL or empty string"
}}"""

    result = extract_structured(SYSTEM, prompt)
    # Ensure required keys
    defaults = {
        "name": "", "description": "", "industry": "",
        "socials": {}, "contact_info": {}, "logo_url": ""
    }
    for k, v in defaults.items():
        result.setdefault(k, v)
    return result


def extract_blog_posts(pages_content: list[dict]) -> list[dict]:
    """Extract blog posts / news articles."""
    blog_pages = [p for p in pages_content if p.get("page_type") == "blog"]
    if not blog_pages:
        return []

    combined = ""
    for p in blog_pages[:5]:
        combined += f"\n--- {p['title']} ({p['url']}) ---\n{p['content'][:2000]}\n"

    prompt = f"""Extract blog posts or news articles from this content.

{combined}

Return a JSON array where each item has:
{{
  "title": "Post title",
  "url": "Post URL if available",
  "summary": "Brief summary",
  "tags": ["tag1", "tag2"]
}}"""

    result = extract_structured(SYSTEM, prompt)
    if isinstance(result, list):
        return result
    return result.get("posts", result.get("articles", []))


def extract_events(pages_content: list[dict]) -> list[dict]:
    """Extract events/conferences."""
    event_pages = [p for p in pages_content if p.get("page_type") == "events"]
    if not event_pages:
        # Check all pages for event mentions
        combined = ""
        for p in pages_content[:5]:
            combined += f"\n{p['content'][:1500]}\n"
    else:
        combined = ""
        for p in event_pages[:5]:
            combined += f"\n--- {p['title']} ({p['url']}) ---\n{p['content'][:2000]}\n"

    prompt = f"""Extract any events, conferences, webinars, or meetups mentioned in this content.

{combined}

Return a JSON array where each item has:
{{
  "name": "Event name",
  "url": "Event URL if available",
  "description": "Brief description",
  "event_date": "Date string or null",
  "location": "Location or 'Online'",
  "event_type": "conference|webinar|meetup|workshop"
}}

If no events found, return an empty array []."""

    result = extract_structured(SYSTEM, prompt)
    if isinstance(result, list):
        return result
    return result.get("events", [])


def extract_pricing(pages_content: list[dict]) -> list[dict]:
    """Extract pricing tiers."""
    pricing_pages = [p for p in pages_content if p.get("page_type") == "pricing"]
    if not pricing_pages:
        return []

    combined = ""
    for p in pricing_pages[:3]:
        combined += f"\n--- {p['title']} ({p['url']}) ---\n{p['content'][:4000]}\n"

    prompt = f"""Extract pricing tiers from this pricing page content.

{combined}

Return a JSON array where each item has:
{{
  "name": "Tier name (e.g. Free, Pro, Enterprise)",
  "price": "Price string (e.g. '$29/mo', 'Custom', 'Free')",
  "billing_period": "monthly|yearly|one-time|custom",
  "features": ["feature 1", "feature 2"],
  "is_popular": true/false
}}

If no pricing found, return an empty array []."""

    result = extract_structured(SYSTEM, prompt)
    if isinstance(result, list):
        return result
    return result.get("tiers", result.get("pricing", []))
