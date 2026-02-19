import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";

interface ApiAuthedUser {
  id: string;
  email?: string | null;
  type?: string | null;
  isGuest?: boolean;
}

type ApiAuthResult =
  | { ok: true; user: ApiAuthedUser }
  | { ok: false; response: NextResponse };

function enforceApiAuth(): boolean {
  return process.env.MARKETLENS_ENFORCE_API_AUTH !== "false";
}

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function requireApiAuth(req: NextRequest): Promise<ApiAuthResult> {
  if (!enforceApiAuth()) {
    return { ok: true, user: { id: "dev-auth-bypass", type: "dev" } };
  }

  const token = extractBearerToken(req);
  if (!token) {
    return { ok: false, response: unauthorized("Authorization token required") };
  }

  try {
    const db = getAdminDb();
    const user = await db.auth.verifyToken(token);

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        type: user.type,
        isGuest: user.isGuest,
      },
    };
  } catch {
    return { ok: false, response: unauthorized("Invalid or expired token") };
  }
}
