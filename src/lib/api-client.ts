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

  return fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
