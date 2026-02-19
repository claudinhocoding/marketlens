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

function enforceRateLimit(): boolean {
  return process.env.MARKETLENS_ENFORCE_RATE_LIMIT !== "false";
}

function getBucketKey({ bucket, identifier }: Pick<RateLimitOptions, "bucket" | "identifier">) {
  return `${bucket}:${identifier}`;
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (!xff) return "unknown";
  return xff.split(",")[0].trim() || "unknown";
}

export function rateLimitIdentifier(req: NextRequest, userId?: string): string {
  return userId || getClientIp(req);
}

export function requireRateLimit(opts: RateLimitOptions): NextResponse | null {
  if (!enforceRateLimit()) {
    return null;
  }

  const now = Date.now();
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
