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
    const filePart = incoming.get("file");
    const folderRaw = incoming.get("folder");
    const folder = typeof folderRaw === "string" && folderRaw.trim().length > 0
      ? folderRaw.trim()
      : "grocery-app";

    if (
      !filePart ||
      typeof filePart !== "object" ||
      !("arrayBuffer" in filePart) ||
      typeof (filePart as Blob).arrayBuffer !== "function"
    ) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const file = filePart as Blob & { name?: string };
    const contentType = typeof file.type === "string" ? file.type : "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }
    const maxBytes = 10 * 1024 * 1024;
    if (typeof file.size === "number" && file.size > maxBytes) {
      return NextResponse.json(
        { error: "Image is too large. Max size is 10MB." },
        { status: 400 },
      );
    }

    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = buildSignature({ folder, timestamp }, apiSecret);

    const outbound = new FormData();
    outbound.append("file", file, file.name || "upload-image");
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
      const cloudError = uploadBody?.error?.message || "Cloud upload failed.";
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === "development"
              ? `Cloudinary upload failed (${uploadResponse.status}): ${cloudError}`
              : cloudError,
        },
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
