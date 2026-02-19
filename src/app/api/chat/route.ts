import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { handleQuery } from "@/lib/agent";
import { requireApiAuth } from "@/lib/api-guard";
import { rateLimitIdentifier, requireRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiAuth(req);
    if (!auth.ok) return auth.response;

    const limited = requireRateLimit({
      bucket: "api:chat",
      identifier: rateLimitIdentifier(req, auth.user.id),
      limit: 60,
      windowMs: 5 * 60 * 1000,
    });
    if (limited) return limited;

    const { message, history } = await req.json();
    if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

    // Build context from InstantDB
    const db = getAdminDb();
    const data = await db.query({
      companies: { features: {}, pricing_tiers: {} },
    });

    const context = JSON.stringify(data.companies || [], null, 2).slice(0, 10000);
    const response = await handleQuery(message, context, history);

    return NextResponse.json({ response });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
