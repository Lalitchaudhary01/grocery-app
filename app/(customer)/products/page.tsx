"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number;
}

interface ProductsApiResponse {
  products: Product[];
}

interface StoredCartItem {
  product: Product;
  quantity: number;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1584473457493-17c4f1f64e5d?auto=format&fit=crop&w=1200&q=80";
const CART_STORAGE_KEY = "customer_cart";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export default function CustomerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingMap, setAddingMap] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);

  async function fetchProducts() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/products", { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Unable to load products.");
      }

      const data: ProductsApiResponse = await response.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load products. Please refresh.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchProducts();
  }, []);

  const hasProducts = useMemo(() => products.length > 0, [products.length]);

  async function handleAddToCart(productId: string) {
    setNotice(null);
    setAddingMap((prev) => ({ ...prev, [productId]: true }));
    try {
      const selectedProduct = products.find((product) => product.id === productId);
      if (!selectedProduct) return;
      if (selectedProduct.stock <= 0) {
        setNotice("This product is currently out of stock.");
        return;
      }

      const rawCart = localStorage.getItem(CART_STORAGE_KEY);
      let parsedCart: StoredCartItem[] = [];

      if (rawCart) {
        try {
          const data: unknown = JSON.parse(rawCart);
          if (Array.isArray(data)) {
            parsedCart = data as StoredCartItem[];
          }
        } catch {
          parsedCart = [];
        }
      }
      const existingItem = parsedCart.find(
        (item) => item.product.id === selectedProduct.id,
      );

      if (existingItem) {
        const nextQuantity = existingItem.quantity + 1;
        if (nextQuantity > selectedProduct.stock) {
          setNotice("You have reached the maximum available stock for this item.");
          return;
        }
        existingItem.quantity = nextQuantity;
      } else {
        parsedCart.push({ product: selectedProduct, quantity: 1 });
      }

      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(parsedCart));
      window.dispatchEvent(new Event("storage"));
      setNotice(`Added "${selectedProduct.name}" to cart.`);
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch {
      setNotice("Unable to add product to cart right now.");
    } finally {
      setAddingMap((prev) => ({ ...prev, [productId]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Products
          </h1>
          <p className="text-sm text-neutral-600">
            Browse available items and add them to your cart.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-neutral-500">Loading products...</p>
        ) : error ? (
          <div className="space-y-3">
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void fetchProducts()}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              Retry
            </button>
          </div>
        ) : !hasProducts ? (
          <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
            No products found.
          </p>
        ) : (
          <div className="space-y-4">
            {notice ? (
              <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
                {notice}
              </p>
            ) : null}
            <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
                >
                  <div className="relative aspect-square w-full bg-neutral-100">
                    <Image
                      src={product.imageUrl || FALLBACK_IMAGE}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-3 p-4">
                    <h2 className="line-clamp-2 text-base font-medium text-neutral-900">
                      {product.name}
                    </h2>
                    <p className="text-lg font-semibold text-neutral-800">
                      {formatPrice(product.price)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {product.stock > 0
                        ? `${product.stock} in stock`
                        : "Out of stock"}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleAddToCart(product.id)}
                      disabled={Boolean(addingMap[product.id]) || product.stock <= 0}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
                    >
                      {product.stock <= 0
                        ? "Out of Stock"
                        : addingMap[product.id]
                          ? "Adding..."
                          : "Add to Cart"}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
