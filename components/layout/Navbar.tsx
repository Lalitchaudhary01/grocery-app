"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CustomerMeResponse = {
  user?: {
    id: string;
    name: string | null;
    mobile: string | null;
  };
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminRoute = pathname.startsWith("/admin");

  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

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

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/customer-logout", { method: "POST" });
      setIsCustomerLoggedIn(false);
      router.replace("/user-login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-green-100 bg-green-700">
      <div className="mx-auto flex w-full items-center justify-between px-4 py-3 sm:px-6">
        <div>
          <p className="text-sm font-bold leading-tight text-white sm:text-base">
            Vivek Chaudhary
            <br />
            Mohanpur Wale
          </p>
          <p className="text-[11px] text-green-100 sm:text-xs">
            3 KM ke andar Home Delivery
          </p>
        </div>

        {!isAdminRoute ? (
          <nav className="flex items-center gap-2 sm:gap-3">
            {checkingSession ? null : isCustomerLoggedIn ? (
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-green-900 hover:bg-amber-500 disabled:opacity-60 sm:text-sm"
              >
                {loggingOut ? "..." : "Logout"}
              </button>
            ) : (
              <>
                <Link
                  href="/user-register"
                  className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-green-900 hover:bg-amber-500 sm:text-sm"
                >
                  Register
                </Link>
                <Link
                  href="/user-login"
                  className="rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 sm:text-sm"
                >
                  Login
                </Link>
              </>
            )}
            <Link
              href="/products"
              className="rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 sm:text-sm"
            >
              Products
            </Link>
            <Link
              href="/cart"
              className="rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 sm:text-sm"
            >
              Cart
            </Link>
            {isCustomerLoggedIn ? (
              <Link
                href="/orders"
                className="rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 sm:text-sm"
              >
                Orders
              </Link>
            ) : null}
          </nav>
        ) : (
          <Link
            href="/products"
            className="rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 sm:text-sm"
          >
            Back to Shop
          </Link>
        )}
      </div>
    </header>
  );
}
