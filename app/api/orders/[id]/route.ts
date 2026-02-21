import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/features/auth/jwt";
import { AUTH_COOKIE_NAME, CUSTOMER_AUTH_COOKIE_NAME } from "@/lib/cookies";
import { badRequest, readJsonBody } from "@/lib/http";
import { ORDER_STATUS_VALUES } from "@/lib/order-enums";
import { prisma } from "@/lib/prisma";
import { hasPrismaErrorCode } from "@/lib/prisma-errors";
import { checkRateLimit } from "@/lib/rate-limit";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES).optional(),
  paymentStatus: z.enum(["PENDING_VERIFICATION", "VERIFIED", "FAILED"]).optional(),
  cancelReason: z.string().trim().min(5).max(300).optional(),
}).refine((value) => value.status || value.paymentStatus, {
  message: "At least one field is required.",
});

function ensureAdmin(request: NextRequest): { adminId: string } | { error: NextResponse } {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  if (payload.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  return { adminId: payload.sub };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const rateLimited = checkRateLimit({
    request,
    scope: "orders:update-status",
    max: 30,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const auth = ensureAdmin(request);
  if ("error" in auth) return auth.error;

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

    if (
      parsedBody.data.status === "CANCELLED" &&
      (!parsedBody.data.cancelReason || parsedBody.data.cancelReason.trim().length < 5)
    ) {
      return NextResponse.json(
        { error: "Cancel reason is required when rejecting order." },
        { status: 400 },
      );
    }

    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.order.findUnique({
        where: { id: parsedParams.data.id },
        select: {
          id: true,
          paymentStatus: true,
        },
      });

      if (!existing) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (
        parsedBody.data.status &&
        ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(parsedBody.data.status) &&
        existing.paymentStatus !== "VERIFIED"
      ) {
        throw new Error("Verify payment first before processing order.");
      }

      const updated = await tx.order.update({
        where: { id: parsedParams.data.id },
        data: {
          status: parsedBody.data.status ?? undefined,
          paymentStatus: parsedBody.data.paymentStatus ?? undefined,
          cancelReason:
            parsedBody.data.status === "CANCELLED"
              ? parsedBody.data.cancelReason?.trim()
              : null,
          paymentNote:
            parsedBody.data.paymentStatus === "VERIFIED"
              ? "Payment verified by admin."
              : parsedBody.data.paymentStatus === "FAILED"
                ? "Payment not found in statement."
                : undefined,
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          total: true,
          updatedAt: true,
          cancelReason: true,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: updated.id,
          status: updated.status,
          note:
            updated.status === "CANCELLED"
              ? parsedBody.data.cancelReason?.trim() || "Order rejected by admin."
              : parsedBody.data.paymentStatus === "VERIFIED"
                ? "Payment verified by admin."
                : parsedBody.data.paymentStatus === "FAILED"
                  ? "Payment marked failed by admin."
                  : "Order status updated by admin.",
          changedByUserId: auth.adminId,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId: auth.adminId,
          action: "ORDER_STATUS_UPDATED",
          entityType: "ORDER",
          entityId: updated.id,
          meta: {
            status: updated.status,
            paymentStatus: updated.paymentStatus,
            cancelReason: updated.cancelReason,
          },
        },
      });

      return updated;
    });

    return NextResponse.json(
      {
        message: "Order status updated successfully.",
        order,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (hasPrismaErrorCode(error, "P2025")) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to update order status.";
    return NextResponse.json({ error: message }, { status: 500 });
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
            state: true,
            postalCode: true,
            country: true,
          },
        },
        statusHistory: {
          select: {
            status: true,
            note: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
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
          paymentStatus: order.paymentStatus,
          total: order.total,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          customer: {
            name: order.user.name,
            email: order.user.email,
          },
          customerPhone: order.address?.phone ?? null,
          items: order.items,
          cancelReason: order.cancelReason,
          paymentMethod: order.paymentMethod,
          paymentNote: order.paymentNote,
          timeline: order.statusHistory,
          deliveryAddress: order.address
            ? `${order.address.street}, ${order.address.city}, ${order.address.state}, ${order.address.postalCode}, ${order.address.country}`
            : null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to fetch order status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
