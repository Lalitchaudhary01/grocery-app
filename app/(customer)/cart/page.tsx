"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CartItem, type CartLineItem } from "@/components/cart/CartItem";
import { Button } from "@/components/ui/Button";

const CART_STORAGE_KEY = "customer_cart";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function parseCart(value: string | null): CartLineItem[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed as CartLineItem[];
  } catch {
    return [];
  }
}

export default function CartPage() {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const cart = parseCart(localStorage.getItem(CART_STORAGE_KEY));
      setItems(cart);
      setHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("storage"));
  }, [hydrated, items]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items],
  );

  const delivery = items.length > 0 ? 20 : 0;
  const total = subtotal + delivery;

  function increase(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  }

  function decrease(id: string) {
    setItems((prev) =>
      prev
        .map((item) =>
          item.product.id === id ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((item) => item.product.id !== id));
  }

  return (
    <div className="bg-neutral-100 px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Your Cart</h1>
        <Button href="/products" variant="outline" size="sm">
          Add More
        </Button>
      </div>

      {!hydrated ? (
        <div className="rounded-xl bg-white p-4 text-sm text-neutral-600 shadow-sm">Loading cart...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-neutral-600">Your cart is empty.</p>
          <Link href="/products" className="mt-3 inline-flex text-sm font-semibold text-green-700 hover:underline">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-3">
            {items.map((item) => (
              <CartItem
                key={item.product.id}
                item={item}
                onIncrease={increase}
                onDecrease={decrease}
                onRemove={remove}
              />
            ))}
          </section>

          <aside className="h-fit rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Bill Details</h2>
            <div className="mt-3 space-y-2 text-sm text-neutral-600">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery</span>
                <span>{formatINR(delivery)}</span>
              </div>
              <div className="h-px bg-neutral-200" />
              <div className="flex items-center justify-between text-base font-bold text-neutral-900">
                <span>Total</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>
            <Button href="/checkout" className="mt-4 w-full" variant="primary">
              Proceed to Checkout
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
