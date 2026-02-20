import Link from "next/link";

import { prisma } from "@/lib/prisma";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getRecentDays(days: number) {
  const list: Date[] = [];
  const today = startOfToday();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    list.push(date);
  }
  return list;
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AdminDashboardPage() {
  const today = startOfToday();
  const validSaleStatuses = ["CONFIRMED", "SHIPPED", "DELIVERED"] as const;
  const recentDays = getRecentDays(7);

  const [
    todaySaleAggregate,
    todayOrdersCount,
    pendingOrdersCount,
    totalProducts,
    outOfStockCount,
    totalCustomers,
    todayNewCustomers,
    recentOrders,
    categorySalesRows,
    allCategories,
    lowStockProducts,
    last7DaysOrders,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        createdAt: { gte: today },
        status: { in: validSaleStatuses },
      },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: today },
      },
    }),
    prisma.order.count({
      where: { status: "PENDING" },
    }),
    prisma.product.count(),
    prisma.product.count({
      where: { stock: { lte: 0 } },
    }),
    prisma.user.count({
      where: { role: "USER" },
    }),
    prisma.user.count({
      where: { role: "USER", createdAt: { gte: today } },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: {
          select: {
            name: true,
          },
        },
        items: {
          select: {
            id: true,
          },
        },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          status: {
            in: validSaleStatuses,
          },
        },
      },
      select: {
        quantity: true,
        price: true,
        product: {
          select: {
            categoryId: true,
          },
        },
      },
    }),
    prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.product.findMany({
      where: {
        stock: { lte: 2 },
      },
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        name: true,
        stock: true,
      },
    }),
    prisma.order.findMany({
      where: {
        createdAt: {
          gte: recentDays[0],
        },
        status: {
          in: validSaleStatuses,
        },
      },
      select: {
        total: true,
        createdAt: true,
      },
    }),
  ]);

  const todaySales = todaySaleAggregate._sum.total ?? 0;

  const totalRevenueByCategoryId = new Map<string, number>();
  for (const row of categorySalesRows) {
    const key = row.product.categoryId;
    totalRevenueByCategoryId.set(
      key,
      (totalRevenueByCategoryId.get(key) ?? 0) + row.price * row.quantity,
    );
  }

  const categorySaleRows = allCategories
    .map((category) => ({
      id: category.id,
      name: category.name,
      total: totalRevenueByCategoryId.get(category.id) ?? 0,
    }))
    .filter((category) => category.total > 0)
    .sort((first, second) => second.total - first.total)
    .slice(0, 4);

  const maxCategorySale = Math.max(1, ...categorySaleRows.map((category) => category.total));

  const salesByDate = new Map<string, number>();
  for (const day of recentDays) {
    salesByDate.set(day.toDateString(), 0);
  }
  for (const order of last7DaysOrders) {
    const key = new Date(order.createdAt).toDateString();
    salesByDate.set(key, (salesByDate.get(key) ?? 0) + order.total);
  }

  const dailySalesBars = recentDays.map((date) => {
    const value = salesByDate.get(date.toDateString()) ?? 0;
    return {
      label: date.toLocaleDateString("en-IN", { weekday: "short" }),
      value,
    };
  });
  const maxDailySale = Math.max(1, ...dailySalesBars.map((bar) => bar.value));

  const pendingAndActiveOrders = recentOrders.filter((order) =>
    ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status),
  );

  const statCards = [
    {
      label: "Aaj ki Total Sale",
      value: formatINR(todaySales),
      note: `↑ ${pendingOrdersCount} pending`,
      icon: "💰",
      accent: "bg-green-500",
    },
    {
      label: "Aaj ke Orders",
      value: String(todayOrdersCount),
      note: `↑ ${pendingOrdersCount} naye pending`,
      icon: "📋",
      accent: "bg-green-500",
    },
    {
      label: "Total Products",
      value: String(totalProducts),
      note: `${outOfStockCount} out of stock`,
      icon: "📦",
      accent: "bg-blue-600",
    },
    {
      label: "Total Customers",
      value: String(totalCustomers),
      note: `↑ ${todayNewCustomers} aaj naye`,
      icon: "👥",
      accent: "bg-red-500",
    },
  ];

  const statusTone: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    SHIPPED: "bg-indigo-100 text-indigo-700",
    DELIVERED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <article
            key={stat.label}
            className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm"
          >
            <div className={`h-1.5 w-full ${stat.accent}`} />
            <div className="space-y-2 px-5 py-4">
              <p className="text-2xl">{stat.icon}</p>
              <p className="text-4xl font-extrabold text-neutral-900">{stat.value}</p>
              <p className="text-xl font-semibold text-neutral-600">{stat.label}</p>
              <p className="text-base font-semibold text-green-700">{stat.note}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-3xl font-extrabold text-neutral-900">Pichhle 7 Din ki Sale</h2>
          <p className="mt-1 text-base text-neutral-600">Rozana kitna hua</p>
          <div className="mt-4 grid h-44 grid-cols-7 items-end gap-3 rounded-2xl bg-neutral-50 p-3">
            {dailySalesBars.map((bar) => (
              <div key={bar.label} className="flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-md bg-green-500/90"
                  style={{
                    height: `${Math.max(8, Math.round((bar.value / maxDailySale) * 100))}%`,
                  }}
                />
                <p className="text-sm font-semibold text-neutral-500">{bar.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-3xl font-extrabold text-neutral-900">Category Wise Sale</h2>
          <div className="mt-5 space-y-4">
            {categorySaleRows.length === 0 ? (
              <p className="text-base text-neutral-600">Abhi category sales data nahi hai.</p>
            ) : (
              categorySaleRows.map((row, index) => {
                const colors = ["bg-green-600", "bg-amber-500", "bg-blue-600", "bg-red-500"];
                return (
                  <div key={row.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xl font-semibold text-neutral-800">{row.name}</p>
                      <p className="text-xl font-bold text-neutral-900">{formatINR(row.total)}</p>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full rounded-full ${colors[index % colors.length]}`}
                        style={{ width: `${Math.max(8, (row.total / maxCategorySale) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <h2 className="text-3xl font-extrabold text-neutral-900">📋 Haale Orders (Pending)</h2>
          <Link
            href="/admin/orders"
            className="rounded-2xl border-2 border-green-700 px-5 py-2 text-lg font-bold text-green-700 transition hover:bg-green-50"
          >
            Sab Dekho →
          </Link>
        </div>

        {pendingAndActiveOrders.length === 0 ? (
          <p className="px-5 py-6 text-lg text-neutral-600">Koi recent order nahi mila.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#eaf1e3] text-left">
                <tr className="text-base uppercase tracking-wide text-neutral-600">
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pendingAndActiveOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="bg-white text-base text-neutral-800">
                    <td className="px-5 py-4 font-extrabold">#{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {order.user.name?.trim() || "Customer"}
                      </p>
                    </td>
                    <td className="px-5 py-4">{order.items.length} items</td>
                    <td className="px-5 py-4 font-bold">{formatINR(order.total)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                          statusTone[order.status]
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex rounded-2xl bg-green-700 px-4 py-1.5 text-base font-bold text-white hover:bg-green-800"
                      >
                        Dekho
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {lowStockProducts.length > 0 ? (
        <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 px-4 py-3 text-base text-red-600">
          <span className="font-bold">⚠ Low Stock Alert:</span>{" "}
          {lowStockProducts
            .map((product) => `${product.name} (${product.stock} left)`)
            .join(", ")}
        </div>
      ) : (
        <div className="rounded-2xl border-l-4 border-green-500 bg-green-50 px-4 py-3 text-base text-green-700">
          ✅ Low stock alert clear. Inventory healthy.
        </div>
      )}
    </div>
  );
}
