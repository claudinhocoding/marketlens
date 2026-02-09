import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { generateCompetitiveReport, generateMarketOverview } from "@/lib/reports";
import type { CompanyData } from "@/lib/analysis";

export async function POST(req: NextRequest) {
  try {
    const { type } = await req.json();
    const db = getAdminDb();

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
    }));

    const report =
      type === "market_overview"
        ? await generateMarketOverview(companies)
        : await generateCompetitiveReport(companies);

    const rid = id();
    await db.transact(
      db.tx.reports[rid].update({
        title: report.title,
        type: type || "competitive_assessment",
        content: report.content,
        created_at: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true, reportId: rid, report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
