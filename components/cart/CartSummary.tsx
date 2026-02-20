"use client";

import Link from "next/link";

import type { CartLineItem } from "@/components/cart/CartItem";

interface CartSummaryProps {
  items: CartLineItem[];
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function CartSummary({ items }: CartSummaryProps) {
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const subtotal = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );

  return (
    <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-neutral-900">Order Summary</h2>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between text-neutral-600">
          <span>Items</span>
          <span>{itemCount}</span>
        </div>
        <div className="flex items-center justify-between text-neutral-900">
          <span className="font-medium">Subtotal</span>
          <span className="font-semibold">{formatPrice(subtotal)}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <button
          type="button"
          disabled
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-neutral-400 px-4 py-2.5 text-sm font-medium text-white"
        >
          Checkout
        </button>
      ) : (
        <Link
          href="/checkout"
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Checkout
        </Link>
      )}
    </aside>
  );
}
