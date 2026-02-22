import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/features/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/cookies";
import { getRequiredEnv } from "@/lib/env";

function ensureAdmin(request: NextRequest): NextResponse | null {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload || payload.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return null;
}

function buildSignature(params: Record<string, string>, apiSecret: string): string {
  const sorted = Object.entries(params)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1")
    .update(`${sorted}${apiSecret}`)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  const authError = ensureAdmin(request);
  if (authError) return authError;

  try {
    const cloudName = getRequiredEnv("CLOUDINARY_CLOUD_NAME");
    const apiKey = getRequiredEnv("CLOUDINARY_API_KEY");
    const apiSecret = getRequiredEnv("CLOUDINARY_API_SECRET");

    const incoming = await request.formData();
    const file = incoming.get("file");
    const folderRaw = incoming.get("folder");
    const folder = typeof folderRaw === "string" && folderRaw.trim().length > 0
      ? folderRaw.trim()
      : "grocery-app";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }

    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = buildSignature({ folder, timestamp }, apiSecret);

    const outbound = new FormData();
    outbound.append("file", file);
    outbound.append("api_key", apiKey);
    outbound.append("timestamp", timestamp);
    outbound.append("signature", signature);
    outbound.append("folder", folder);

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: outbound,
      },
    );

    const uploadBody = (await uploadResponse.json().catch(() => null)) as
      | { secure_url?: string; error?: { message?: string } }
      | null;

    if (!uploadResponse.ok || !uploadBody?.secure_url) {
      return NextResponse.json(
        { error: uploadBody?.error?.message || "Cloud upload failed." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        url: uploadBody.secure_url,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Image upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
