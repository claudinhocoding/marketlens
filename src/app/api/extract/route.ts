import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { extractAll } from "@/lib/extraction";
import { scrapeWebsite } from "@/lib/scraper";
import { requireApiAuth } from "@/lib/api-guard";
import { rateLimitIdentifier, requireRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiAuth(req);
    if (!auth.ok) return auth.response;

    const limited = requireRateLimit({
      bucket: "api:extract",
      identifier: rateLimitIdentifier(req, auth.user.id),
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (limited) return limited;

    const { companyId, url } = await req.json();
    if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    const scraped = await scrapeWebsite(url);
    const allText = [scraped.mainPage.text, ...scraped.subPages.map((p) => p.text)].join("\n\n");
    const extracted = await extractAll(allText);

    const db = getAdminDb();

    if (extracted.features) {
      for (const f of extracted.features) {
        const fid = id();
        await db.transact([
          db.tx.features[fid].update({ name: f.name, category: f.category || "", description: f.description || "" }),
          db.tx.companies[companyId].link({ features: fid }),
        ]);
      }
    }

    if (extracted.pricing_tiers) {
      for (const t of extracted.pricing_tiers) {
        const tid = id();
        await db.transact([
          db.tx.pricing_tiers[tid].update({ name: t.name, price: t.price || "", billing_period: t.billing_period || "", features_text: t.features_text || "" }),
          db.tx.companies[companyId].link({ pricing_tiers: tid }),
        ]);
      }
    }

    if (extracted.marketing) {
      const mid = id();
      await db.transact([
        db.tx.marketing_intel[mid].update({
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
          feature_summary: extracted.product.feature_summary,
          tech_stack: extracted.product.tech_stack,
          positioning: extracted.product.positioning,
        }),
        db.tx.companies[companyId].link({ product_intel: pid }),
      ]);
    }

    return NextResponse.json({ success: true, extracted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
