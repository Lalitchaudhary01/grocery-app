import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/features/auth/jwt";
import { CUSTOMER_AUTH_COOKIE_NAME } from "@/lib/cookies";
import { parseOrderPaymentMeta } from "@/lib/order-payment-meta";
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
    const orders = await prisma.order.findMany({
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
        paymentMethod: true,
        total: true,
        paymentNote: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            price: true,
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

    const ordersWithBreakdown = orders.map((order: (typeof orders)[number]) => {
      const breakdown = parseOrderPaymentMeta(order.paymentNote);
      return {
        ...order,
        subtotalAmount: breakdown?.subtotalAmount ?? order.total,
        deliveryCharge: breakdown?.deliveryCharge ?? 0,
      };
    });

    return NextResponse.json({ orders: ordersWithBreakdown }, { status: 200 });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to fetch orders.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
