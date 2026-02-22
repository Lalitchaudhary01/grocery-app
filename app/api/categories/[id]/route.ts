import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyAuthToken } from "@/features/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/cookies";
import { badRequest, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { type TransactionClient } from "@/lib/prisma-types";
import { hasPrismaErrorCode } from "@/lib/prisma-errors";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateCategorySchema = z.object({
  // Category name now stores optional image metadata prefix: [[img:URL]] Label
  name: z.string().trim().min(2).max(600),
});

function ensureAdmin(request: NextRequest): { adminId: string } | { error: NextResponse } {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const payload = verifyAuthToken(token);
  if (!payload || payload.role !== "ADMIN") {
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
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid category id." }, { status: 400 });
  }

  try {
    const body = await readJsonBody<unknown>(request);
    if (!body) return badRequest("Invalid JSON payload.");

    const parsedBody = updateCategorySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid category payload." }, { status: 400 });
    }

    const category = await prisma.$transaction(async (tx: TransactionClient) => {
      const updated = await tx.category.update({
        where: { id: parsedParams.data.id },
        data: { name: parsedBody.data.name },
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId: auth.adminId,
          action: "CATEGORY_UPDATED",
          entityType: "CATEGORY",
          entityId: updated.id,
          meta: { name: updated.name },
        },
      });

      return updated;
    });

    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2025")) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }
    if (hasPrismaErrorCode(error, "P2002")) {
      return NextResponse.json({ error: "Category name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update category." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = ensureAdmin(request);
  if ("error" in auth) return auth.error;

  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid category id." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx: TransactionClient) => {
      const category = await tx.category.findUnique({
        where: { id: parsedParams.data.id },
        select: { id: true, name: true, _count: { select: { products: true } } },
      });

      if (!category) {
        throw new Error("CATEGORY_NOT_FOUND");
      }

      if (category._count.products > 0) {
        throw new Error(
          "Category delete se pehle is category ke products ko dusri category me move karo.",
        );
      }

      await tx.category.delete({
        where: { id: parsedParams.data.id },
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId: auth.adminId,
          action: "CATEGORY_DELETED",
          entityType: "CATEGORY",
          entityId: category.id,
          meta: { name: category.name },
        },
      });
    });

    return NextResponse.json({ message: "Category deleted." }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }
    if (hasPrismaErrorCode(error, "P2025")) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to delete category." }, { status: 500 });
  }
}

export const runtime = "nodejs";
