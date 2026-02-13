import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { handleQuery } from "@/lib/agent";

function parseStringArray(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const history = Array.isArray(body.history)
      ? (body.history as unknown[])
          .filter(
            (m): m is { role: "user" | "assistant"; content: string } =>
              typeof m === "object" &&
              m !== null &&
              ((m as { role?: string }).role === "user" || (m as { role?: string }).role === "assistant") &&
              typeof (m as { content?: unknown }).content === "string" &&
              (m as { content: string }).content.trim().length > 0
          )
          .slice(-20)
      : [];

    // Build richer context from InstantDB
    const db = getAdminDb();
    const data = await db.query({
      companies: {
        features: {},
        pricing_tiers: {},
        marketing_intel: {},
        product_intel: {},
        blog_posts: {},
        events: {},
      },
      comparisons: {},
      reports: {},
    });

    const contextPayload = {
      companies: (data.companies || []).map((c) => {
        const marketing = c.marketing_intel?.[0];
        const product = c.product_intel?.[0];
        return {
          id: c.id,
          name: c.name,
          url: c.url,
          is_mine: c.is_mine,
          description: c.description,
          feature_count: c.features?.length || 0,
          pricing_tier_count: c.pricing_tiers?.length || 0,
          blog_post_count: c.blog_posts?.length || 0,
          event_count: c.events?.length || 0,
          sample_features: (c.features || []).slice(0, 12).map((f) => f.name),
          sample_pricing: (c.pricing_tiers || []).slice(0, 6).map((p) => ({
            name: p.name,
            price: p.price,
            billing_period: p.billing_period,
          })),
          target_personas: parseStringArray(marketing?.target_personas),
          value_props: parseStringArray(marketing?.value_props),
          differentiators: parseStringArray(marketing?.differentiators),
          product_positioning: product?.positioning || "",
          product_summary: product?.feature_summary || "",
        };
      }),
      latest_comparisons: [...(data.comparisons || [])]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5)
        .map((c) => ({ id: c.id, type: c.type, created_at: c.created_at, data: c.data.slice(0, 1200) })),
      latest_reports: [...(data.reports || [])]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
          created_at: r.created_at,
          content_preview: r.content.slice(0, 1200),
        })),
    };

    const context = JSON.stringify(contextPayload, null, 2).slice(0, 18000);
    const response = await handleQuery(message, context, history);

    return NextResponse.json({ response });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
