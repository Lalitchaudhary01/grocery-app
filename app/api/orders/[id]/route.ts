import { OrderStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/features/auth/jwt";
import { AUTH_COOKIE_NAME, CUSTOMER_AUTH_COOKIE_NAME } from "@/lib/cookies";
import { badRequest, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authError = ensureAdmin(request);
  if (authError) return authError;

  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  }

  try {
    const body = await readJsonBody<unknown>(request);
    if (!body) {
      return badRequest("Invalid JSON payload.");
    }
    const parsedBody = updateStatusSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid order status payload." },
        { status: 400 },
      );
    }

    const order = await prisma.order.update({
      where: { id: parsedParams.data.id },
      data: { status: parsedBody.data.status },
      select: {
        id: true,
        status: true,
        total: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Order status updated successfully.",
        order,
      },
      { status: 200 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update order status." },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  }

  try {
    const adminToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const customerToken = request.cookies.get(CUSTOMER_AUTH_COOKIE_NAME)?.value;
    const adminPayload = adminToken ? verifyAuthToken(adminToken) : null;
    const customerPayload = customerToken ? verifyAuthToken(customerToken) : null;
    const isAdmin = adminPayload?.role === "ADMIN";
    const isCustomer = customerPayload?.role === "CUSTOMER";

    if (!isAdmin && !isCustomer) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: parsedParams.data.id },
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
            quantity: true,
            price: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        address: {
          select: {
            street: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (isCustomer && customerPayload?.sub !== order.userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json(
      {
        order: {
          id: order.id,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          customer: {
            name: order.user.name,
            email: order.user.email,
          },
          items: order.items,
          deliveryAddress: order.address
            ? `${order.address.street}, ${order.address.city}, ${order.address.state}, ${order.address.postalCode}, ${order.address.country}`
            : null,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch order status." },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
