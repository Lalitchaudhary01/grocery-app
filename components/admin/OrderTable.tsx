import { Badge } from "@/components/ui/Badge";

export interface AdminOrder {
  id: string;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function toneFromStatus(status: string): "success" | "danger" | "neutral" | "accent" {
  if (status === "DELIVERED") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "PENDING") return "accent";
  return "neutral";
}

export function OrderTable({ orders }: { orders: AdminOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
        No orders yet.
      </div>
    );
  }

  return (
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
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 font-semibold text-neutral-800">{order.id}</td>
                <td className="px-4 py-3 text-neutral-700">{order.customerName}</td>
                <td className="px-4 py-3 font-semibold text-green-700">
                  {formatINR(order.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={toneFromStatus(order.status)}>{order.status}</Badge>
                </td>
                <td className="px-4 py-3 text-neutral-600">{order.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
