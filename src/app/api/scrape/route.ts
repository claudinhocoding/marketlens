import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { scrapeWebsite } from "@/lib/scraper";
import { extractAll } from "@/lib/extraction";
import { requireApiAuth } from "@/lib/api-guard";
import {
  rateLimitIdentifier,
  requireGuestRateLimitIdentity,
  requireRateLimit,
} from "@/lib/rate-limit";
import { validateExternalCompanyUrl } from "@/lib/url-safety";

export async function POST(req: NextRequest) {
  try {
    const preAuthLimited = requireRateLimit({
      bucket: "api:scrape:preauth",
      identifier: rateLimitIdentifier(req),
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (preAuthLimited) return preAuthLimited;

    const auth = await requireApiAuth(req);
    if (!auth.ok) return auth.response;

    const ownerId = auth.user.id;

    const guestIdentityCheck = requireGuestRateLimitIdentity(req, Boolean(auth.user.isGuest));
    if (guestIdentityCheck) return guestIdentityCheck;

    const limited = requireRateLimit({
      bucket: "api:scrape",
      identifier: rateLimitIdentifier(req, ownerId, Boolean(auth.user.isGuest)),
      limit: 6,
      windowMs: 10 * 60 * 1000,
    });
    if (limited) return limited;

    const { url, depth } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const validation = await validateExternalCompanyUrl(url);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const normalizedUrl = validation.normalizedUrl;

    const db = getAdminDb();
    const maxSitesEnv = Number(process.env.NEXT_PUBLIC_MAX_SITES || "10");
    const maxSites = Number.isFinite(maxSitesEnv) ? Math.max(maxSitesEnv, 1) : 10;
    const existingCompanies = await db.query({
      companies: {
        $: { where: { owner_id: ownerId } },
      },
    });

    if ((existingCompanies.companies?.length || 0) >= maxSites) {
      return NextResponse.json(
        { error: `Site limit reached (${maxSites}). Remove a tracked company before adding more.` },
        { status: 400 }
      );
    }

    const scraped = await scrapeWebsite(normalizedUrl, Math.min(Math.max(depth || 1, 1), 5));

    // Combine all text for extraction
    const allText = [scraped.mainPage.text, ...scraped.subPages.map((p) => p.text)].join("\n\n");
    const extracted = await extractAll(allText);

    const companyId = id();

    // Store company
    await db.transact(
      db.tx.companies[companyId].update({
        owner_id: ownerId,
        name: scraped.name,
        url: normalizedUrl,
        description: scraped.description,
        industry: scraped.industry,
        is_mine: false,
        scraped_at: new Date().toISOString(),
        thumbnail_url: scraped.thumbnailUrl || "",
      })
    );

    // Store social profiles
    for (const sp of scraped.socialProfiles) {
      const spId = id();
      await db.transact([
        db.tx.social_profiles[spId].update({
          owner_id: ownerId,
          platform: sp.platform,
          url: sp.url,
          followers_count: sp.followers_count || 0,
        }),
        db.tx.companies[companyId].link({ social_profiles: spId }),
      ]);
    }

    // Store features
    for (const f of extracted.features) {
      const fid = id();
      await db.transact([
        db.tx.features[fid].update({
          owner_id: ownerId,
          name: f.name,
          category: f.category || "",
          description: f.description || "",
        }),
        db.tx.companies[companyId].link({ features: fid }),
      ]);
    }

    // Store pricing
    for (const t of extracted.pricing_tiers) {
      const tid = id();
      await db.transact([
        db.tx.pricing_tiers[tid].update({
          owner_id: ownerId,
          name: t.name,
          price: t.price || "",
          billing_period: t.billing_period || "",
          features_text: t.features_text || "",
        }),
        db.tx.companies[companyId].link({ pricing_tiers: tid }),
      ]);
    }

    // Store marketing intel
    if (extracted.marketing) {
      const mid = id();
      await db.transact([
        db.tx.marketing_intel[mid].update({
          owner_id: ownerId,
          value_props: JSON.stringify(extracted.marketing.value_props),
          target_personas: JSON.stringify(extracted.marketing.target_personas),
          key_messages: JSON.stringify(extracted.marketing.key_messages),
          differentiators: JSON.stringify(extracted.marketing.differentiators),
          pain_points: JSON.stringify(extracted.marketing.pain_points),
        }),
        db.tx.companies[companyId].link({ marketing_intel: mid }),
      ]);
    }

    // Extract and store job listings from job pages
    if (scraped.jobPages.length > 0) {
      const { extractJobListings } = await import("@/lib/extraction");
      const jobText = scraped.jobPages.map((p) => p.text).join("\n\n");
      const jobs = await extractJobListings(jobText);
      for (const j of jobs) {
        const jid = id();
        await db.transact([
          db.tx.job_listings[jid].update({
            owner_id: ownerId,
            title: j.title,
            location: j.location || "",
            department: j.department || "",
            url: j.url || "",
            posted_date: j.posted_date || "",
          }),
          db.tx.companies[companyId].link({ job_listings: jid }),
        ]);
      }
    }

    // Store contacts
    for (const c of extracted.contacts || []) {
      const cid = id();
      await db.transact([
        db.tx.contacts[cid].update({
          owner_id: ownerId,
          name: c.name,
          title: c.title || "",
          email: c.email || "",
          phone: c.phone || "",
          source_url: normalizedUrl,
        }),
        db.tx.companies[companyId].link({ contacts: cid }),
      ]);
    }

    // Store product intel
    if (extracted.product) {
      const pid = id();
      await db.transact([
        db.tx.product_intel[pid].update({
          owner_id: ownerId,
          feature_summary: extracted.product.feature_summary,
          tech_stack: extracted.product.tech_stack,
          positioning: extracted.product.positioning,
        }),
        db.tx.companies[companyId].link({ product_intel: pid }),
      ]);
    }

    return NextResponse.json({ success: true, companyId, scraped, extracted });
  } catch (err: unknown) {
    console.error("/api/scrape failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
