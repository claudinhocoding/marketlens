import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { generateFeatureMatrix, generateTargetingHeatmap, identifyGaps, type CompanyData } from "@/lib/analysis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const db = getAdminDb();

    // Fetch all companies with their related data
    const data = await db.query({
      companies: {
        features: {},
        pricing_tiers: {},
        marketing_intel: {},
        product_intel: {},
      },
    });

    const companies: CompanyData[] = (data.companies || []).map((c: Record<string, unknown>) => ({
      name: c.name as string,
      features: (c.features as { name: string; category?: string; description?: string }[]) || [],
      pricing_tiers: (c.pricing_tiers as { name: string; price?: string }[]) || [],
      marketing_intel: (() => {
        const mi = (c.marketing_intel as Record<string, string>[] | undefined)?.[0];
        if (!mi) return undefined;
        return {
          value_props: JSON.parse(mi.value_props || "[]"),
          target_personas: JSON.parse(mi.target_personas || "[]"),
          differentiators: JSON.parse(mi.differentiators || "[]"),
        };
      })(),
      product_intel: (() => {
        const pi = (c.product_intel as Record<string, string>[] | undefined)?.[0];
        if (!pi) return undefined;
        return { feature_summary: pi.feature_summary, positioning: pi.positioning };
      })(),
    }));

    const myCompany = companies.find((c: CompanyData) => body.myCompanyName && c.name === body.myCompanyName) || companies[0];
    const competitors = companies.filter((c: CompanyData) => c !== myCompany);

    const [featureMatrix, heatmap, gaps] = await Promise.all([
      generateFeatureMatrix(companies),
      generateTargetingHeatmap(companies),
      myCompany ? identifyGaps(competitors, myCompany) : null,
    ]);

    const comparison = { featureMatrix, heatmap, gaps };
    const cid = id();

    await db.transact(
      db.tx.comparisons[cid].update({
        type: body.type || "full",
        data: JSON.stringify(comparison),
        created_at: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true, comparisonId: cid, comparison });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
