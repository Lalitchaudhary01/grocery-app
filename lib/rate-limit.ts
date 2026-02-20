import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

export function checkRateLimit(params: {
  request: Request;
  scope: string;
  max: number;
  windowMs: number;
  identifier?: string;
}): NextResponse | null {
  const identity = params.identifier ?? getClientIp(params.request);
  const now = Date.now();
  const key = `${params.scope}:${identity}`;

  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + params.windowMs,
    });
    return null;
  }

  if (existing.count >= params.max) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  existing.count += 1;
  return null;
}
