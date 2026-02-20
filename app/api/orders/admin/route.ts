import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/features/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/cookies";
import { prisma } from "@/lib/prisma";

function ensureAdmin(request: NextRequest): NextResponse | null {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (payload.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authError = ensureAdmin(request);
  if (authError) return authError;

  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        items: {
          select: {
            productId: true,
          },
        },
        address: {
          select: {
            street: true,
            city: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return NextResponse.json({ orders }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch admin orders." },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
