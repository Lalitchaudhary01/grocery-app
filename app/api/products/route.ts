import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/features/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/cookies";
import { badRequest, readJsonBody } from "@/lib/http";
import { parseProductDescription, encodeProductDescription } from "@/lib/product-meta";
import { prisma } from "@/lib/prisma";

const createProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  price: z.coerce.number().positive(),
  mrp: z.coerce.number().positive().optional().nullable(),
  stock: z.coerce.number().int().min(0),
  unit: z.string().trim().max(80).optional().nullable(),
  discountPercent: z.coerce.number().min(0).max(90).optional().nullable(),
  isActive: z.coerce.boolean().optional().default(true),
  imageUrl: z.string().url().max(1000).optional().nullable(),
  categoryId: z.string().uuid(),
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const categoryId = searchParams.get("categoryId")?.trim() ?? "";
    const stock = searchParams.get("stock")?.trim() ?? "";

    const where: Prisma.ProductWhereInput = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (stock === "in") {
      where.stock = { gt: 0 };
    }
    if (stock === "out") {
      where.stock = { lte: 0 };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const parsedProducts = products.map((product) => {
      try {
        const parsed = parseProductDescription(product.description);
        const mrp =
          typeof parsed.meta.mrp === "number" && parsed.meta.mrp > 0
            ? parsed.meta.mrp
            : product.price;
        const discountPercent =
          typeof parsed.meta.discountPercent === "number"
            ? parsed.meta.discountPercent
            : Math.max(0, Math.round(((mrp - product.price) / mrp) * 100));

        return {
          ...product,
          description: parsed.description,
          mrp,
          unit: parsed.meta.unit || null,
          discountPercent,
          isActive: parsed.meta.isActive !== false,
        };
      } catch {
        return {
          ...product,
          mrp: product.price,
          unit: null,
          discountPercent: 0,
          isActive: true,
        };
      }
    });

    return NextResponse.json({ products: parsedProducts }, { status: 200 });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to fetch products.";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = ensureAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await readJsonBody<unknown>(request);
    if (!body) {
      return badRequest("Invalid JSON payload.");
    }
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid product payload." },
        { status: 400 },
      );
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: parsed.data.name,
          description: encodeProductDescription(parsed.data.description ?? null, {
            mrp: parsed.data.mrp ?? parsed.data.price,
            unit: parsed.data.unit ?? null,
            discountPercent: parsed.data.discountPercent ?? null,
            isActive: parsed.data.isActive ?? true,
          }),
          price: parsed.data.price,
          stock: parsed.data.stock,
          imageUrl: parsed.data.imageUrl ?? null,
          categoryId: parsed.data.categoryId,
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

      await tx.adminAuditLog.create({
        data: {
          adminUserId: auth.adminId,
          action: "PRODUCT_CREATED",
          entityType: "PRODUCT",
          entityId: created.id,
          meta: {
            name: created.name,
            stock: created.stock,
          },
        },
      });

      return created;
    });

    const parsedDescription = parseProductDescription(product.description);
    return NextResponse.json(
      {
        product: {
          ...product,
          description: parsedDescription.description,
          mrp: parsedDescription.meta.mrp ?? product.price,
          unit: parsedDescription.meta.unit ?? null,
          discountPercent: parsedDescription.meta.discountPercent ?? 0,
          isActive: parsedDescription.meta.isActive !== false,
        },
      },
      { status: 201 },
    );
  } catch (error) {
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
      { error: "Failed to create product." },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
