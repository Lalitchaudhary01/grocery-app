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
    let orders: Array<{
      id: string;
      status: string;
      paymentStatus?: string;
      total: number;
      createdAt: Date;
      updatedAt: Date;
      items: Array<{
        productId: string;
        product: {
          name: string;
          imageUrl: string | null;
        };
      }>;
    }> = [];

    try {
      orders = await prisma.order.findMany({
        where: {
          userId: payload.sub,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
          updatedAt: true,
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
        },
      });
    } catch (queryError) {
      if (!(queryError instanceof Error) || !queryError.message.includes("paymentStatus")) {
        throw queryError;
      }

      orders = await prisma.order.findMany({
        where: {
          userId: payload.sub,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
        select: {
          id: true,
          status: true,
          total: true,
          createdAt: true,
          updatedAt: true,
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
        },
      });
    }

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to fetch orders.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
