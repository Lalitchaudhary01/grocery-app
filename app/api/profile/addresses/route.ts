import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/features/auth/jwt";
import { CUSTOMER_AUTH_COOKIE_NAME } from "@/lib/cookies";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(CUSTOMER_AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload || payload.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const addresses = await prisma.address.findMany({
      where: { userId: payload.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        street: true,
        phone: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        createdAt: true,
      },
      take: 20,
    });

    return NextResponse.json({ addresses }, { status: 200 });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to fetch addresses.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";

