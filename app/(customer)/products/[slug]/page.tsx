import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: slug },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        imageUrl: true,
      },
    });
    return product;
  } catch {
    return null;
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const inStock = product.stock > 0;

  return (
    <div className="bg-neutral-100 px-4 py-6 sm:px-6">
      <div className="mb-4">
        <Link href="/products" className="text-sm font-semibold text-green-700 hover:underline">
          ← Back to Products
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="relative h-60 w-full bg-neutral-100 sm:h-80">
          <Image
            src={product.imageUrl || FALLBACK_IMAGE}
            alt={product.name}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <h1 className="text-2xl font-bold text-neutral-900">{product.name}</h1>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-extrabold text-green-700">{formatINR(product.price)}</p>
            <Badge tone={inStock ? "success" : "danger"}>
              {inStock ? `${product.stock} available` : "Out of stock"}
            </Badge>
          </div>
          <p className="text-sm leading-6 text-neutral-600">
            {product.description || "Fresh grocery item from your local trusted store."}
          </p>
          <Button href="/cart" className="w-full sm:w-auto" variant="primary">
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
