import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { generateFeatureMatrix, generateTargetingHeatmap, identifyGaps, type CompanyData } from "@/lib/analysis";
import { requireApiAuth } from "@/lib/api-guard";
import { rateLimitIdentifier, requireRateLimit } from "@/lib/rate-limit";

function parseStringArray(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiAuth(req);
    if (!auth.ok) return auth.response;

    const ownerId = auth.user.id;

    const limited = requireRateLimit({
      bucket: "api:compare",
      identifier: rateLimitIdentifier(req, ownerId),
      limit: 30,
      windowMs: 5 * 60 * 1000,
    });
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const db = getAdminDb();

    // Fetch all companies with their related data
    const data = await db.query({
      companies: {
        $: {
          where: {
            or: [{ owner_id: ownerId }, { owner_id: { $isNull: true } }],
          },
        },
        features: {},
        pricing_tiers: {},
        marketing_intel: {},
        product_intel: {},
      },
    });

    const companies: CompanyData[] = (data.companies || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      name: c.name as string,
      features: (c.features as { name: string; category?: string; description?: string }[]) || [],
      pricing_tiers: (c.pricing_tiers as { name: string; price?: string }[]) || [],
      marketing_intel: (() => {
        const mi = (c.marketing_intel as Record<string, string>[] | undefined)?.[0];
        if (!mi) return undefined;
        return {
          value_props: parseStringArray(mi.value_props),
          target_personas: parseStringArray(mi.target_personas),
          differentiators: parseStringArray(mi.differentiators),
        };
      })(),
      product_intel: (() => {
        const pi = (c.product_intel as Record<string, string>[] | undefined)?.[0];
        if (!pi) return undefined;
        return { feature_summary: pi.feature_summary, positioning: pi.positioning };
      })(),
    }));

    if (companies.length === 0) {
      return NextResponse.json({ error: "No companies available to compare." }, { status: 400 });
    }

    const myCompany = companies.find((c: CompanyData) => body.myCompanyName && c.name === body.myCompanyName) || companies[0];
    const competitors = companies.filter((c: CompanyData) => c !== myCompany);

    let comparison: Record<string, unknown>;

    if (body.type === "positioning") {
      const { scoreCompaniesOnAxes } = await import("@/lib/analysis");
      const positioning = await scoreCompaniesOnAxes(companies, body.xAxis || "Product Completeness", body.yAxis || "Growth Momentum");
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
      comparison = { featureMatrix, heatmap, gaps };
    }
    const cid = id();

    await db.transact(
      db.tx.comparisons[cid].update({
        owner_id: ownerId,
        type: body.type || "full",
        data: JSON.stringify(comparison),
        created_at: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true, comparisonId: cid, comparison });
  } catch (err: unknown) {
    console.error("/api/compare failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
