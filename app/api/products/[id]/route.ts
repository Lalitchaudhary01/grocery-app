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

    const product = await prisma.product.update({
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

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
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
  const authError = ensureAdmin(request);
  if (authError) return authError;

  const params = await context.params;
  const parsedParams = routeParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  try {
    await prisma.product.delete({
      where: { id: parsedParams.data.id },
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
