import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { parseProductDescription } from "@/lib/product-meta";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();
  const parsed = parseProductDescription(product.description);
  const mrp = parsed.meta.mrp ?? product.price;
  const discountPercent =
    parsed.meta.discountPercent ?? Math.max(0, Math.round(((mrp - product.price) / mrp) * 100));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <Link href="/admin/products" className="text-sm font-semibold text-green-700 hover:underline">
          ← Back to Products
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">Product Detail</h1>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="relative h-64 w-full bg-neutral-100 sm:h-80">
          <Image
            src={product.imageUrl || FALLBACK_IMAGE}
            alt={product.name}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          <h2 className="text-2xl font-bold text-neutral-900">{product.name}</h2>
          <p className="text-sm text-neutral-600">Product ID: {product.id}</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl font-extrabold text-green-700">{formatINR(product.price)}</p>
            {mrp > product.price ? (
              <p className="text-base font-semibold text-neutral-400 line-through">
                {formatINR(mrp)}
              </p>
            ) : null}
            {discountPercent > 0 ? (
              <Badge tone="danger">{discountPercent}% OFF</Badge>
            ) : null}
            {parsed.meta.unit ? <Badge tone="accent">{parsed.meta.unit}</Badge> : null}
            <Badge tone={product.stock > 0 ? "success" : "danger"}>
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </Badge>
            <Badge tone="neutral">{product.category?.name || "Uncategorized"}</Badge>
          </div>
          <p className="text-sm leading-6 text-neutral-700">
            {parsed.description || "No description provided."}
          </p>
        </div>
      </div>
    </div>
  );
}
