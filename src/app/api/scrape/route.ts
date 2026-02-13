import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { scrapeWebsite } from "@/lib/scraper";
import { extractAll, extractJobListings } from "@/lib/extraction";
import {
  buildReplaceCompanyIntelTxns,
  normalizeCompanyUrl,
  type ExistingCompanyIntel,
} from "@/lib/ingestion";

export async function POST(req: NextRequest) {
  try {
    const { url, depth } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const normalizedUrl = normalizeCompanyUrl(url);
    const safeDepth = Math.min(Math.max(Number(depth) || 1, 1), 5);

    const scraped = await scrapeWebsite(normalizedUrl, safeDepth);

    // Combine all text for extraction
    const allText = [scraped.mainPage.text, ...scraped.subPages.map((p) => p.text)].join("\n\n");
    const extracted = await extractAll(allText);

    // Extract job listings from job pages
    const jobText = scraped.jobPages.map((p) => p.text).join("\n\n");
    const jobs = scraped.jobPages.length > 0 ? await extractJobListings(jobText) : [];

    const db = getAdminDb();

    const existingQuery = await db.query({
      companies: {
        features: {},
        pricing_tiers: {},
        marketing_intel: {},
        product_intel: {},
        blog_posts: {},
        events: {},
        contacts: {},
        job_listings: {},
        social_profiles: {},
      },
    });

    const existingCompany = ((existingQuery.companies || []) as ExistingCompanyIntel[]).find(
      (c) => normalizeCompanyUrl(c.url || "") === normalizedUrl
    );

    const companyId = existingCompany?.id || id();

    const txns = buildReplaceCompanyIntelTxns({
      db,
      companyId,
      sourceUrl: normalizedUrl,
      scraped,
      extracted,
      jobs,
      existing: existingCompany,
    });

    await db.transact(txns);

    return NextResponse.json({
      success: true,
      companyId,
      replaced: Boolean(existingCompany),
      scraped,
      extracted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
