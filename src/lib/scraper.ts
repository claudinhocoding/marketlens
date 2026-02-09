import * as cheerio from "cheerio";

export interface ScrapedPage {
  url: string;
  title: string;
  description: string;
  text: string;
  links: string[];
  metadata: Record<string, string>;
}

export interface ScrapedSite {
  name: string;
  url: string;
  description: string;
  industry: string;
  mainPage: ScrapedPage;
  subPages: ScrapedPage[];
}

async function fetchPage(url: string): Promise<ScrapedPage> {
  const res = await fetch(url, {
    headers: { "User-Agent": "MarketLens/1.0" },
    signal: AbortSignal.timeout(30000),
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove scripts/styles
  $("script, style, noscript, iframe").remove();

  const metadata: Record<string, string> = {};
  $("meta").each((_, el) => {
    const name = $(el).attr("name") || $(el).attr("property") || "";
    const content = $(el).attr("content") || "";
    if (name && content) metadata[name] = content;
  });

  const title = $("title").text().trim() || $("h1").first().text().trim();
  const description =
    metadata["description"] || metadata["og:description"] || $("p").first().text().trim().slice(0, 300);

  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 50000);

  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      try {
        const absolute = new URL(href, url).href;
        if (!links.includes(absolute)) links.push(absolute);
      } catch {}
    }
  });

  return { url, title, description, text, links, metadata };
}

function findSubPages(links: string[], baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const patterns = [/pric/i, /blog/i, /about/i, /features?/i, /product/i, /solution/i, /plans/i];
  const found: string[] = [];

  for (const link of links) {
    try {
      const u = new URL(link);
      if (u.hostname !== base.hostname) continue;
      if (patterns.some((p) => p.test(u.pathname))) {
        if (!found.includes(link)) found.push(link);
      }
    } catch {}
  }

  return found.slice(0, 10);
}

export async function scrapeWebsite(url: string): Promise<ScrapedSite> {
  const mainPage = await fetchPage(url);
  const subPageUrls = findSubPages(mainPage.links, url);

  const subPages: ScrapedPage[] = [];
  for (const subUrl of subPageUrls) {
    try {
      subPages.push(await fetchPage(subUrl));
    } catch {}
  }

  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const name = mainPage.title.split(/[|\-–—]/).at(0)?.trim() || hostname;

  return {
    name,
    url,
    description: mainPage.description,
    industry: "",
    mainPage,
    subPages,
  };
}
