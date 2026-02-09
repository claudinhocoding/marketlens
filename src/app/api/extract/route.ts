import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { execSync } from "child_process";

export async function POST(req: NextRequest) {
  try {
    const { companyId, url } = await req.json();
    if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

    // Run Python extraction via Claude
    const result = execSync(
      `python3 -c "
import json, sys
sys.path.insert(0, '.')
from src.extraction import extract_company_intel
data = extract_company_intel('${(url || "").replace(/'/g, "\\'")}')
print(json.dumps(data))
"`,
      { cwd: process.cwd(), timeout: 180000, encoding: "utf-8" }
    );

    const extracted = JSON.parse(result.trim());
    const db = getAdminDb();

    // Store features
    if (extracted.features) {
      for (const f of extracted.features) {
        const fid = id();
        await db.transact([
          db.tx.features[fid].update({ name: f.name, category: f.category || "", description: f.description || "" }),
          db.tx.companies[companyId].link({ features: fid }),
        ]);
      }
    }

    // Store pricing
    if (extracted.pricing_tiers) {
      for (const t of extracted.pricing_tiers) {
        const tid = id();
        await db.transact([
          db.tx.pricing_tiers[tid].update({ name: t.name, price: t.price || "", billing_period: t.billing_period || "", features_text: t.features_text || "" }),
          db.tx.companies[companyId].link({ pricing_tiers: tid }),
        ]);
      }
    }

    // Store marketing intel
    if (extracted.marketing) {
      const mid = id();
      await db.transact([
        db.tx.marketing_intel[mid].update({
          value_props: JSON.stringify(extracted.marketing.value_props || []),
          target_personas: JSON.stringify(extracted.marketing.target_personas || []),
          key_messages: JSON.stringify(extracted.marketing.key_messages || []),
          differentiators: JSON.stringify(extracted.marketing.differentiators || []),
          pain_points: JSON.stringify(extracted.marketing.pain_points || []),
        }),
        db.tx.companies[companyId].link({ marketing_intel: mid }),
      ]);
    }

    // Store product intel
    if (extracted.product) {
      const pid = id();
      await db.transact([
        db.tx.product_intel[pid].update({
          feature_summary: extracted.product.feature_summary || "",
          tech_stack: extracted.product.tech_stack || "",
          positioning: extracted.product.positioning || "",
        }),
        db.tx.companies[companyId].link({ product_intel: pid }),
      ]);
    }

    return NextResponse.json({ success: true, extracted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
