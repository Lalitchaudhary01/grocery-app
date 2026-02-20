import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createOrder } from "@/features/orders/services";
import {
  InvalidOrderItemError,
  InsufficientStockError,
  ProductNotFoundError,
} from "@/features/inventory/services";
import { badRequest, readJsonBody } from "@/lib/http";

const createOrderSchema = z.object({
  customer: z.object({
    email: z.email().toLowerCase(),
    name: z.string().trim().min(2).max(100).optional(),
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
  try {
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

    const result = await createOrder(parsed.data);

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

    return NextResponse.json(
      { error: "Failed to place order." },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
