"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { CartItem, type CartLineItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";

const CART_STORAGE_KEY = "customer_cart";

function parseStoredCart(value: string | null): CartLineItem[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is CartLineItem => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as Partial<CartLineItem>;

        return (
          typeof candidate.quantity === "number" &&
          candidate.quantity > 0 &&
          !!candidate.product &&
          typeof candidate.product.id === "string" &&
          typeof candidate.product.name === "string" &&
          typeof candidate.product.price === "number" &&
          (typeof candidate.product.imageUrl === "string" ||
            candidate.product.imageUrl === null)
        );
      })
      .map((item) => ({
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          imageUrl: item.product.imageUrl,
        },
        quantity: Math.max(1, Math.floor(item.quantity)),
      }));
  } catch {
    return [];
  }
}

export default function CartPage() {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = parseStoredCart(localStorage.getItem(CART_STORAGE_KEY));
      setItems(stored);
      setIsHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, isHydrated]);

  function increaseQuantity(productId: string) {
    setNotice(null);
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(item.quantity + 1, 99) }
          : item,
      ),
    );
  }

  function decreaseQuantity(productId: string) {
    setNotice(null);
    setItems((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(productId: string) {
    setNotice(null);
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }

  function clearCart() {
    setItems([]);
    setNotice("Cart cleared.");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          Your Cart
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Review items, update quantities, and continue to checkout.
        </p>
        {notice ? (
          <p className="mt-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
            {notice}
          </p>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4">
            {!isHydrated ? (
              <p className="text-sm text-neutral-500">Loading cart...</p>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-600">
                <p>Your cart is empty.</p>
                <Link
                  href="/products"
                  className="mt-3 inline-flex rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
                >
                  Browse Products
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
                  >
                    Clear Cart
                  </button>
                </div>
                {items.map((item) => (
                  <CartItem
                    key={item.product.id}
                    item={item}
                    onIncrease={increaseQuantity}
                    onDecrease={decreaseQuantity}
                    onRemove={removeItem}
                  />
                ))}
              </>
            )}
          </section>

          <CartSummary items={items} />
        </div>
      </div>
    </div>
  );
}
