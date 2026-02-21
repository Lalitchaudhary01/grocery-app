import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/features/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/cookies";
import { getStoreSettings, updateStoreSettings } from "@/lib/store-settings";

const updateSchema = z.object({
  isOpen: z.boolean(),
  nextOpenAt: z.string().trim().optional().nullable(),
  message: z.string().trim().max(200).optional().nullable(),
});

function ensureAdmin(request: NextRequest): NextResponse | null {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const payload = verifyAuthToken(token);
  if (!payload || payload.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const settings = await getStoreSettings();
  return NextResponse.json({ settings }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  const authError = ensureAdmin(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as unknown;
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid store settings payload." }, { status: 400 });
    }

    const settings = await updateStoreSettings({
      isOpen: parsed.data.isOpen,
      nextOpenAt: parsed.data.nextOpenAt ?? null,
      message: parsed.data.message ?? null,
    });
    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to update settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";

