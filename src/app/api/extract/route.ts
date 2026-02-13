import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { scrapeWebsite } from "@/lib/scraper";
import { extractAll, extractJobListings } from "@/lib/extraction";
import {
  buildReplaceCompanyIntelTxns,
  normalizeCompanyUrl,
  type ExistingCompanyIntel,
} from "@/lib/ingestion";

export async function POST(req: NextRequest) {
  try {
    const { companyId, url } = await req.json();
    if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    const normalizedUrl = normalizeCompanyUrl(url);
    try {
      const parsed = new URL(normalizedUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json({ error: "Valid http/https URL required" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Valid URL required" }, { status: 400 });
    }

    const scraped = await scrapeWebsite(normalizedUrl);
    const allText = [scraped.mainPage.text, ...scraped.subPages.map((p) => p.text)].join("\n\n");
    const extracted = await extractAll(allText);

    const jobText = scraped.jobPages.map((p) => p.text).join("\n\n");
    const jobs = scraped.jobPages.length > 0 ? await extractJobListings(jobText) : [];

    const db = getAdminDb();

    const existingQuery = await db.query({
      companies: {
        $: { where: { id: companyId } },
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

    const existingCompany = (existingQuery.companies?.[0] as ExistingCompanyIntel | undefined) || undefined;

    if (!existingCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

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

    return NextResponse.json({ success: true, companyId, replaced: true, extracted, scraped });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
