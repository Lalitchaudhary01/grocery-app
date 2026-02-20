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
  const [couponCode, setCouponCode] = useState("ATTA30");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

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

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );
  const delivery = items.length > 0 ? 0 : 0;
  const discount = appliedCoupon === "ATTA30" && subtotal >= 200 ? 30 : 0;
  const total = Math.max(0, subtotal + delivery - discount);
  const lowStockItem = useMemo(
    () => items.find((item) => item.quantity >= 3) ?? null,
    [items],
  );

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

  function clearCart() {
    setItems([]);
    setAppliedCoupon(null);
  }

  function applyCoupon() {
    if (couponCode.trim().toUpperCase() === "ATTA30") {
      setAppliedCoupon("ATTA30");
      return;
    }
    setAppliedCoupon(null);
  }

  return (
    <div className="bg-neutral-100 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-neutral-900 sm:text-3xl">🛒 Mera Cart</h1>
          <Button href="/products" variant="outline" size="sm">
            Add More
          </Button>
        </div>
      </div>

      {!hydrated ? (
        <div className="mx-auto max-w-7xl rounded-xl bg-white p-4 text-sm text-neutral-600 shadow-sm">Loading cart...</div>
      ) : items.length === 0 ? (
        <div className="mx-auto max-w-7xl rounded-xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-neutral-600">Your cart is empty.</p>
          <Link href="/products" className="mt-3 inline-flex text-sm font-semibold text-green-700 hover:underline">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_540px]">
          <div className="space-y-4">
            <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
                <h2 className="text-2xl font-extrabold text-neutral-900">{itemCount} Items Selected</h2>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xl font-bold text-red-500 transition hover:text-red-600"
                >
                  Sab Hatao
                </button>
              </div>
              <div>
                {items.map((item) => (
                  <CartItem
                    key={item.product.id}
                    item={item}
                    onIncrease={increase}
                    onDecrease={decrease}
                    onRemove={remove}
                  />
                ))}
              </div>
            </section>

            {lowStockItem ? (
              <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-100/70 px-5 py-4 text-base text-amber-900">
                ⚠️ {lowStockItem.product.name} ka stock kam hai - sirf{" "}
                <span className="font-extrabold">{Math.max(1, 5 - lowStockItem.quantity)} packs</span>{" "}
                bache hain!
              </div>
            ) : null}
          </div>

          <aside className="h-fit overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="bg-green-800 px-6 py-5">
              <h2 className="text-2xl font-extrabold text-white">💰 Bill Summary</h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-2xl bg-green-100 px-4 py-3 text-lg font-bold text-green-800">
                🚴 3 KM ke andar FREE Delivery!
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  className="w-full rounded-2xl border-2 border-neutral-300 px-4 py-3 text-base font-semibold text-neutral-900 focus:border-green-600 focus:outline-none"
                  placeholder="Coupon Code"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  className="rounded-2xl border-2 border-green-700 px-6 py-3 text-lg font-extrabold text-green-700 transition hover:bg-green-50"
                >
                  Apply
                </button>
              </div>

              {appliedCoupon ? (
                <div className="rounded-2xl border-l-4 border-green-600 bg-green-100 px-4 py-3 text-sm font-semibold text-green-800">
                  ✅ Coupon {appliedCoupon} laga - ₹{discount} chhoot mili!
                </div>
              ) : null}

              <div className="space-y-3 pt-1 text-xl text-neutral-700">
                <div className="flex items-center justify-between">
                  <span>Subtotal ({itemCount} items)</span>
                  <span className="font-bold text-neutral-900">₹{subtotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery Charge</span>
                  <span className="font-bold text-neutral-900">{delivery === 0 ? "FREE" : formatINR(delivery)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Discount ({appliedCoupon || "N/A"})</span>
                  <span className="font-bold text-neutral-900">-₹{discount}</span>
                </div>
                <div className="h-px bg-neutral-300" />
                <div className="flex items-center justify-between text-3xl font-extrabold text-neutral-900">
                  <span>Total Dena Hai</span>
                  <span className="text-green-700">₹{total}</span>
                </div>
              </div>

              <Button href="/checkout" className="w-full text-2xl font-extrabold" variant="primary">
                Checkout Karein →
              </Button>

              <Link
                href="/products"
                className="block text-center text-xl font-bold text-neutral-600 transition hover:text-green-700"
              >
                ← Shopping Jaari Rakho
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
