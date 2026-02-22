"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/ToastProvider";
import { CART_STORAGE_KEY } from "@/lib/customer-storage";

type CustomerMeResponse = {
  user?: {
    id: string;
    name: string | null;
    mobile: string | null;
  };
};

type CartStorageItem = {
  quantity?: number;
};

function readCartItemCount(): number {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as CartStorageItem[] | null;
    if (!Array.isArray(parsed)) return 0;
    return parsed.reduce((total, item) => total + (typeof item.quantity === "number" ? item.quantity : 0), 0);
  } catch {
    return 0;
  }
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminRoute = pathname.startsWith("/admin");

  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  async function loadCustomerSession() {
    try {
      const response = await fetch("/api/auth/customer-me", { cache: "no-store" });
      if (!response.ok) {
        setIsCustomerLoggedIn(false);
        return;
      }

      const body = (await response.json()) as CustomerMeResponse;
      setIsCustomerLoggedIn(Boolean(body.user?.id));
    } catch {
      setIsCustomerLoggedIn(false);
    } finally {
      setCheckingSession(false);
    }
  }

  useEffect(() => {
    if (isAdminRoute) {
      setCheckingSession(false);
      return;
    }
    void loadCustomerSession();
  }, [isAdminRoute]);

  useEffect(() => {
    if (isAdminRoute) {
      setCartCount(0);
      return;
    }

    const syncCount = () => setCartCount(readCartItemCount());
    syncCount();
    window.addEventListener("storage", syncCount);
    return () => window.removeEventListener("storage", syncCount);
  }, [isAdminRoute]);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      const response = await fetch("/api/auth/customer-logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Logout failed. Try again.");
      }
      setIsCustomerLoggedIn(false);
      showSuccessToast("Logged out successfully.");
      router.replace("/user-login");
      router.refresh();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Logout failed. Try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-green-700 to-green-600 shadow-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-3">

        {/* Logo */}
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image
            src="/logos.png"
            alt="Apni Dukaan"
            width={44}
            height={44}
            className="h-9 w-9 rounded-lg bg-white p-1 shadow sm:h-10 sm:w-10 sm:rounded-xl"
            priority
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight text-white sm:text-base">
              <span className="text-white">Apni </span>
              <span className="text-yellow-300">Dukaan</span>
            </p>
            <p className="truncate text-[10px] text-green-100 sm:text-[11px]">
              3 KM ke andar Home Delivery
            </p>
          </div>
        </Link>

        {/* Navigation */}
        {!isAdminRoute ? (
          <nav className="no-scrollbar flex max-w-full shrink-0 items-center gap-2 overflow-x-auto whitespace-nowrap sm:gap-3">

            {checkingSession ? null : isCustomerLoggedIn ? (
              <button
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="shrink-0 rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-green-900 shadow transition hover:bg-yellow-500 disabled:opacity-60 sm:px-4 sm:py-2 sm:text-sm"
              >
                {loggingOut ? "..." : "Logout"}
              </button>
            ) : (
              <>
                <Link
                  href="/user-register"
                  className="shrink-0 rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-green-900 shadow transition hover:bg-yellow-500 sm:px-4 sm:py-2 sm:text-sm"
                >
                  Register
                </Link>
                <Link
                  href="/user-login"
                  className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30 sm:px-4 sm:py-2 sm:text-sm"
                >
                  Login
                </Link>
              </>
            )}

            <Link
              href="/products"
              className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30 sm:px-4 sm:py-2 sm:text-sm"
            >
              Products
            </Link>

            <Link
              href="/cart"
              className="relative shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30 sm:px-4 sm:py-2 sm:text-sm"
            >
              Cart
              {cartCount > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-bold text-green-900 shadow">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </Link>

            {isCustomerLoggedIn && (
              <>
                <Link
                  href="/orders"
                  className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30 sm:px-4 sm:py-2 sm:text-sm"
                >
                  Orders
                </Link>

                <Link
                  href="/profile"
                  className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30 sm:px-4 sm:py-2 sm:text-sm"
                >
                  Profile
                </Link>
              </>
            )}
          </nav>
        ) : (
          <Link
            href="/products"
            className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30 sm:px-4 sm:py-2 sm:text-sm"
          >
            Back to Shop
          </Link>
        )}

      </div>
    </header>
  );
}
