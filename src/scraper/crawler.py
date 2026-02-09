"""Web scraper using Playwright to crawl competitor websites."""

import asyncio
import re
from urllib.parse import urljoin, urlparse
from dataclasses import dataclass, field
from playwright.async_api import async_playwright, Page, Browser
from bs4 import BeautifulSoup
from config import settings


@dataclass
class PageResult:
    url: str
    title: str
    content: str
    html: str
    page_type: str = "general"
    links: list[str] = field(default_factory=list)


# Heuristics to classify page types
PAGE_TYPE_PATTERNS = {
    "pricing": [r"/pricing", r"/plans", r"/packages"],
    "blog": [r"/blog", r"/news", r"/articles", r"/posts", r"/insights"],
    "about": [r"/about", r"/team", r"/company", r"/our-story"],
    "features": [r"/features", r"/product", r"/solutions", r"/capabilities"],
    "events": [r"/events", r"/webinars", r"/conferences", r"/calendar"],
    "contact": [r"/contact", r"/support", r"/help"],
    "careers": [r"/careers", r"/jobs", r"/hiring"],
}


def classify_page(url: str) -> str:
    path = urlparse(url).path.lower()
    for page_type, patterns in PAGE_TYPE_PATTERNS.items():
        if any(re.search(p, path) for p in patterns):
            return page_type
    if path in ("", "/"):
        return "home"
    return "general"


def extract_text(html: str) -> str:
    """Extract readable text from HTML, stripping nav/footer/script."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    # Collapse blank lines
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)


def extract_links(html: str, base_url: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        full = urljoin(base_url, href)
        parsed = urlparse(full)
        # Same domain only, no fragments/query
        if parsed.netloc == urlparse(base_url).netloc:
            clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
            links.add(clean)
    return list(links)


class SiteCrawler:
    """Crawl a website breadth-first, collecting page content."""

    def __init__(self, base_url: str, max_pages: int | None = None, headless: bool | None = None):
        self.base_url = base_url.rstrip("/")
        self.domain = urlparse(self.base_url).netloc
        self.max_pages = max_pages or settings.scraper_max_pages
        self.headless = headless if headless is not None else settings.scraper_headless
        self.visited: set[str] = set()
        self.results: list[PageResult] = []

    async def _scrape_page(self, page: Page, url: str) -> PageResult | None:
        try:
            resp = await page.goto(url, timeout=settings.scraper_timeout, wait_until="domcontentloaded")
            if resp is None or resp.status >= 400:
                return None
            # Wait a bit for JS rendering
            await page.wait_for_timeout(1500)
            html = await page.content()
            title = await page.title()
            content = extract_text(html)
            links = extract_links(html, self.base_url)
            page_type = classify_page(url)
            return PageResult(url=url, title=title, content=content, html=html, page_type=page_type, links=links)
        except Exception:
            return None

    async def crawl(self) -> list[PageResult]:
        """Run the crawler. Returns list of PageResult."""
        async with async_playwright() as p:
            browser: Browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()

            queue = [self.base_url]
            self.visited = set()

            while queue and len(self.results) < self.max_pages:
                url = queue.pop(0)
                normalized = url.rstrip("/")
                if normalized in self.visited:
                    continue
                self.visited.add(normalized)

                result = await self._scrape_page(page, url)
                if result:
                    self.results.append(result)
                    # Add new links to queue, prioritizing important pages
                    for link in result.links:
                        norm_link = link.rstrip("/")
                        if norm_link not in self.visited:
                            ptype = classify_page(link)
                            if ptype in ("pricing", "features", "about", "blog", "events"):
                                queue.insert(0, link)  # priority
                            else:
                                queue.append(link)

            await browser.close()

        return self.results


async def scrape_site(url: str, max_pages: int | None = None) -> list[PageResult]:
    """Convenience function to scrape a site."""
    crawler = SiteCrawler(url, max_pages=max_pages)
    return await crawler.crawl()
