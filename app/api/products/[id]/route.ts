import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/features/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/cookies";
import { badRequest, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const routeParamsSchema = z.object({
  id: z.string().uuid(),
});

const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    price: z.coerce.number().positive().optional(),
    stock: z.coerce.number().int().min(0).optional(),
    imageUrl: z.string().url().max(1000).optional().nullable(),
    categoryId: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some((value) => value !== undefined),
    {
      message: "At least one field is required.",
    },
  );

class ProductNotFoundError extends Error {
  constructor() {
    super("Product not found.");
    this.name = "ProductNotFoundError";
  }
}

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
  const auth = ensureAdmin(request);
  if ("error" in auth) return auth.error;

  const params = await context.params;
  const parsedParams = routeParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  try {
    const body = await readJsonBody<unknown>(request);
    if (!body) {
      return badRequest("Invalid JSON payload.");
    }
    const parsedBody = updateProductSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid product update payload." },
        { status: 400 },
      );
    }

    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id: parsedParams.data.id },
        select: { id: true, stock: true },
      });

      if (!existing) {
        throw new ProductNotFoundError();
      }

      const updated = await tx.product.update({
        where: { id: parsedParams.data.id },
        data: {
          name: parsedBody.data.name,
          description: parsedBody.data.description,
          price: parsedBody.data.price,
          stock: parsedBody.data.stock,
          imageUrl: parsedBody.data.imageUrl,
          categoryId: parsedBody.data.categoryId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (typeof parsedBody.data.stock === "number" && parsedBody.data.stock !== existing.stock) {
        await tx.stockChangeHistory.create({
          data: {
            productId: existing.id,
            changeType: "ADMIN_ADJUSTMENT",
            quantityDelta: parsedBody.data.stock - existing.stock,
            previousStock: existing.stock,
            newStock: parsedBody.data.stock,
            reason: "Admin updated product stock.",
            changedByUserId: auth.adminId,
          },
        });
      }

      await tx.adminAuditLog.create({
        data: {
          adminUserId: auth.adminId,
          action: "PRODUCT_UPDATED",
          entityType: "PRODUCT",
          entityId: updated.id,
          meta: {
            name: updated.name,
            stock: updated.stock,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    if (error instanceof ProductNotFoundError) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "Invalid category reference." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update product." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = ensureAdmin(request);
  if ("error" in auth) return auth.error;

  const params = await context.params;
  const parsedParams = routeParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  try {
    const deleted = await prisma.product.delete({
      where: { id: parsedParams.data.id },
      select: { id: true },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: auth.adminId,
        action: "PRODUCT_DELETED",
        entityType: "PRODUCT",
        entityId: deleted.id,
      },
    });

    return NextResponse.json(
      { message: "Product deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete product." },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
