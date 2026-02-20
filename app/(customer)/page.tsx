import { headers } from "next/headers";

import { ProductCard, type ProductCardItem } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";

type ProductsResponse = {
  products?: ProductCardItem[];
};

const CATEGORIES = [
  { name: "Sabzi", icon: "🥬" },
  { name: "Fruits", icon: "🍎" },
  { name: "Doodh", icon: "🥛" },
  { name: "Masale", icon: "🌶️" },
  { name: "Ration", icon: "🛍️" },
];

const REASONS = [
  "Gaon-friendly simple ordering",
  "Fresh daily stock from trusted local shop",
  "3 KM ke andar reliable home delivery",
];

async function getProducts(): Promise<ProductCardItem[]> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const protocol = h.get("x-forwarded-proto") ?? "http";

    if (!host) return [];

    const response = await fetch(`${protocol}://${host}/api/products`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as ProductsResponse;
    return Array.isArray(data.products) ? data.products : [];
  } catch {
    return [];
  }
}

export default async function CustomerHomePage() {
  const products = await getProducts();

  return (
    <div className="bg-neutral-100">
      <section className="bg-gradient-to-b from-green-700 to-green-600 px-4 py-10 text-white sm:px-6">
        <h1 className="max-w-xl text-3xl font-extrabold leading-tight sm:text-4xl">
          Vivek Chaudhary Mohanpur Wale
        </h1>
        <p className="mt-3 inline-block rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-green-900">
          3 KM ke andar Home Delivery
        </p>
        <div className="mt-6">
          <Button href="/products" variant="accent">
            Order Now
          </Button>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6">
        <h2 className="text-lg font-bold text-neutral-900">Categories</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {CATEGORIES.map((category) => (
            <div
              key={category.name}
              className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-neutral-200"
            >
              <p className="text-2xl">{category.icon}</p>
              <p className="mt-1 text-xs font-semibold text-neutral-700">
                {category.name}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-6 sm:px-6">
        <h2 className="text-lg font-bold text-neutral-900">Popular Products</h2>
        {products.length === 0 ? (
          <div className="mt-3 rounded-xl bg-white p-4 text-sm text-neutral-600 shadow-sm ring-1 ring-neutral-200">
            Products are currently unavailable.
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-white px-4 py-6 sm:px-6">
        <h2 className="text-lg font-bold text-neutral-900">Why Choose Us</h2>
        <div className="mt-3 space-y-2">
          {REASONS.map((reason) => (
            <div
              key={reason}
              className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-900"
            >
              {reason}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
