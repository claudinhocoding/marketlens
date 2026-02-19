import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

interface RateLimitOptions {
  bucket: string;
  identifier: string;
  limit: number;
  windowMs: number;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitState>();
const MAX_BUCKETS = 10_000;
let checksSinceCleanup = 0;

function cleanupExpiredBuckets(now: number) {
  checksSinceCleanup += 1;
  if (checksSinceCleanup < 100 && buckets.size < 5000) {
    return;
  }

  checksSinceCleanup = 0;
  for (const [bucketKey, state] of buckets.entries()) {
    if (now >= state.resetAt) {
      buckets.delete(bucketKey);
    }
  }

  if (buckets.size > MAX_BUCKETS) {
    const overflow = buckets.size - MAX_BUCKETS;
    let removed = 0;
    for (const bucketKey of buckets.keys()) {
      buckets.delete(bucketKey);
      removed += 1;
      if (removed >= overflow) break;
    }
  }
}

function enforceRateLimit(): boolean {
  return process.env.MARKETLENS_ENFORCE_RATE_LIMIT !== "false";
}

function normalizeIdentifier(identifier: string): string {
  const trimmed = identifier.trim() || "unknown";
  if (trimmed.length <= 128) return trimmed;

  return createHash("sha256").update(trimmed).digest("hex");
}

function getBucketKey({ bucket, identifier }: Pick<RateLimitOptions, "bucket" | "identifier">) {
  return `${bucket}:${normalizeIdentifier(identifier)}`;
}

function getClientIp(req: NextRequest): string {
  const trustProxy = process.env.MARKETLENS_TRUST_PROXY === "true";

  if (trustProxy) {
    const xForwardedFor = req.headers.get("x-forwarded-for");
    if (xForwardedFor) {
      return xForwardedFor.split(",")[0].trim() || "unknown";
    }

    const xRealIp = req.headers.get("x-real-ip");
    if (xRealIp) {
      return xRealIp.trim() || "unknown";
    }
  }

  return "unknown";
}

export function rateLimitIdentifier(
  req: NextRequest,
  userId?: string,
  isGuest: boolean = false
): string {
  const ip = getClientIp(req);
  if (!userId || isGuest) {
    return `ip:${ip}`;
  }

  return `ip:${ip}:user:${userId}`;
}

export function requireRateLimit(opts: RateLimitOptions): NextResponse | null {
  if (!enforceRateLimit()) {
    return null;
  }

  const now = Date.now();
  cleanupExpiredBuckets(now);

  const key = getBucketKey(opts);
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  if (existing.count >= opts.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfterSeconds,
        bucket: opts.bucket,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(opts.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(existing.resetAt / 1000)),
        },
      }
    );
  }

  existing.count += 1;
  buckets.set(key, existing);
  return null;
}
