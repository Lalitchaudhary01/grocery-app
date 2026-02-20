import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createOrder } from "@/features/orders/services";
import {
  InvalidOrderItemError,
  InsufficientStockError,
  ProductNotFoundError,
} from "@/features/inventory/services";
import { verifyAuthToken } from "@/features/auth/jwt";
import { CUSTOMER_AUTH_COOKIE_NAME } from "@/lib/cookies";
import { badRequest, readJsonBody } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";

const createOrderSchema = z.object({
  deliveryAddress: z.object({
    street: z.string().trim().min(5).max(200),
    phone: z.string().trim().regex(/^\d{10}$/, "Invalid phone number."),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().regex(/^\d{6}$/, "Invalid postal code."),
    country: z.string().trim().min(2).max(80).default("India"),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit({
    request,
    scope: "orders:create",
    max: 10,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const token = request.cookies.get(CUSTOMER_AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Please login before placing order." },
        { status: 401 },
      );
    }

    const payload = verifyAuthToken(token);
    if (!payload || payload.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Please login before placing order." },
        { status: 401 },
      );
    }

    const body = await readJsonBody<unknown>(request);
    if (!body) {
      return badRequest("Invalid JSON payload.");
    }
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid order payload." },
        { status: 400 },
      );
    }

    const result = await createOrder({
      userId: payload.sub,
      deliveryAddress: {
        street: parsed.data.deliveryAddress.street,
        phone: parsed.data.deliveryAddress.phone,
        city: parsed.data.deliveryAddress.city,
        state: parsed.data.deliveryAddress.state,
        postalCode: parsed.data.deliveryAddress.postalCode,
        country: parsed.data.deliveryAddress.country || "India",
      },
      items: parsed.data.items,
    });

    return NextResponse.json(
      {
        message: "Order placed successfully.",
        ...result,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return NextResponse.json(
        {
          error: "Some products were not found.",
          missingProductIds: error.missingProductIds,
        },
        { status: 404 },
      );
    }

    if (error instanceof InvalidOrderItemError) {
      return NextResponse.json(
        { error: "Order contains invalid quantities." },
        { status: 400 },
      );
    }

    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        {
          error: "Insufficient stock.",
          productId: error.productId,
          requested: error.requested,
          available: error.available,
        },
        { status: 409 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to place order.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
