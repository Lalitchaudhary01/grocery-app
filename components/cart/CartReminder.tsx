"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const CART_STORAGE_KEY = "customer_cart";

type CartItem = {
  quantity: number;
};

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

export function CartReminder() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const update = () => setItems(readCart());
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  const count = useMemo(
    () => items.reduce((total, item) => total + Math.max(0, item.quantity), 0),
    [items],
  );

  if (count <= 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">Aapke cart me {count} item pending hain.</p>
      <Link href="/cart" className="mt-1 inline-block font-bold text-green-700 hover:underline">
        Cart continue karo →
      </Link>
    </div>
  );
}

