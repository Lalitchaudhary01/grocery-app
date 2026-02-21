import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/features/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/cookies";
import { badRequest, readJsonBody } from "@/lib/http";
import { normalizeProductImageUrl } from "@/lib/image";
import { encodeProductDescription, parseProductDescription } from "@/lib/product-meta";
import { prisma } from "@/lib/prisma";
import { hasPrismaErrorCode } from "@/lib/prisma-errors";

const routeParamsSchema = z.object({
  id: z.string().uuid(),
});

const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    price: z.coerce.number().positive().optional(),
    mrp: z.coerce.number().positive().optional().nullable(),
    stock: z.coerce.number().int().min(0).optional(),
    unit: z.string().trim().max(80).optional().nullable(),
    variantGroup: z.string().trim().max(120).optional().nullable(),
    variantRank: z.coerce.number().int().min(0).max(9999).optional().nullable(),
    discountPercent: z.coerce.number().min(0).max(90).optional().nullable(),
    isActive: z.coerce.boolean().optional(),
    stockReasonTag: z.enum(["DAMAGED", "EXPIRED", "MANUAL"]).optional(),
    stockReason: z.string().trim().max(200).optional().nullable(),
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

    const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.product.findUnique({
        where: { id: parsedParams.data.id },
        select: { id: true, stock: true, description: true },
      });

      if (!existing) {
        throw new ProductNotFoundError();
      }

      const existingParsed = parseProductDescription(existing.description);
      const nextDescription =
        parsedBody.data.description !== undefined ||
        parsedBody.data.mrp !== undefined ||
        parsedBody.data.unit !== undefined ||
        parsedBody.data.variantGroup !== undefined ||
        parsedBody.data.variantRank !== undefined ||
        parsedBody.data.discountPercent !== undefined ||
        parsedBody.data.isActive !== undefined
          ? encodeProductDescription(
              parsedBody.data.description ?? existingParsed.description,
              {
                mrp:
                  parsedBody.data.mrp !== undefined
                    ? parsedBody.data.mrp
                    : existingParsed.meta.mrp,
                unit:
                  parsedBody.data.unit !== undefined
                    ? parsedBody.data.unit
                    : existingParsed.meta.unit,
                variantGroup:
                  parsedBody.data.variantGroup !== undefined
                    ? parsedBody.data.variantGroup
                    : existingParsed.meta.variantGroup,
                variantRank:
                  parsedBody.data.variantRank !== undefined
                    ? parsedBody.data.variantRank
                    : existingParsed.meta.variantRank,
                discountPercent:
                  parsedBody.data.discountPercent !== undefined
                    ? parsedBody.data.discountPercent
                    : existingParsed.meta.discountPercent,
                isActive:
                  parsedBody.data.isActive !== undefined
                    ? parsedBody.data.isActive
                    : existingParsed.meta.isActive,
              },
            )
          : undefined;

      const updated = await tx.product.update({
        where: { id: parsedParams.data.id },
        data: {
          name: parsedBody.data.name,
          description: nextDescription,
          price: parsedBody.data.price,
          stock: parsedBody.data.stock,
          imageUrl:
            parsedBody.data.imageUrl !== undefined
              ? normalizeProductImageUrl(parsedBody.data.imageUrl)
              : undefined,
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
        const delta = parsedBody.data.stock - existing.stock;
        const reasonTag =
          parsedBody.data.stockReasonTag ?? (delta < 0 ? "MANUAL" : "MANUAL");
        const reasonBase =
          parsedBody.data.stockReason?.trim() ||
          (reasonTag === "DAMAGED"
            ? "Stock reduced due to damaged units."
            : reasonTag === "EXPIRED"
              ? "Stock reduced due to expired units."
              : "Admin updated product stock.");

        await tx.stockChangeHistory.create({
          data: {
            productId: existing.id,
            changeType: "ADMIN_ADJUSTMENT",
            quantityDelta: delta,
            previousStock: existing.stock,
            newStock: parsedBody.data.stock,
            reason: `[${reasonTag}] ${reasonBase}`,
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

    const parsed = parseProductDescription(product.description);
    return NextResponse.json(
      {
        product: {
          ...product,
          description: parsed.description,
          mrp: parsed.meta.mrp ?? product.price,
          unit: parsed.meta.unit ?? null,
          variantGroup: parsed.meta.variantGroup ?? null,
          variantRank: parsed.meta.variantRank ?? null,
          discountPercent: parsed.meta.discountPercent ?? 0,
          isActive: parsed.meta.isActive !== false,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2025")) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    if (error instanceof ProductNotFoundError) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    if (hasPrismaErrorCode(error, "P2003")) {
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
    if (hasPrismaErrorCode(error, "P2025")) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete product." },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
