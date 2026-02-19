import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { generateCompetitiveReport, generateMarketOverview } from "@/lib/reports";
import type { CompanyData } from "@/lib/analysis";
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
      bucket: "api:report",
      identifier: rateLimitIdentifier(req, ownerId),
      limit: 15,
      windowMs: 5 * 60 * 1000,
    });
    if (limited) return limited;

    const { type, companyId } = await req.json();
    const db = getAdminDb();

    const data = await db.query({
      companies: {
        $: { where: { owner_id: ownerId } },
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
      return NextResponse.json({ error: "No companies available to report on." }, { status: 400 });
    }

    let report;
    if (type === "assessment" && companyId) {
      const { generateAssessment } = await import("@/lib/reports");
      const target = companies.find((c: CompanyData) => {
        const match = (data.companies || []).find((dc: Record<string, unknown>) => dc.id === companyId);
        return match && (match as Record<string, unknown>).name === c.name;
      }) || companies[0];
      report = target ? await generateAssessment(target) : await generateCompetitiveReport(companies);
    } else {
      report = type === "market_overview"
        ? await generateMarketOverview(companies)
        : await generateCompetitiveReport(companies);
    }

    const rid = id();
    await db.transact(
      db.tx.reports[rid].update({
        owner_id: ownerId,
        title: report.title,
        type: type || "competitive_assessment",
        content: report.content,
        created_at: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true, reportId: rid, report });
  } catch (err: unknown) {
    console.error("/api/report failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
