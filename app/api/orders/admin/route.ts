import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/features/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/cookies";
import { isOrderStatus, type OrderStatus } from "@/lib/order-enums";
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
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: {
      status?: OrderStatus;
      createdAt?: { gte?: Date; lte?: Date };
      OR?: Array<{
        id?: { contains: string; mode: "insensitive" };
        user?: {
          name?: { contains: string; mode: "insensitive" };
          email?: { contains: string; mode: "insensitive" };
        };
      }>;
    } = {};

    if (status && isOrderStatus(status)) {
      where.status = status;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(`${from}T00:00:00.000Z`);
      }
      if (to) {
        where.createdAt.lte = new Date(`${to}T23:59:59.999Z`);
      }
    }

    if (q) {
      where.OR = [
        { id: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        statusHistory: {
          select: {
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        items: {
          select: {
            productId: true,
            product: {
              select: {
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        address: {
          select: {
            street: true,
            phone: true,
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
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to fetch admin orders.";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
