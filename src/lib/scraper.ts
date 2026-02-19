import * as cheerio from "cheerio";
import { validateExternalCompanyUrl } from "@/lib/url-safety";

export interface ScrapedPage {
  url: string;
  title: string;
  description: string;
  text: string;
  links: string[];
  metadata: Record<string, string>;
}

export interface SocialProfile {
  platform: string;
  url: string;
  followers_count?: number;
}

export interface ScrapedSite {
  name: string;
  url: string;
  description: string;
  industry: string;
  mainPage: ScrapedPage;
  subPages: ScrapedPage[];
  socialProfiles: SocialProfile[];
  thumbnailUrl?: string;
  jobPages: ScrapedPage[];
}

const redirectStatuses = new Set([301, 302, 303, 307, 308]);

async function fetchPage(url: string): Promise<ScrapedPage> {
  let currentUrl = url;

  for (let redirectHop = 0; redirectHop < 5; redirectHop++) {
    const validation = await validateExternalCompanyUrl(currentUrl);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    currentUrl = validation.normalizedUrl;

    const res = await fetch(currentUrl, {
      headers: { "User-Agent": "MarketLens/1.0" },
      signal: AbortSignal.timeout(30000),
      redirect: "manual",
    });

    if (redirectStatuses.has(res.status)) {
      const location = res.headers.get("location");
      if (!location) {
        throw new Error("Redirect response missing location header");
      }

      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch ${currentUrl}: ${res.status}`);
    }

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
          const absolute = new URL(href, currentUrl).href;
          if (!links.includes(absolute)) links.push(absolute);
        } catch {
          // ignore invalid links
        }
      }
    });

    return { url: currentUrl, title, description, text, links, metadata };
  }

  throw new Error("Too many redirects while fetching page");
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

function extractSocialProfiles(links: string[]): SocialProfile[] {
  const patterns: { platform: string; regex: RegExp }[] = [
    { platform: "LinkedIn", regex: /linkedin\.com\/(company|in)\// },
    { platform: "Twitter/X", regex: /(twitter\.com|x\.com)\/(?!share)/ },
    { platform: "YouTube", regex: /youtube\.com\/(c\/|channel\/|@)/ },
    { platform: "Facebook", regex: /facebook\.com\/(?!sharer)/ },
    { platform: "GitHub", regex: /github\.com\/(?!login)/ },
  ];
  const found: SocialProfile[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    for (const { platform, regex } of patterns) {
      if (regex.test(link) && !seen.has(platform)) {
        seen.add(platform);
        found.push({ platform, url: link });
      }
    }
  }
  return found;
}

function extractThumbnailUrl(page: ScrapedPage): string | undefined {
  return page.metadata["og:image"] || page.metadata["twitter:image"] || undefined;
}

function findJobPages(links: string[], baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const patterns = [/careers?/i, /jobs?/i, /hiring/i, /openings/i, /positions/i];
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
  return found.slice(0, 5);
}

/** Scrape a website with configurable depth (1-5 levels of link following) */
export async function scrapeWebsite(url: string, depth: number = 1): Promise<ScrapedSite> {
  depth = Math.min(Math.max(depth, 1), 5);
  const mainPage = await fetchPage(url);
  const allLinks = [...mainPage.links];
  const subPageUrls = findSubPages(mainPage.links, url);

  const subPages: ScrapedPage[] = [];
  const visited = new Set<string>([url]);

  // Depth 1: scrape subPages normally
  for (const subUrl of subPageUrls) {
    if (visited.has(subUrl)) continue;
    visited.add(subUrl);
    try {
      const page = await fetchPage(subUrl);
      subPages.push(page);
      allLinks.push(...page.links);
    } catch {}
  }

  // Additional depth levels
  if (depth > 1) {
    let frontier = subPages.flatMap(p => p.links).filter(l => {
      try { return new URL(l).hostname === new URL(url).hostname; } catch { return false; }
    });
    for (let d = 2; d <= depth && frontier.length > 0; d++) {
      const nextFrontier: string[] = [];
      for (const link of frontier.slice(0, 10)) {
        if (visited.has(link)) continue;
        visited.add(link);
        try {
          const page = await fetchPage(link);
          subPages.push(page);
          allLinks.push(...page.links);
          nextFrontier.push(...page.links);
        } catch {}
      }
      frontier = nextFrontier.filter(l => {
        try { return new URL(l).hostname === new URL(url).hostname; } catch { return false; }
      });
    }
  }

  // Find job pages
  const jobPageUrls = findJobPages(allLinks, url);
  const jobPages: ScrapedPage[] = [];
  for (const jobUrl of jobPageUrls) {
    if (visited.has(jobUrl)) continue;
    visited.add(jobUrl);
    try {
      jobPages.push(await fetchPage(jobUrl));
    } catch {}
  }

  const socialProfiles = extractSocialProfiles(allLinks);
  const thumbnailUrl = extractThumbnailUrl(mainPage);
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const name = mainPage.title.split(/[|\-–—]/).at(0)?.trim() || hostname;

  return {
    name,
    url,
    description: mainPage.description,
    industry: "",
    mainPage,
    subPages,
    socialProfiles,
    thumbnailUrl,
    jobPages,
  };
}
