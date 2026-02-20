import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/prisma";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function AdminDashboardPage() {
  const [todayOrders, pendingOrders, totalProducts, lowStockProducts, lowStockList, recentAudits, earningsAggregate] =
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
      prisma.product.findMany({
        where: {
          stock: {
            lte: 5,
          },
        },
        orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
        take: 8,
        select: {
          id: true,
          name: true,
          stock: true,
        },
      }),
      prisma.adminAuditLog.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        include: {
          admin: {
            select: {
              name: true,
              email: true,
            },
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
          <p className="text-sm font-bold text-neutral-900">Low Stock Alerts (≤ 5)</p>
          <Badge tone={lowStockList.length > 0 ? "accent" : "success"}>
            {lowStockList.length > 0 ? "Needs Action" : "Healthy"}
          </Badge>
        </div>
        {lowStockList.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">No low-stock products right now.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="py-1 pr-4">Product</th>
                  <th className="py-1 pr-4">Stock</th>
                  <th className="py-1">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {lowStockList.map((product) => (
                  <tr key={product.id}>
                    <td className="py-2 pr-4 font-semibold text-neutral-800">{product.name}</td>
                    <td className="py-2 pr-4 text-red-600">{product.stock}</td>
                    <td className="py-2 text-xs text-neutral-500">
                      {product.id.slice(0, 8).toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-neutral-900">Recent Admin Actions</p>
        {recentAudits.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">No audit logs available.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {recentAudits.map((log) => (
              <div key={log.id} className="rounded-md border border-neutral-200 px-3 py-2">
                <p className="text-sm font-semibold text-neutral-900">{log.action}</p>
                <p className="text-xs text-neutral-500">
                  {(log.admin.name || log.admin.email) ?? "Admin"} •{" "}
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(log.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
