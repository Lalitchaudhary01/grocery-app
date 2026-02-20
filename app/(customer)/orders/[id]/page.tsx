"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type OrderDetail = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentStatus?: "PENDING_VERIFICATION" | "VERIFIED" | "FAILED";
  paymentMethod?: string | null;
  paymentNote?: string | null;
  total: number;
  createdAt: string;
  deliveryAddress: string | null;
  cancelReason?: string | null;
  timeline?: Array<{
    status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
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
  order?: OrderDetail;
  error?: string;
};

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(status: OrderDetail["status"]): string {
  if (status === "CONFIRMED") return "Accepted";
  if (status === "CANCELLED") return "Rejected";
  if (status === "PENDING") return "Pending";
  if (status === "SHIPPED") return "Out for Delivery";
  return "Delivered";
}

function statusClass(status: OrderDetail["status"]): string {
  if (status === "CONFIRMED") return "bg-green-100 text-green-800";
  if (status === "CANCELLED") return "bg-red-100 text-red-700";
  if (status === "PENDING") return "bg-amber-100 text-amber-800";
  if (status === "SHIPPED") return "bg-blue-100 text-blue-700";
  return "bg-emerald-100 text-emerald-700";
}

const TIMELINE_FLOW: OrderDetail["status"][] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
];

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";

export default function CustomerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        const body = (await response.json().catch(() => null)) as
          | OrderDetailResponse
          | null;

        if (!response.ok) {
          throw new Error(body?.error || "Unable to load order details.");
        }

        if (!body?.order) {
          throw new Error("Order not found.");
        }

        setOrder(body.order);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load order details.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadOrder();
  }, [orderId]);

  return (
    <div className="bg-neutral-100 px-4 py-6 sm:px-6">
      <div className="mb-4">
        <Link href="/orders" className="text-sm font-semibold text-green-700 hover:underline">
          ← Back to Orders
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
          Loading order details...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : order ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-lg font-bold text-neutral-900">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                {statusLabel(order.status)}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              Delivery Address: {order.deliveryAddress || "Not provided"}
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              Payment:{" "}
              <span className="font-semibold text-neutral-900">
                {order.paymentStatus === "VERIFIED"
                  ? "Confirmed"
                  : order.paymentStatus === "FAILED"
                    ? "Not Received"
                    : "Checking"}
              </span>
            </p>
            {order.paymentStatus === "PENDING_VERIFICATION" ? (
              <p className="mt-1 text-xs text-amber-700">
                Admin is verifying your QR payment.
              </p>
            ) : null}
            <p className="mt-1 text-sm font-semibold text-green-700">Total: {formatINR(order.total)}</p>
            {order.status === "CANCELLED" && order.cancelReason ? (
              <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-sm text-red-700">
                Rejection reason: {order.cancelReason}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-neutral-900">Order Tracking</h2>
            <div className="space-y-2">
              {TIMELINE_FLOW.map((step) => {
                const reached =
                  order.status === step ||
                  (order.status === "CONFIRMED" && step === "PENDING") ||
                  (order.status === "SHIPPED" && (step === "PENDING" || step === "CONFIRMED")) ||
                  (order.status === "DELIVERED" &&
                    (step === "PENDING" || step === "CONFIRMED" || step === "SHIPPED"));

                const event = order.timeline?.find((item) => item.status === step);

                return (
                  <div key={step} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-block h-2.5 w-2.5 rounded-full ${
                        reached ? "bg-green-700" : "bg-neutral-300"
                      }`}
                    />
                    <div>
                      <p className={`text-sm font-semibold ${reached ? "text-neutral-900" : "text-neutral-500"}`}>
                        {statusLabel(step)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {event ? new Date(event.createdAt).toLocaleString("en-IN") : "Waiting..."}
                      </p>
                    </div>
                  </div>
                );
              })}
              {order.status === "CANCELLED" ? (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Rejected</p>
                    <p className="text-xs text-red-600">{order.cancelReason || "Rejected by admin."}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-neutral-900">Products in this order</h2>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div
                  key={`${item.productId}-${item.quantity}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm"
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
                    <p className="font-semibold text-neutral-900">{item.product.name}</p>
                    <p className="text-xs text-neutral-500">
                      Product ID:{" "}
                      <Link
                        href={`/products/${item.productId}`}
                        className="font-semibold text-green-700 hover:underline"
                      >
                        {item.productId.slice(0, 8).toUpperCase()}
                      </Link>{" "}
                      | Qty: {item.quantity}
                    </p>
                    {order.status === "DELIVERED" ? (
                      <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Delivered
                      </span>
                    ) : null}
                  </div>
                  </div>
                  <p className="font-semibold text-green-700">{formatINR(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
