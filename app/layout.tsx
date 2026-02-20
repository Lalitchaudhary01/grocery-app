"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./globals.css";

const CART_STORAGE_KEY = "customer_cart";

function getCartItemCount(): number {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return 0;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return 0;

    return parsed.reduce((count, item) => {
      if (!item || typeof item !== "object") return count;
      const quantity = (item as { quantity?: unknown }).quantity;
      if (typeof quantity !== "number" || quantity <= 0) return count;
      return count + Math.floor(quantity);
    }, 0);
  } catch {
    return 0;
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cartCount, setCartCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function syncCartCount() {
      setCartCount(getCartItemCount());
    }

    syncCartCount();
    window.addEventListener("storage", syncCartCount);
    window.addEventListener("focus", syncCartCount);

    const interval = window.setInterval(syncCartCount, 1500);
    return () => {
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener("focus", syncCartCount);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/95 backdrop-blur">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-neutral-900"
            >
              VivaShop
            </Link>

            <div className="hidden items-center gap-3 sm:flex">
              <Link
                href="/products"
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                Products
              </Link>
              <Link
                href="/checkout"
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                Checkout
              </Link>
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100"
              >
                <span aria-hidden>🛒</span>
                <span>Cart</span>
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-neutral-900 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {cartCount}
                </span>
              </Link>
              <Link
                href="/admin/login"
                className="rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                Admin Login
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-300 text-neutral-800 sm:hidden"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </nav>

          {mobileOpen ? (
            <div className="border-t border-neutral-200 bg-white px-4 py-3 sm:hidden">
              <div className="flex flex-col gap-2">
                <Link
                  href="/products"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  Products
                </Link>
                <Link
                  href="/checkout"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  Checkout
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  <span>Cart</span>
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-neutral-900 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {cartCount}
                  </span>
                </Link>
                <Link
                  href="/admin/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
                >
                  Admin Login
                </Link>
              </div>
            </div>
          ) : null}
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
