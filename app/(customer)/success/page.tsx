"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

type PublicOrder = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  total: number;
  createdAt: string;
};

type OrderResponse = {
  order?: PublicOrder;
  error?: string;
};

function statusLabel(status: PublicOrder["status"]): string {
  if (status === "PENDING") return "Pending";
  if (status === "CONFIRMED") return "Accepted";
  if (status === "CANCELLED") return "Rejected";
  if (status === "SHIPPED") return "Out for Delivery";
  return "Delivered";
}

function statusColor(status: PublicOrder["status"]): string {
  if (status === "PENDING") return "bg-amber-100 text-amber-800";
  if (status === "CONFIRMED") return "bg-green-100 text-green-800";
  if (status === "CANCELLED") return "bg-red-100 text-red-700";
  if (status === "SHIPPED") return "bg-blue-100 text-blue-700";
  return "bg-emerald-100 text-emerald-700";
}

function statusHint(status: PublicOrder["status"]): string {
  if (status === "PENDING") return "Admin is reviewing your order.";
  if (status === "CONFIRMED") return "Order accepted by admin.";
  if (status === "CANCELLED") return "Order rejected by admin.";
  if (status === "SHIPPED") return "Delivery partner is on the way.";
  return "Order delivered successfully.";
}

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const lastStatusRef = useRef<PublicOrder["status"] | null>(null);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    if (!orderId) return;

    let active = true;

    async function fetchOrderStatus() {
      try {
        if (!hasLoadedOnceRef.current) {
          setLoading(true);
        }
        const response = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        const body = (await response.json().catch(() => null)) as OrderResponse | null;

        if (!active) return;

        if (!response.ok) {
          throw new Error(body?.error || "Unable to fetch order status.");
        }

        if (!body?.order) {
          throw new Error("Order not found.");
        }

        const prevStatus = lastStatusRef.current;
        const nextStatus = body.order.status;
        if (prevStatus && prevStatus !== nextStatus) {
          setNotification(`Order status updated: ${statusLabel(nextStatus)}`);
        }

        lastStatusRef.current = nextStatus;
        setOrder(body.order);
        setError(null);
        hasLoadedOnceRef.current = true;
      } catch (fetchError) {
        if (!active) return;
        setError(
          fetchError instanceof Error ? fetchError.message : "Unable to fetch order status.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchOrderStatus();
    const interval = window.setInterval(fetchOrderStatus, 6000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [orderId]);

  const badgeClasses = useMemo(
    () => (order ? statusColor(order.status) : "bg-neutral-100 text-neutral-600"),
    [order],
  );

  return (
    <div className="bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm">
        <div className="bg-green-700 px-6 py-10 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl text-green-700">
            ✓
          </div>
          <h1 className="text-2xl font-extrabold">Order Placed</h1>
          <p className="mt-2 text-sm text-green-100">
            Aapka order successfully place ho gaya hai.
          </p>
        </div>

        <div className="space-y-4 p-6">
          {notification ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
              {notification}
            </div>
          ) : null}

          {!orderId ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
              Order id missing. Please place order again to track status.
            </div>
          ) : loading ? (
            <div className="rounded-lg bg-neutral-100 p-3 text-sm text-neutral-600">
              Checking order status...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : order ? (
            <div className="space-y-3 rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-neutral-900">
                  Order: #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses}`}>
                  {statusLabel(order.status)}
                </span>
              </div>
              <p className="text-sm text-neutral-600">{statusHint(order.status)}</p>
              <p className="text-sm font-semibold text-green-700">
                Total: {formatINR(order.total)}
              </p>
            </div>
          ) : null}

          <p className="text-sm text-neutral-600">
            Kisi bhi help ke liye call karein:{" "}
            <span className="font-semibold text-neutral-900">+91 90000 00000</span>
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button href="/products" className="w-full" variant="primary">
              Continue Shopping
            </Button>
            <Button href="/" className="w-full" variant="outline">
              Go Home
            </Button>
          </div>
          <Button href="/orders" className="w-full" variant="outline">
            Track Orders
          </Button>

          <Link
            href="/products"
            className="block text-center text-sm font-semibold text-green-700 hover:underline"
          >
            View Products
          </Link>
        </div>
      </div>
    </div>
  );
}
