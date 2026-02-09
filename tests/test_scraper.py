"""Tests for scraper utilities (no actual browser needed)."""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.scraper.crawler import classify_page, extract_text, extract_links


def test_classify_page():
    assert classify_page("https://example.com/pricing") == "pricing"
    assert classify_page("https://example.com/blog/post-1") == "blog"
    assert classify_page("https://example.com/about") == "about"
    assert classify_page("https://example.com/features") == "features"
    assert classify_page("https://example.com/events") == "events"
    assert classify_page("https://example.com/") == "home"
    assert classify_page("https://example.com/random-page") == "general"


def test_extract_text():
    html = """
    <html><body>
    <script>var x = 1;</script>
    <nav>Nav content</nav>
    <main><p>Hello World</p><p>Another paragraph</p></main>
    <footer>Footer</footer>
    </body></html>
    """
    text = extract_text(html)
    assert "Hello World" in text
    assert "var x" not in text
    assert "Nav content" not in text


def test_extract_links():
    html = """
    <html><body>
    <a href="/about">About</a>
    <a href="https://example.com/pricing">Pricing</a>
    <a href="https://other.com/page">External</a>
    </body></html>
    """
    links = extract_links(html, "https://example.com")
    assert "https://example.com/about" in links
    assert "https://example.com/pricing" in links
    # External links should be excluded
    assert not any("other.com" in l for l in links)
