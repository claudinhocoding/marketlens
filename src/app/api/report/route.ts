import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import {
  generateCompetitiveReport,
  generateFeatureGapReport,
  generateMarketOverview,
  generateMarketPositioningReport,
} from "@/lib/reports";
import type { CompanyData } from "@/lib/analysis";

type RawCompany = Record<string, unknown>;

function parseStringArray(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function mapCompany(c: RawCompany): CompanyData {
  return {
    id: c.id as string,
    name: c.name as string,
    is_mine: Boolean(c.is_mine),
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
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedType = typeof body.type === "string" ? body.type : "competitive_assessment";
    const companyId = typeof body.companyId === "string" ? body.companyId : undefined;

    const db = getAdminDb();

    const data = await db.query({
      companies: {
        features: {},
        pricing_tiers: {},
        marketing_intel: {},
        product_intel: {},
      },
    });

    const rawCompanies = (data.companies || []) as RawCompany[];
    const companies: CompanyData[] = rawCompanies.map(mapCompany);

    if (companies.length === 0) {
      return NextResponse.json({ error: "No companies available to generate a report." }, { status: 400 });
    }

    let report;
    let resolvedType = requestedType;

    if (requestedType === "assessment") {
      const targetRaw = rawCompanies.find((c) => c.id === companyId) || rawCompanies[0];
      report = await import("@/lib/reports").then(({ generateAssessment }) =>
        generateAssessment(mapCompany(targetRaw))
      );
      resolvedType = "assessment";
    } else {
      switch (requestedType) {
        case "market_overview":
          report = await generateMarketOverview(companies);
          resolvedType = "market_overview";
          break;
        case "feature_gap": {
          const focusRaw =
            rawCompanies.find((c) => c.id === companyId) ||
            rawCompanies.find((c) => Boolean(c.is_mine)) ||
            rawCompanies[0];
          report = await generateFeatureGapReport(companies, mapCompany(focusRaw));
          resolvedType = "feature_gap";
          break;
        }
        case "market_positioning":
          report = await generateMarketPositioningReport(companies);
          resolvedType = "market_positioning";
          break;
        case "competitive_assessment":
        default:
          report = await generateCompetitiveReport(companies);
          resolvedType = "competitive_assessment";
          break;
      }
    }

    const rid = id();
    await db.transact(
      db.tx.reports[rid].update({
        title: report.title,
        type: resolvedType,
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
