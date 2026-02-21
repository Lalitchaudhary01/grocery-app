"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { parseCategoryName } from "@/lib/category-name";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  mrp?: number;
  unit?: string | null;
  discountPercent?: number;
  isActive?: boolean;
  stock: number;
  imageUrl: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
};

type Category = {
  id: string;
  name: string;
};

type ProductsResponse = { products?: Product[] };
type CategoriesResponse = { categories?: Category[] };

type CartItem = {
  product: Product;
  quantity: number;
};

const CART_STORAGE_KEY = "customer_cart";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";
const PRICE_FALLBACK_MAX = 1000;

const CATEGORY_ICONS: Array<{ matcher: RegExp; icon: string }> = [
  { matcher: /aata|atta|anaaj|anaj|grain|rice|chawal|daal|dal/i, icon: "🌾" },
  { matcher: /oil|tel|ghee/i, icon: "🛢️" },
  { matcher: /masala|spice|salt|namak/i, icon: "🧂" },
  { matcher: /safai|clean|harpic|detergent/i, icon: "🧹" },
  { matcher: /soap|care|personal|shampoo/i, icon: "🧴" },
];

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

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function categoryIcon(name: string): string {
  const parsed = parseCategoryName(name);
  if (parsed.icon) return parsed.icon;
  const matched = CATEGORY_ICONS.find((entry) => entry.matcher.test(name));
  return matched?.icon ?? "🛒";
}

function getBrandFromName(name: string): string {
  const normalized = name.trim();
  if (!normalized) return "Local";
  const [firstWord] = normalized.split(/\s+/);
  if (!firstWord) return "Local";
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
}

export default function ProductsPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [sortBy, setSortBy] = useState<"popular" | "priceLow" | "priceHigh" | "name">(
    "popular",
  );
  const [priceCap, setPriceCap] = useState(PRICE_FALLBACK_MAX);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const qFromQuery = searchParams.get("q") ?? "";
    const categoryFromQuery = searchParams.get("categoryId") ?? "";
    setQuery(qFromQuery);
    setCategoryId(categoryFromQuery || "all");
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [productsRes, categoriesRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
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

        setAllProducts(Array.isArray(productsData.products) ? productsData.products : []);
        setCategories(Array.isArray(categoriesData?.categories) ? categoriesData.categories : []);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Products load failed.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const maxPrice = useMemo(() => {
    if (allProducts.length === 0) return PRICE_FALLBACK_MAX;
    return Math.max(
      PRICE_FALLBACK_MAX,
      ...allProducts.map((product) => Math.ceil(product.price)),
    );
  }, [allProducts]);

  useEffect(() => {
    setPriceCap((prev) => Math.min(prev, maxPrice));
    if (
      allProducts.length > 0 &&
      priceCap === PRICE_FALLBACK_MAX &&
      maxPrice < PRICE_FALLBACK_MAX
    ) {
      setPriceCap(maxPrice);
    }
  }, [allProducts.length, maxPrice, priceCap]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of allProducts) {
      const key = product.category?.id;
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [allProducts]);

  const brandList = useMemo(() => {
    const values = Array.from(
      new Set(allProducts.map((product) => getBrandFromName(product.name))),
    );
    return values.slice(0, 6);
  }, [allProducts]);

  const displayedProducts = useMemo(() => {
    const queryLower = query.trim().toLowerCase();
    const filtered = allProducts.filter((product) => {
      if (product.isActive === false) return false;
      const matchesCategory =
        categoryId === "all" ? true : product.category?.id === categoryId;
      const matchesPrice = product.price <= priceCap;
      const matchesQuery =
        queryLower.length === 0
          ? true
          : `${product.name} ${product.description ?? ""} ${
              product.category?.name ?? ""
            }`
              .toLowerCase()
              .includes(queryLower);
      const productBrand = getBrandFromName(product.name);
      const matchesBrand =
        selectedBrands.length === 0 ? true : selectedBrands.includes(productBrand);

      return matchesCategory && matchesPrice && matchesQuery && matchesBrand;
    });

    const sorted = [...filtered];
    if (sortBy === "priceLow") sorted.sort((a, b) => a.price - b.price);
    if (sortBy === "priceHigh") sorted.sort((a, b) => b.price - a.price);
    if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "popular") sorted.sort((a, b) => b.stock - a.stock);
    return sorted;
  }, [allProducts, categoryId, priceCap, query, selectedBrands, sortBy]);

  const allProductsCount = allProducts.length;

  function toggleBrand(brand: string) {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((item) => item !== brand) : [...prev, brand],
    );
  }

  function addToCart(product: Product) {
    if (product.stock <= 0) return;
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
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-5">
            <h2 className="text-3xl font-extrabold text-neutral-900">FILTERS</h2>
          </div>

          <div className="space-y-4 border-b border-neutral-200 p-5">
            <h3 className="text-3xl font-extrabold text-neutral-900">CATEGORY</h3>
            <button
              type="button"
              onClick={() => setCategoryId("all")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                categoryId === "all"
                  ? "bg-green-100 text-green-900"
                  : "bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span>🛒 Sab Products</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs">
                {allProductsCount}
              </span>
            </button>

            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                    categoryId === category.id
                      ? "bg-green-100 text-green-900"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <span>
                    {categoryIcon(category.name)} {parseCategoryName(category.name).label}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
                    {categoryCounts.get(category.id) ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-b border-neutral-200 p-5">
            <h3 className="text-3xl font-extrabold text-neutral-900">PRICE RANGE</h3>
            <input
              type="range"
              min={0}
              max={maxPrice}
              value={priceCap}
              onChange={(event) => setPriceCap(Number(event.target.value))}
              className="w-full accent-green-700"
            />
            <div className="flex items-center justify-between text-sm font-semibold text-neutral-600">
              <span>₹0</span>
              <span>₹{Math.round(maxPrice / 2)}</span>
              <span>₹{maxPrice}</span>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <h3 className="text-3xl font-extrabold text-neutral-900">BRAND</h3>
            <div className="space-y-2">
              {brandList.map((brand) => (
                <label
                  key={brand}
                  className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-neutral-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleBrand(brand)}
                    className="h-4 w-4 rounded border-neutral-300 accent-green-700"
                  />
                  <span>{brand}</span>
                </label>
              ))}
              {brandList.length === 0 ? (
                <p className="text-sm text-neutral-500">No brands available.</p>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-3xl font-bold text-neutral-900">
                {displayedProducts.length} products{" "}
                {query.trim() ? (
                  <span className="font-medium text-neutral-500">
                    - &quot;{query.trim()}&quot;
                  </span>
                ) : null}
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products"
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium focus:border-green-600 focus:outline-none"
                />
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(
                      event.target.value as "popular" | "priceLow" | "priceHigh" | "name",
                    )
                  }
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 focus:border-green-600 focus:outline-none"
                >
                  <option value="popular">Pehle Popular</option>
                  <option value="priceLow">Price: Low to High</option>
                  <option value="priceHigh">Price: High to Low</option>
                  <option value="name">Name A-Z</option>
                </select>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 text-neutral-500">
                  ⊞
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 text-neutral-500">
                  ☰
                </span>
              </div>
            </div>
          </div>

          {toast ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
              {toast}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
              Loading products...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
              No products found for selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {displayedProducts.map((product) => {
                const inStock = product.stock > 0;
                const mrp = product.mrp && product.mrp > product.price ? product.mrp : null;
                const discountPercent =
                  typeof product.discountPercent === "number"
                    ? product.discountPercent
                    : mrp
                      ? Math.max(0, Math.round(((mrp - product.price) / mrp) * 100))
                      : 0;

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link href={`/products/${product.id}`} className="block">
                      <div className="relative h-52 w-full bg-[#edf3e6]">
                        {inStock && discountPercent > 0 ? (
                          <span className="absolute left-3 top-3 z-10 rounded-md bg-red-500 px-2 py-1 text-xs font-bold text-white">
                            {discountPercent}% OFF
                          </span>
                        ) : null}
                        {!inStock ? (
                          <span className="absolute left-3 top-3 z-10 rounded-md bg-red-500 px-2 py-1 text-xs font-bold text-white">
                            OUT
                          </span>
                        ) : null}
                        <span className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-sm text-neutral-400">
                          ❤
                        </span>
                        <Image
                          src={product.imageUrl || FALLBACK_IMAGE}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                          className="object-cover p-4"
                        />
                      </div>
                    </Link>

                    <div className="space-y-1.5 p-4">
                      <p className="text-sm font-bold uppercase tracking-wide text-green-700">
                        {product.category?.name || "General"}
                      </p>
                      <h3 className="line-clamp-1 text-2xl font-bold text-neutral-900">
                        {product.name}
                      </h3>
                      <p className="text-sm text-neutral-500">
                        {product.description?.slice(0, 52) || "Premium quality item"}
                      </p>
                      {product.unit ? (
                        <p className="text-xs font-semibold text-neutral-500">{product.unit}</p>
                      ) : null}
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <p className="text-3xl font-extrabold text-green-700">
                            {formatINR(product.price)}
                          </p>
                          {mrp ? (
                            <p className="text-sm text-neutral-400 line-through">
                              {formatINR(mrp)}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          disabled={!inStock || addingId === product.id}
                          className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-700 text-3xl font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
                        >
                          {addingId === product.id ? "…" : "+"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
