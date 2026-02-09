"""Claude API wrapper for structured extraction."""

import json
from typing import Any
import anthropic
from config import settings


client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global client
    if client is None:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return client


def extract_json(text: str) -> Any:
    """Extract JSON from Claude's response, handling markdown fences."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]  # skip ```json
        end = next((i for i, l in enumerate(lines) if l.strip() == "```"), len(lines))
        text = "\n".join(lines[:end])
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object/array in text
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            s = text.find(start_char)
            e = text.rfind(end_char)
            if s != -1 and e != -1 and e > s:
                try:
                    return json.loads(text[s:e+1])
                except json.JSONDecodeError:
                    continue
        return {}


def call_claude(system: str, prompt: str, max_tokens: int | None = None) -> str:
    """Call Claude and return the text response."""
    c = get_client()
    response = c.messages.create(
        model=settings.claude_model,
        max_tokens=max_tokens or settings.claude_max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


def extract_structured(system: str, prompt: str) -> Any:
    """Call Claude expecting JSON output, parse and return."""
    text = call_claude(system, prompt)
    return extract_json(text)
