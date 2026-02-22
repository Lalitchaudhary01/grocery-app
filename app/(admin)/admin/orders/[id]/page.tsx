"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/ToastProvider";
import { parseOrderPaymentMeta } from "@/lib/order-payment-meta";
import type { OrderStatus } from "@/lib/order-enums";

type AdminOrderDetail = {
  id: string;
  status: OrderStatus;
  paymentStatus?: "PENDING_VERIFICATION" | "VERIFIED" | "FAILED";
  paymentMethod?: string | null;
  paymentNote?: string | null;
  total: number;
  createdAt: string;
  customer: {
    name: string | null;
    email: string;
  };
  customerPhone?: string | null;
  deliveryAddress: string | null;
  cancelReason?: string | null;
  timeline?: Array<{
    status: OrderStatus;
    note: string | null;
    createdAt: string;
  }>;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    product: {
      name: string;
      imageUrl: string | null;
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

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";

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

function paymentLabel(status: "PENDING_VERIFICATION" | "VERIFIED" | "FAILED"): string {
  if (status === "VERIFIED") return "Payment Confirmed";
  if (status === "FAILED") return "Payment Not Received";
  return "Payment Checking";
}

function paymentTone(status: "PENDING_VERIFICATION" | "VERIFIED" | "FAILED"): "success" | "danger" | "accent" {
  if (status === "VERIFIED") return "success";
  if (status === "FAILED") return "danger";
  return "accent";
}

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const pricing = order ? parseOrderPaymentMeta(order.paymentNote) : null;
  const { success: showSuccessToast, error: showErrorToast } = useToast();

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
        body: JSON.stringify({
          status,
          cancelReason: status === "CANCELLED" ? cancelReason.trim() : undefined,
        }),
      });

      const body = (await response.json().catch(() => null)) as UpdateResponse | null;
      if (!response.ok) {
        throw new Error(body?.error || "Failed to update order status.");
      }

      await loadOrder();
      router.refresh();
      showSuccessToast("Order status updated.");
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Failed to update order status.";
      setError(message);
      showErrorToast(message);
    } finally {
      setSubmitting(null);
    }
  }

  async function updatePaymentStatus(nextStatus: "PENDING_VERIFICATION" | "VERIFIED" | "FAILED") {
    if (!order) return;
    try {
      setSubmitting(`payment:${nextStatus}`);
      setError(null);

      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentStatus: nextStatus,
        }),
      });

      const body = (await response.json().catch(() => null)) as UpdateResponse | null;
      if (!response.ok) {
        throw new Error(body?.error || "Failed to update payment status.");
      }

      await loadOrder();
      router.refresh();
      showSuccessToast("Payment status updated.");
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Failed to update payment status.";
      setError(message);
      showErrorToast(message);
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
        <h1 className="mt-2 text-lg font-bold text-neutral-900 sm:text-xl">Order Details</h1>
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
                <p className="break-all font-bold text-neutral-900">{order.id}</p>
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
              <p className="text-neutral-700">
                Phone:{" "}
                {order.customerPhone ? (
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="font-semibold text-green-700 hover:underline"
                  >
                    {order.customerPhone}
                  </a>
                ) : (
                  <span className="font-semibold text-neutral-900">Not provided</span>
                )}
              </p>
              <p className="text-neutral-700 sm:col-span-2">
                Delivery Address:{" "}
                <span className="font-semibold text-neutral-900">
                  {order.deliveryAddress || "Not provided"}
                </span>
              </p>
              <p className="text-neutral-700">
                Subtotal:{" "}
                <span className="font-semibold text-neutral-900">
                  {formatINR(pricing?.subtotalAmount ?? order.total)}
                </span>
              </p>
              <p className="text-neutral-700">
                Delivery:{" "}
                <span className="font-semibold text-neutral-900">
                  {(pricing?.deliveryCharge ?? 0) > 0
                    ? formatINR(pricing?.deliveryCharge ?? 0)
                    : "FREE"}
                </span>
              </p>
              <p className="text-neutral-700">
                Total:{" "}
                <span className="font-semibold text-green-700">
                  {formatINR(order.total)}
                </span>
              </p>
              <p className="text-neutral-700">
                Payment:{" "}
                <Badge tone={paymentTone(order.paymentStatus || "PENDING_VERIFICATION")}>
                  {paymentLabel(order.paymentStatus || "PENDING_VERIFICATION")}
                </Badge>
              </p>
            </div>

            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
              <a
                href={`/api/orders/${order.id}/packing-slip`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Print Packing Slip
              </a>
              <button
                type="button"
                onClick={() => void updatePaymentStatus("VERIFIED")}
                disabled={submitting !== null || order.paymentStatus === "VERIFIED"}
                className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting === "payment:VERIFIED" ? "Saving..." : "Payment Received"}
              </button>
              <button
                type="button"
                onClick={() => void updatePaymentStatus("FAILED")}
                disabled={submitting !== null || order.paymentStatus === "FAILED"}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting === "payment:FAILED" ? "Saving..." : "Not Received"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => void updateStatus("CONFIRMED")}
                disabled={submitting !== null || order.status === "CONFIRMED" || (order.paymentStatus && order.paymentStatus !== "VERIFIED")}
                className="rounded-md bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {submitting === "CONFIRMED" ? "Accepting..." : "Accept"}
              </button>
              <button
                type="button"
                onClick={() => void updateStatus("SHIPPED")}
                disabled={submitting !== null || order.status === "SHIPPED" || order.status === "CANCELLED" || (order.paymentStatus && order.paymentStatus !== "VERIFIED")}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {submitting === "SHIPPED" ? "Updating..." : "Shipped"}
              </button>
              <button
                type="button"
                onClick={() => void updateStatus("DELIVERED")}
                disabled={submitting !== null || order.status === "DELIVERED" || order.status === "CANCELLED" || (order.paymentStatus && order.paymentStatus !== "VERIFIED")}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {submitting === "DELIVERED" ? "Updating..." : "Delivered"}
              </button>
              <button
                type="button"
                onClick={() => void updateStatus("CANCELLED")}
                disabled={submitting !== null || order.status === "CANCELLED"}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {submitting === "CANCELLED" ? "Rejecting..." : "Reject"}
              </button>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
                Rejection Reason (required for reject)
              </label>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={2}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                placeholder="Reason to show customer"
              />
            </div>
            {order.status === "CANCELLED" && order.cancelReason ? (
              <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-sm text-red-700">
                Current reason: {order.cancelReason}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Status Timeline</h2>
            <div className="mt-3 space-y-2">
              {order.timeline?.map((event, index) => (
                <div key={`${event.status}-${index}`} className="rounded-md border border-neutral-200 px-3 py-2">
                  <p className="text-sm font-semibold text-neutral-900">{labelFromStatus(event.status)}</p>
                  <p className="text-xs text-neutral-500">
                    {formatDate(event.createdAt)}
                    {event.note ? ` • ${event.note}` : ""}
                  </p>
                </div>
              ))}
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
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
                      <Image
                        src={item.product.imageUrl || FALLBACK_IMAGE}
                        alt={item.product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                    <p className="text-sm font-semibold text-neutral-900">{item.product.name}</p>
                    <p className="text-xs text-neutral-500">
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="font-semibold text-green-700 hover:underline"
                      >
                        View Product
                      </Link>{" "}
                      | Qty: {item.quantity}
                    </p>
                  </div>
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
