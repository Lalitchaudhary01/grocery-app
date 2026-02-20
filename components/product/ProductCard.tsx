import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface ProductCardItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function ProductCard({ product }: { product: ProductCardItem }) {
  const inStock = product.stock > 0;

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-neutral-100">
        <Image
          src={product.imageUrl || FALLBACK_IMAGE}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover"
        />
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-neutral-900">{product.name}</h3>
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-extrabold text-green-700">{formatINR(product.price)}</p>
          <Badge tone={inStock ? "success" : "danger"}>
            {inStock ? "In Stock" : "Out of Stock"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button href="/products" className="w-full" size="sm" variant="primary">
            Add to Cart
          </Button>
          <Link
            href={`/products/${product.id}`}
            className="rounded-lg border border-green-700 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
