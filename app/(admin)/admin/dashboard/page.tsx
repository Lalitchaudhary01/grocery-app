import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/prisma";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function AdminDashboardPage() {
  const [todayOrders, pendingOrders, totalProducts, lowStockProducts, earningsAggregate] =
    await Promise.all([
      prisma.order.count({
        where: {
          createdAt: {
            gte: startOfToday(),
          },
        },
      }),
      prisma.order.count({
        where: {
          status: "PENDING",
        },
      }),
      prisma.product.count(),
      prisma.product.count({
        where: {
          stock: {
            lte: 5,
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          status: {
            in: ["CONFIRMED", "SHIPPED", "DELIVERED"],
          },
        },
        _sum: {
          total: true,
        },
      }),
    ]);

  const totalEarnings = earningsAggregate._sum.total ?? 0;

  const formatINR = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);

  const stats = [
    { label: "Today Orders", value: String(todayOrders) },
    { label: "Pending Orders", value: String(pendingOrders) },
    { label: "Total Products", value: String(totalProducts) },
    { label: "Low Stock", value: String(lowStockProducts) },
    { label: "Total Earnings", value: formatINR(totalEarnings) },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-neutral-900">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Live grocery operations summary.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-green-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold text-neutral-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-green-700">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-900">Service Status</p>
          <Badge tone="success">Active</Badge>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          3 KM home delivery currently enabled.
        </p>
      </div>
    </div>
  );
}
