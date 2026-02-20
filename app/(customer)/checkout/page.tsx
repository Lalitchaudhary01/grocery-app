"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface CartProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

interface CartLineItem {
  product: CartProduct;
  quantity: number;
}

const CART_STORAGE_KEY = "customer_cart";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function readCart(): CartLineItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
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
          typeof candidate.product.price === "number"
        );
      })
      .map((item) => ({
        product: item.product,
        quantity: Math.floor(item.quantity),
      }));
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [cartItems, setCartItems] = useState<CartLineItem[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCartItems(readCart());
      setIsCartLoading(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const totalAmount = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.product.price * item.quantity,
        0,
      ),
    [cartItems],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Please fill in all required details.");
      return;
    }

    setIsSubmitting(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const fallbackKey = digits || Date.now().toString();
      const guestEmail = `guest-${fallbackKey}@guest.local`;

      const payload = {
        customer: {
          name,
          email: guestEmail,
          phone,
          address,
        },
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        if (response.status === 409) {
          throw new Error(data?.error || "Some items are out of stock.");
        }
        throw new Error(data?.error || "Failed to place order.");
      }

      localStorage.removeItem(CART_STORAGE_KEY);
      window.dispatchEvent(new Event("storage"));
      setCartItems([]);
      setName("");
      setPhone("");
      setAddress("");
      setSuccess("Order placed successfully.");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Failed to place order.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Checkout
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Enter your details to place the order.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={isSubmitting || isCartLoading}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none ring-0 transition focus:border-neutral-500"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                disabled={isSubmitting || isCartLoading}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none ring-0 transition focus:border-neutral-500"
              />
            </div>

            <div>
              <label
                htmlFor="address"
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                Address
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                required
                rows={4}
                disabled={isSubmitting || isCartLoading}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none ring-0 transition focus:border-neutral-500"
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || isCartLoading || cartItems.length === 0}
              className="inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {isCartLoading
                ? "Loading cart..."
                : isSubmitting
                  ? "Placing order..."
                  : "Place Order"}
            </button>
          </form>
        </section>

        <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">Summary</h2>
          {isCartLoading ? (
            <p className="mt-4 text-sm text-neutral-500">Loading cart...</p>
          ) : cartItems.length === 0 ? (
            <div className="mt-4 space-y-3 text-sm text-neutral-600">
              <p>No items in cart.</p>
              <Link
                href="/products"
                className="inline-flex rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
              >
                Go to Products
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-4 text-sm text-neutral-600">
                Items: {cartItems.reduce((count, item) => count + item.quantity, 0)}
              </p>
              <p className="mt-2 text-xl font-semibold text-neutral-900">
                {formatPrice(totalAmount)}
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
