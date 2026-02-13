import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import {
  generateFeatureMatrix,
  generateTargetingHeatmap,
  identifyGaps,
  type CompanyData,
} from "@/lib/analysis";

function parseArray(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
      id: c.id as string,
      name: c.name as string,
      is_mine: Boolean(c.is_mine),
      features: (c.features as { name: string; category?: string; description?: string }[]) || [],
      pricing_tiers: (c.pricing_tiers as { name: string; price?: string }[]) || [],
      marketing_intel: (() => {
        const mi = (c.marketing_intel as Record<string, string>[] | undefined)?.[0];
        if (!mi) return undefined;
        return {
          value_props: parseArray(mi.value_props),
          target_personas: parseArray(mi.target_personas),
          differentiators: parseArray(mi.differentiators),
        };
      })(),
      product_intel: (() => {
        const pi = (c.product_intel as Record<string, string>[] | undefined)?.[0];
        if (!pi) return undefined;
        return { feature_summary: pi.feature_summary, positioning: pi.positioning };
      })(),
    }));

    const myCompanyId = typeof body.myCompanyId === "string" ? body.myCompanyId : undefined;
    const myCompanyName = typeof body.myCompanyName === "string" ? body.myCompanyName : undefined;

    const myCompany =
      companies.find((c) => myCompanyId && c.id === myCompanyId) ||
      companies.find((c) => myCompanyName && c.name === myCompanyName) ||
      companies.find((c) => c.is_mine) ||
      companies[0];

    const competitors = companies.filter((c) => (myCompany?.id ? c.id !== myCompany.id : c !== myCompany));

    let comparison: Record<string, unknown>;

    if (body.type === "positioning") {
      const { scoreCompaniesOnAxes } = await import("@/lib/analysis");
      const positioning = await scoreCompaniesOnAxes(
        companies,
        body.xAxis || "Product Completeness",
        body.yAxis || "Growth Momentum"
      );
      comparison = { positioning };
    } else if (body.type === "targeting_matrix") {
      const { generateTargetingMatrix } = await import("@/lib/analysis");
      const targetingMatrix = await generateTargetingMatrix(companies);
      comparison = { targetingMatrix };
    } else if (body.type === "pain_points") {
      const { analyzePainPoints } = await import("@/lib/analysis");
      const painPoints = await analyzePainPoints(companies);
      comparison = { painPoints };
    } else {
      const [featureMatrix, heatmap, gaps] = await Promise.all([
        generateFeatureMatrix(companies),
        generateTargetingHeatmap(companies),
        myCompany ? identifyGaps(competitors, myCompany) : null,
      ]);
      comparison = { featureMatrix, heatmap, gaps, baselineCompanyId: myCompany?.id || null };
    }
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
