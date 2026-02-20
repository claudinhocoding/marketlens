"use client";

import { db } from "@/lib/db";

async function getRefreshToken(): Promise<string | null> {
  let user = await db.getAuth();

  if (!user?.refresh_token) {
    await db.auth.signInAsGuest();
    user = await db.getAuth();
  }

  return user?.refresh_token || null;
}

export async function postApiJson(path: string, body: unknown): Promise<Response> {
  const token = await getRefreshToken();

  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message =
      (payload as { error?: unknown }).error && typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return response;
}
