"use client";

import { useEffect, useState } from "react";
import { OrderStatus } from "@prisma/client";

import { Badge } from "@/components/ui/Badge";

type AdminOrder = {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
  items: Array<{
    productId: string;
  }>;
};

type AdminOrdersResponse = {
  orders?: AdminOrder[];
  error?: string;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/orders/admin", { cache: "no-store" });
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
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-neutral-900">Orders</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Accept or reject customer orders.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-green-50 text-left text-xs font-semibold uppercase tracking-wide text-green-900">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Product IDs</th>
                <th className="px-4 py-3">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-neutral-600">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-neutral-600">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-semibold text-neutral-800">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {order.user.name || order.user.email}
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-700">
                      {formatINR(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={toneFromStatus(order.status)}>
                        {labelFromStatus(order.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {order.items.map((item) => (
                          <a
                            key={item.productId}
                            href={`/admin/orders/${order.id}`}
                            className="rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100"
                          >
                            {item.productId.slice(0, 8).toUpperCase()}
                          </a>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/admin/orders/${order.id}`}
                        className="rounded-md bg-green-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-800"
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
