import type { PrismaClient } from "@prisma/client";

/**
 * Where clause for product queries - defined explicitly to avoid Prisma namespace
 * types which can fail on Vercel's build environment.
 */
export type ProductWhereInput = {
  OR?: Array<{
    name?: { contains: string; mode: "insensitive" };
    description?: { contains: string; mode: "insensitive" };
    category?: { name: { contains: string; mode: "insensitive" } };
  }>;
  categoryId?: string;
  stock?: { gt: number } | { lte: number };
};

/**
 * Transaction client - Omit of PrismaClient (same as Prisma.TransactionClient).
 * Built from PrismaClient to avoid Prisma namespace types on Vercel.
 */
export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
