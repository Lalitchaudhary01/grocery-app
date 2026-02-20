"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PublicOrder = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  total: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    productId: string;
    product: {
      name: string;
    };
  }>;
};

type OrderResponse = {
  orders?: PublicOrder[];
  error?: string;
};

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: PublicOrder["status"]): string {
  if (status === "CONFIRMED") return "Accepted";
  if (status === "CANCELLED") return "Rejected";
  if (status === "PENDING") return "Pending";
  if (status === "SHIPPED") return "Out for Delivery";
  return "Delivered";
}

function statusClass(status: PublicOrder["status"]): string {
  if (status === "CONFIRMED") return "bg-green-100 text-green-800";
  if (status === "CANCELLED") return "bg-red-100 text-red-700";
  if (status === "PENDING") return "bg-amber-100 text-amber-800";
  if (status === "SHIPPED") return "bg-blue-100 text-blue-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/orders/my", { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as OrderResponse | null;

      if (!response.ok) {
        throw new Error(body?.error || "Unable to load order history.");
      }

      const mapped = Array.isArray(body?.orders) ? body.orders : [];
      setOrders(mapped);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load order history.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
    const interval = window.setInterval(loadOrders, 8000);
    return () => window.clearInterval(interval);
  }, []);

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status === "PENDING").length,
    [orders],
  );

  return (
    <div className="bg-neutral-100 px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">My Orders</h1>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            Pending: {pendingCount}
          </span>
          <button
            type="button"
            onClick={() => void loadOrders()}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
          Loading orders...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
          No orders found.{" "}
          <Link href="/products" className="font-semibold text-green-700 hover:underline">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-neutral-900">
                  #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}
                >
                  {statusLabel(order.status)}
                </span>
              </div>

              <div className="mt-2 grid gap-1 text-sm text-neutral-600 sm:grid-cols-2">
                <p>
                  Total:{" "}
                  <span className="font-semibold text-green-700">
                    {formatINR(order.total)}
                  </span>
                </p>
                <p>Ordered: {formatDate(order.createdAt)}</p>
                <p>Updated: {formatDate(order.updatedAt)}</p>
              </div>
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold text-neutral-500">
                  Product IDs (click to view order details):
                </p>
                <div className="flex flex-wrap gap-2">
                  {order.items.map((item) => (
                    <Link
                      key={item.productId}
                      href={`/orders/${order.id}`}
                      className="rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                    >
                      {item.productId.slice(0, 8).toUpperCase()}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
