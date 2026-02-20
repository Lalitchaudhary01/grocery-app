"use client";

import { OrderStatus } from "@prisma/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";

type AdminOrderDetail = {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  customer: {
    name: string | null;
    email: string;
  };
  deliveryAddress: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    product: {
      name: string;
    };
  }>;
};

type OrderDetailResponse = {
  order?: AdminOrderDetail;
  error?: string;
};

type UpdateResponse = {
  error?: string;
  message?: string;
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

function toneFromStatus(status: OrderStatus): "success" | "danger" | "neutral" | "accent" {
  if (status === "DELIVERED") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "PENDING") return "accent";
  return "neutral";
}

function labelFromStatus(status: OrderStatus): string {
  if (status === "CONFIRMED") return "Accepted";
  if (status === "CANCELLED") return "Rejected";
  if (status === "PENDING") return "Pending";
  if (status === "SHIPPED") return "Out for Delivery";
  return "Delivered";
}

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<OrderStatus | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as
        | OrderDetailResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Unable to load order.");
      }

      if (!body?.order) {
        throw new Error("Order not found.");
      }

      setOrder(body.order);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load order.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function updateStatus(status: OrderStatus) {
    if (!order) return;
    try {
      setSubmitting(status);
      setError(null);

      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const body = (await response.json().catch(() => null)) as UpdateResponse | null;
      if (!response.ok) {
        throw new Error(body?.error || "Failed to update order status.");
      }

      await loadOrder();
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update order status.",
      );
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <Link href="/admin/orders" className="text-sm font-semibold text-green-700 hover:underline">
          ← Back to Orders
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">Order Details</h1>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
          Loading order...
        </div>
      ) : !order ? null : (
        <>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-neutral-600">Order ID</p>
                <p className="font-bold text-neutral-900">{order.id}</p>
              </div>
              <Badge tone={toneFromStatus(order.status)}>{labelFromStatus(order.status)}</Badge>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <p className="text-neutral-700">
                Customer:{" "}
                <span className="font-semibold text-neutral-900">
                  {order.customer.name || order.customer.email}
                </span>
              </p>
              <p className="text-neutral-700">
                Date:{" "}
                <span className="font-semibold text-neutral-900">
                  {formatDate(order.createdAt)}
                </span>
              </p>
              <p className="text-neutral-700 sm:col-span-2">
                Delivery Address:{" "}
                <span className="font-semibold text-neutral-900">
                  {order.deliveryAddress || "Not provided"}
                </span>
              </p>
              <p className="text-neutral-700">
                Total:{" "}
                <span className="font-semibold text-green-700">
                  {formatINR(order.total)}
                </span>
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void updateStatus("CONFIRMED")}
                disabled={submitting !== null || order.status === "CONFIRMED"}
                className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {submitting === "CONFIRMED" ? "Accepting..." : "Accept"}
              </button>
              <button
                type="button"
                onClick={() => void updateStatus("CANCELLED")}
                disabled={submitting !== null || order.status === "CANCELLED"}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {submitting === "CANCELLED" ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Ordered Products</h2>
            <div className="mt-3 space-y-2">
              {order.items.map((item) => (
                <div
                  key={`${item.productId}-${item.quantity}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{item.product.name}</p>
                    <p className="text-xs text-neutral-500">
                      Product ID: {item.productId} | Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-green-700">
                    {formatINR(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
