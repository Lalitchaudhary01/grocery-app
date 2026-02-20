"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  category?: {
    id: string;
    name: string;
  };
};

type ProductsResponse = { products?: Product[] };
type CategoriesResponse = {
  categories?: Array<{
    id: string;
    name: string;
  }>;
};
type PublicOrder = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  total: number;
};
type PublicOrderResponse = {
  order?: PublicOrder;
};

type CartItem = {
  product: Product;
  quantity: number;
};

const CART_STORAGE_KEY = "customer_cart";
const ORDER_IDS_STORAGE_KEY = "customer_order_ids";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<PublicOrder[]>([]);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"" | "in" | "out">("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    const categoryFromQuery = searchParams.get("categoryId") ?? "";
    const qFromQuery = searchParams.get("q") ?? "";
    setCategoryId(categoryFromQuery);
    setQuery(qFromQuery);
  }, [searchParams]);

  useEffect(() => {
    async function loadProductsAndCategories() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (stockFilter) params.set("stock", stockFilter);
        if (categoryId) params.set("categoryId", categoryId);

        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`/api/products?${params.toString()}`, { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
        ]);

        if (!productsRes.ok) {
          const body = (await productsRes.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error || "Products load failed.");
        }

        const productsData = (await productsRes.json()) as ProductsResponse;
        const categoriesData = (await categoriesRes.json().catch(() => null)) as
          | CategoriesResponse
          | null;

        setProducts(Array.isArray(productsData.products) ? productsData.products : []);
        setCategories(Array.isArray(categoriesData?.categories) ? categoriesData.categories : []);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Products load failed.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProductsAndCategories();
  }, [categoryId, query, stockFilter]);

  useEffect(() => {
    async function loadRecentOrders() {
      const raw = localStorage.getItem(ORDER_IDS_STORAGE_KEY);
      if (!raw) {
        setRecentOrders([]);
        return;
      }

      let orderIds: string[] = [];
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          orderIds = parsed.filter((id): id is string => typeof id === "string");
        }
      } catch {
        orderIds = [];
      }

      const topIds = orderIds.slice(0, 5);
      if (topIds.length === 0) {
        setRecentOrders([]);
        return;
      }

      const responses = await Promise.all(
        topIds.map(async (id) => {
          const response = await fetch(`/api/orders/${id}`, { cache: "no-store" });
          if (!response.ok) return null;
          const body = (await response.json()) as PublicOrderResponse;
          return body.order ?? null;
        }),
      );

      setRecentOrders(responses.filter((order): order is PublicOrder => order !== null));
    }

    void loadRecentOrders();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function addToCart(product: Product) {
    setAddingId(product.id);
    try {
      const cart = readCart();
      const existing = cart.find((item) => item.product.id === product.id);

      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ product, quantity: 1 });
      }

      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      window.dispatchEvent(new Event("storage"));
      setToast(`${product.name} added to cart`);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="bg-neutral-100 px-4 py-6 sm:px-6">
      <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-green-700 via-green-600 to-green-500 p-5 text-white shadow-lg ring-1 ring-green-900/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">All Products</h1>
            <p className="text-sm text-green-100">Fresh stock from your local trusted store.</p>
          </div>
          <Button href="/cart" size="sm" className="bg-amber-400 text-green-900 hover:bg-amber-300">
            Go to Cart
          </Button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_180px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products or category"
            className="w-full rounded-lg border border-white/30 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-amber-300 focus:outline-none"
          />
          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value as "" | "in" | "out")}
            className="w-full rounded-lg border border-white/30 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-amber-300 focus:outline-none"
          >
            <option value="">All stock</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </select>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="w-full rounded-lg border border-white/30 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-amber-300 focus:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {categoryId ? (
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            Category filter active
          </span>
          <button
            type="button"
            onClick={() => setCategoryId("")}
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            Clear
          </button>
        </div>
      ) : null}

      {query.trim() ? (
        <div className="mb-3">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Search: {query.trim()}
          </span>
        </div>
      ) : null}

      {toast ? (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-md px-2 py-0.5 text-xs font-bold text-green-800 hover:bg-green-100"
          >
            ✕
          </button>
        </div>
      ) : null}

      {recentOrders.length > 0 ? (
        <section className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Your Recent Orders</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {recentOrders.map((order) => {
              const label =
                order.status === "CONFIRMED"
                  ? "Accepted"
                  : order.status === "CANCELLED"
                    ? "Rejected"
                    : order.status === "PENDING"
                      ? "Pending"
                      : order.status === "SHIPPED"
                        ? "Out for Delivery"
                        : "Delivered";

              const badgeClass =
                order.status === "CONFIRMED"
                  ? "bg-green-100 text-green-800"
                  : order.status === "CANCELLED"
                    ? "bg-red-100 text-red-700"
                    : order.status === "PENDING"
                      ? "bg-amber-100 text-amber-800"
                      : order.status === "SHIPPED"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-100 text-emerald-700";

              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-neutral-800">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="rounded-xl bg-white p-4 text-sm text-neutral-600 shadow-sm">
          Loading products...
        </div>
      ) : error ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
          <Button href="/products" size="sm" variant="outline">
            Refresh
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl bg-white p-4 text-sm text-neutral-600 shadow-sm">
          No products found.
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const inStock = product.stock > 0;

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link href={`/products/${product.id}`} className="block">
                      <div className="relative aspect-[4/3] w-full bg-neutral-100">
                        <Image
                      src={product.imageUrl || FALLBACK_IMAGE}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                </Link>
                <div className="space-y-2 p-3">
                  {product.category?.name ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">
                      {product.category.name}
                    </p>
                  ) : null}
                  <h2 className="line-clamp-2 text-sm font-semibold text-neutral-900">
                    {product.name}
                  </h2>
                  <div className="flex items-center justify-between">
                    <p className="text-base font-extrabold text-green-700">
                      {formatINR(product.price)}
                    </p>
                    <Badge tone={inStock ? "success" : "danger"}>
                      {inStock ? `${product.stock} in stock` : "Out of stock"}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={!inStock || addingId === product.id}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
                  >
                    {addingId === product.id ? "Adding..." : "Add to Cart"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
