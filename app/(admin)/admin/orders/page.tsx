"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

type AdminOrder = {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  total: number;
  createdAt: string;
  cancelReason: string | null;
  user: {
    name: string | null;
    email: string;
  };
  address: {
    street: string;
    phone: string | null;
    city: string;
  } | null;
  items: Array<{
    product: {
      name: string;
    };
  }>;
};

type AdminOrdersResponse = {
  orders?: AdminOrder[];
  error?: string;
};

type RowUpdating = {
  id: string;
  type: "status" | "payment";
};

const STATUS_OPTIONS: Array<{ value: OrderStatus; label: string; icon: string }> = [
  { value: "PENDING", label: "Pending", icon: "⏳" },
  { value: "CONFIRMED", label: "Accepted", icon: "✅" },
  { value: "SHIPPED", label: "Delivering", icon: "🛵" },
  { value: "DELIVERED", label: "Delivered", icon: "📦" },
  { value: "CANCELLED", label: "Cancelled", icon: "❌" },
];

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function relativeTime(value: string) {
  const now = new Date().getTime();
  const created = new Date(value).getTime();
  const diffMin = Math.max(1, Math.floor((now - created) / 60_000));
  if (diffMin < 60) return `${diffMin} min pehle`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hr pehle`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} din pehle`;
}

function formatItems(order: AdminOrder) {
  const names = order.items.map((item) => item.product.name);
  if (names.length === 0) return "-";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")}, +${names.length - 2} more`;
}

function statusPillClass(status: OrderStatus) {
  if (status === "PENDING") return "bg-amber-100 text-amber-700";
  if (status === "CONFIRMED") return "bg-blue-100 text-blue-700";
  if (status === "SHIPPED") return "bg-indigo-100 text-indigo-700";
  if (status === "DELIVERED") return "bg-green-100 text-green-700";
  return "bg-red-100 text-red-700";
}

function paymentPillClass(status: PaymentStatus) {
  if (status === "VERIFIED") return "bg-green-100 text-green-700";
  if (status === "FAILED") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function methodLabel(method: string | null) {
  if (!method) return "UPI";
  if (method.toUpperCase().includes("UPI")) return "UPI";
  return method;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | OrderStatus>("");
  const [date, setDate] = useState("");
  const [rowUpdating, setRowUpdating] = useState<RowUpdating | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      if (date) {
        params.set("from", date);
        params.set("to", date);
      }

      const response = await fetch(`/api/orders/admin?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as
        | AdminOrdersResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Failed to load orders.");
      }

      setOrders(Array.isArray(body?.orders) ? body.orders : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [date, query, status]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const counts = useMemo(() => {
    return {
      pending: orders.filter((order) => order.status === "PENDING").length,
      delivering: orders.filter((order) => order.status === "SHIPPED").length,
      delivered: orders.filter((order) => order.status === "DELIVERED").length,
    };
  }, [orders]);

  async function updateOrder(
    orderId: string,
    payload: { status?: OrderStatus; paymentStatus?: PaymentStatus; cancelReason?: string },
    type: RowUpdating["type"],
  ) {
    try {
      setRowUpdating({ id: orderId, type });
      setError(null);

      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Update failed.");
      }

      await loadOrders();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Update failed.");
    } finally {
      setRowUpdating(null);
    }
  }

  function handleStatusChange(order: AdminOrder, nextStatus: OrderStatus) {
    if (nextStatus === order.status) return;
    if (nextStatus === "CANCELLED") {
      const reason = window.prompt("Reject reason likho (minimum 5 chars):", "Stock issue");
      if (!reason || reason.trim().length < 5) {
        setError("Cancel reason required (minimum 5 chars).");
        return;
      }
      void updateOrder(
        order.id,
        { status: "CANCELLED", cancelReason: reason.trim() },
        "status",
      );
      return;
    }
    void updateOrder(order.id, { status: nextStatus }, "status");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[180px_1fr_220px_auto] lg:items-center">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "" | OrderStatus)}
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 focus:border-green-600 focus:outline-none"
          >
            <option value="">Sab Orders</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Order ID ya naam search..."
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 focus:border-green-600 focus:outline-none"
          />

          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 focus:border-green-600 focus:outline-none"
          />

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              {counts.pending} Pending
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {counts.delivering} Delivering
            </span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              {counts.delivered} Delivered
            </span>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] text-sm">
            <thead className="bg-[#eaf1e3] text-left text-xs font-bold uppercase tracking-wide text-neutral-600">
              <tr>
                <th className="px-4 py-3">Order Id</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-neutral-600">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-neutral-600">
                    Orders nahi mile.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className={order.status === "CANCELLED" ? "bg-red-50/60" : "bg-white"}
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="text-xl font-extrabold text-neutral-900">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">{relativeTime(order.createdAt)}</p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="text-xl font-bold text-neutral-900">
                        {order.user.name || "Customer"}
                      </p>
                      <p className="text-sm text-neutral-500">
                        📞 {order.address?.phone || "Phone not available"}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top text-neutral-700">
                      {order.address
                        ? `${order.address.street}, ${order.address.city}`
                        : "Address not available"}
                    </td>

                    <td className="px-4 py-4 align-top text-neutral-800">{formatItems(order)}</td>

                    <td className="px-4 py-4 align-top text-xl font-extrabold text-neutral-900">
                      {formatINR(order.total)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="space-y-2">
                        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          {methodLabel(order.paymentMethod)}
                        </span>
                        <span
                          className={`block w-fit rounded-full px-3 py-1 text-xs font-semibold ${paymentPillClass(
                            order.paymentStatus,
                          )}`}
                        >
                          {order.paymentStatus === "VERIFIED"
                            ? "Verified"
                            : order.paymentStatus === "FAILED"
                              ? "Failed"
                              : "Pending Verify"}
                        </span>
                        {order.paymentStatus !== "VERIFIED" ? (
                          <button
                            type="button"
                            onClick={() =>
                              void updateOrder(
                                order.id,
                                { paymentStatus: "VERIFIED" },
                                "payment",
                              )
                            }
                            disabled={rowUpdating?.id === order.id}
                            className="rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-400"
                          >
                            {rowUpdating?.id === order.id && rowUpdating.type === "payment"
                              ? "Verifying..."
                              : "Verify UPI"}
                          </button>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="space-y-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(
                            order.status,
                          )}`}
                        >
                          {STATUS_OPTIONS.find((option) => option.value === order.status)?.icon}{" "}
                          {STATUS_OPTIONS.find((option) => option.value === order.status)?.label}
                        </span>
                        <select
                          value={order.status}
                          onChange={(event) =>
                            handleStatusChange(order, event.target.value as OrderStatus)
                          }
                          disabled={
                            rowUpdating?.id === order.id ||
                            (order.paymentStatus !== "VERIFIED" &&
                              order.status !== "PENDING" &&
                              order.status !== "CANCELLED")
                          }
                          className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-800 focus:border-green-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.icon} {option.label}
                            </option>
                          ))}
                        </select>
                        {order.cancelReason ? (
                          <p className="max-w-[210px] text-xs text-red-600">
                            Reason: {order.cancelReason}
                          </p>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
                      >
                        Dekho
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
