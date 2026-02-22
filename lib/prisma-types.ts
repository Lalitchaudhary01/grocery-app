import { prisma } from "@/lib/prisma";

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

/** Inferred from prisma.$transaction - avoids Prisma.TransactionClient on Vercel */
export type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];
