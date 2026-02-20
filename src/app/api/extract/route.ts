import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { extractAll } from "@/lib/extraction";
import { scrapeWebsite } from "@/lib/scraper";
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
      bucket: "api:extract:preauth",
      identifier: rateLimitIdentifier(req),
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (preAuthLimited) return preAuthLimited;

    const auth = await requireApiAuth(req);
    if (!auth.ok) return auth.response;

    const ownerId = auth.user.id;

    const guestIdentityCheck = requireGuestRateLimitIdentity(req, Boolean(auth.user.isGuest));
    if (guestIdentityCheck) return guestIdentityCheck;

    const limited = requireRateLimit({
      bucket: "api:extract",
      identifier: rateLimitIdentifier(req, ownerId, Boolean(auth.user.isGuest)),
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (limited) return limited;

    const { companyId, url } = await req.json();
    if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    const db = getAdminDb();

    const companyLookup = await db.query({
      companies: {
        $: { where: { id: companyId, owner_id: ownerId } },
      },
    });

    if (!companyLookup.companies?.[0]) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const validation = await validateExternalCompanyUrl(url);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const normalizedUrl = validation.normalizedUrl;
    const scraped = await scrapeWebsite(normalizedUrl, 5);
    const allText = [scraped.mainPage.text, ...scraped.subPages.map((p) => p.text)].join("\n\n");
    const extracted = await extractAll(allText);

    await db.transact(
      db.tx.companies[companyId].update({
        owner_id: ownerId,
        url: normalizedUrl,
        scraped_at: new Date().toISOString(),
      })
    );

    if (extracted.features) {
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
    }

    if (extracted.pricing_tiers) {
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
    }

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

    return NextResponse.json({ success: true, extracted });
  } catch (err: unknown) {
    console.error("/api/extract failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
