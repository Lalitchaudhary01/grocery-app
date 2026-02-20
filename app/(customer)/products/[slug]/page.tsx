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
  category: {
    id: string;
    name: string;
  } | null;
};

type RelatedProduct = {
  id: string;
  name: string;
  price: number;
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
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return product;
  } catch {
    return null;
  }
}

async function getRelatedProducts(product: Product): Promise<RelatedProduct[]> {
  if (!product.categoryId) return [];

  try {
    const related = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: {
          not: product.id,
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
    });
    return related;
  } catch {
    return [];
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

  const relatedProducts = await getRelatedProducts(product);
  const inStock = product.stock > 0;

  return (
    <div className="bg-neutral-100 px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/products" className="text-sm font-semibold text-green-700 hover:underline">
          ← Back to Products
        </Link>
        {product.category ? (
          <Link
            href={`/products?categoryId=${product.category.id}`}
            className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 hover:bg-green-200"
          >
            {product.category.name}
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="relative h-64 w-full bg-neutral-100 sm:h-[420px]">
            <Image
              src={product.imageUrl || FALLBACK_IMAGE}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
              priority
            />
            <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-700">
              Fresh Stock
            </div>
          </div>

          <div className="grid gap-2 border-t border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-neutral-200">
              <p className="text-[11px] font-semibold uppercase text-neutral-500">Delivery</p>
              <p className="text-sm font-semibold text-neutral-800">Within 3 KM</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-neutral-200">
              <p className="text-[11px] font-semibold uppercase text-neutral-500">Quality</p>
              <p className="text-sm font-semibold text-neutral-800">Local trusted source</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-neutral-200">
              <p className="text-[11px] font-semibold uppercase text-neutral-500">Support</p>
              <p className="text-sm font-semibold text-neutral-800">Call anytime</p>
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Quick Delivery</p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight text-neutral-900">{product.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-3xl font-extrabold text-green-700">{formatINR(product.price)}</p>
              <Badge tone={inStock ? "success" : "danger"}>
                {inStock ? `${product.stock} available` : "Out of stock"}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              {product.description || "Fresh grocery item from your local trusted store."}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button href="/cart" className="w-full" variant="primary">
                Add to Cart
              </Button>
              <Button href="/products" className="w-full" variant="outline">
                Continue Shopping
              </Button>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              Price and stock may update during peak hours.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Product Details</h2>
            <div className="mt-3 space-y-2 text-sm text-neutral-700">
              <p>
                Category:{" "}
                <span className="font-semibold text-neutral-900">
                  {product.category?.name || "General"}
                </span>
              </p>
              <p>
                Stock:{" "}
                <span className="font-semibold text-neutral-900">
                  {inStock ? `${product.stock} units` : "Currently unavailable"}
                </span>
              </p>
              <p>
                Delivery Area: <span className="font-semibold text-neutral-900">Mohanpur + 3 KM</span>
              </p>
            </div>
          </div>
        </aside>
      </div>

      {relatedProducts.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">Similar Products</h2>
            <Link href="/products" className="text-sm font-semibold text-green-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.id}`}
                className="overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-28 w-full bg-neutral-100">
                  <Image
                    src={item.imageUrl || FALLBACK_IMAGE}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-sm font-semibold text-neutral-900">{item.name}</p>
                  <p className="mt-1 text-sm font-extrabold text-green-700">{formatINR(item.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
