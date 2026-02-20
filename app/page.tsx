
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
};

type ProductsResponse = {
  products?: Product[];
};

const CATEGORIES = ["Aata & Rice", "Daal & Pulses", "Oil & Masala", "Daily Essentials"];

const WHY_US = [
  "3 KM ke andar fast home delivery",
  "Roz ka fresh grocery stock",
  "Seedha local shop se trusted service",
];

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

async function getProducts(): Promise<Product[]> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const protocol = h.get("x-forwarded-proto") ?? "http";
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (host ? `${protocol}://${host}` : "http://localhost:3000");

    const res = await fetch(`${baseUrl}/api/products`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as ProductsResponse;
    return Array.isArray(data.products) ? data.products : [];
  } catch {
    return [];
  }
}

export default async function CustomerHomePage() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Vivek Chaudhary Mohanpur Wale
          </h1>
          <p className="mt-3 text-base text-neutral-600 sm:text-lg">
            3 KM ke andar Home Delivery
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Order Now
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold">Popular Categories</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((category) => (
            <div
              key={category}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium"
            >
              {category}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Products</h2>
          <Link href="/products" className="text-sm font-medium text-neutral-700 hover:text-black">
            View all
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
            Products are currently unavailable. Please check again shortly.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 12).map((product) => {
              const inStock = product.stock > 0;

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
                >
                  <div className="relative aspect-square w-full bg-neutral-100">
                    <Image
                      src={product.imageUrl || FALLBACK_IMAGE}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                  </div>

                  <div className="space-y-2 p-3">
                    <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
                    <p className="text-sm font-semibold">{formatINR(product.price)}</p>
                    <p className={`text-xs ${inStock ? "text-green-700" : "text-red-600"}`}>
                      {inStock ? `In Stock (${product.stock})` : "Out of Stock"}
                    </p>
                    <Link
                      href="/products"
                      className={`inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-xs font-medium ${
                        inStock
                          ? "bg-neutral-900 text-white hover:bg-neutral-700"
                          : "bg-neutral-300 text-neutral-600"
                      }`}
                      aria-disabled={!inStock}
                    >
                      Add to Cart
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-y border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold">Why Choose Us</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {WHY_US.map((item) => (
              <li key={item} className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-neutral-600 sm:px-6 lg:px-8">
          <p className="font-medium text-neutral-900">Vivek Chaudhary Mohanpur Wale</p>
          <p className="mt-1">Contact: +91 90000 00000</p>
          <p className="mt-1">Address: Mohanpur, Local Market Road</p>
        </div>
      </footer>
    </main>
  );
}
