import { headers } from "next/headers";

import { CategoryGrid } from "@/components/category/CategoryGrid";
import { CartReminder } from "@/components/cart/CartReminder";
import { ProductCard, type ProductCardItem } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";

type ProductsResponse = {
  products?: Array<ProductCardItem & { isActive?: boolean }>;
};

type CategoriesResponse = {
  categories?: Array<{
    id: string;
    name: string;
  }>;
};

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
    const products = Array.isArray(data.products) ? data.products : [];
    return products.filter((product) => product.isActive !== false);
  } catch {
    return [];
  }
}

async function getCategories(): Promise<Array<{ id: string; name: string }>> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const protocol = h.get("x-forwarded-proto") ?? "http";

    if (!host) return [];

    const response = await fetch(`${protocol}://${host}/api/categories`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as CategoriesResponse;
    return Array.isArray(data.categories) ? data.categories : [];
  } catch {
    return [];
  }
}

export default async function CustomerHomePage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <div className="bg-neutral-100 pb-8">
      <section className="px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="mb-3">
          <CartReminder />
        </div>
        <div className="animate-rise-in overflow-hidden rounded-2xl bg-gradient-to-br from-green-700 via-green-600 to-green-500 text-white shadow-lg ring-1 ring-green-900/20">
          <div className="grid gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-50">
                Mohanpur Local Grocery
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
                Vivek Chaudhary Mohanpur Wale
              </h1>
              <p className="mt-3 inline-block rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-green-900">
                3 KM ke andar Home Delivery
              </p>

              <form action="/products" method="get" className="mt-5 max-w-xl">
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="q"
                    placeholder="Search product or category"
                    className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-amber-300 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-green-900 transition hover:bg-amber-300"
                  >
                    Search
                  </button>
                </div>
              </form>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button href="/products" variant="accent">
                  Order Now
                </Button>
                <Button href="/cart" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                  Go to Cart
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="animate-soft-float rounded-xl bg-white/10 p-4 ring-1 ring-white/20">
                <p className="text-xs font-semibold text-green-100">Active Categories</p>
                <p className="mt-1 text-2xl font-extrabold">{categories.length}</p>
              </div>
              <div className="animate-soft-float rounded-xl bg-white/10 p-4 ring-1 ring-white/20 [animation-delay:0.2s]">
                <p className="text-xs font-semibold text-green-100">Live Products</p>
                <p className="mt-1 text-2xl font-extrabold">{products.length}</p>
              </div>
              <div className="animate-soft-float rounded-xl bg-white/10 p-4 ring-1 ring-white/20 [animation-delay:0.35s]">
                <p className="text-xs font-semibold text-green-100">Delivery Radius</p>
                <p className="mt-1 text-2xl font-extrabold">3 KM</p>
              </div>
              <div className="animate-soft-float rounded-xl bg-white/10 p-4 ring-1 ring-white/20 [animation-delay:0.5s]">
                <p className="text-xs font-semibold text-green-100">Support</p>
                <p className="mt-1 text-2xl font-extrabold">Daily</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6">
        <div className="animate-rise-in-delay rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">Browse Categories</h2>
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
              Admin Managed
            </span>
          </div>
          <p className="text-sm text-neutral-600">Sirf wahi categories dikh rahi hain jo admin ne create ki hain.</p>
          <CategoryGrid categories={categories} />
        </div>
      </section>

      <section className="px-4 pb-6 sm:px-6">
        <div className="animate-rise-in-delay rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-5 [animation-delay:0.1s]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">Popular Products</h2>
            <Button href="/products" size="sm" variant="outline">
              View All
            </Button>
          </div>
          {products.length === 0 ? (
            <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600 ring-1 ring-neutral-200">
              Products are currently unavailable.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.slice(0, 8).map((product) => (
                <div key={product.id} className="transition duration-200 hover:-translate-y-1 hover:drop-shadow-md">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-4 sm:px-6">
        <div className="animate-rise-in-delay rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-5 [animation-delay:0.2s]">
          <h2 className="text-lg font-bold text-neutral-900">Why Choose Us</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {REASONS.map((reason, index) => (
              <div
                key={reason}
                className="rounded-xl bg-gradient-to-b from-green-50 to-white px-4 py-4 text-sm font-medium text-green-900 ring-1 ring-green-100"
              >
                <p className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">
                  {index + 1}
                </p>
                <p>{reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
