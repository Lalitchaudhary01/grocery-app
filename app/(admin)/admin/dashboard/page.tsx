import Link from "next/link";
import { OrderStatus } from "@prisma/client";

import { StoreToggleCard } from "@/components/admin/StoreToggleCard";
import { parseCategoryName } from "@/lib/category-name";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last30Days = new Date(today);
  last30Days.setDate(last30Days.getDate() - 30);
  const validSaleStatuses: OrderStatus[] = ["CONFIRMED", "SHIPPED", "DELIVERED"];
  const recentDays = getRecentDays(7);

  const [
    todaySaleAggregate,
    yesterdaySaleAggregate,
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
    topSoldToday,
    topSold7Days,
    topSold30Days,
    lowStockCategoryProducts,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        createdAt: { gte: today },
        status: { in: validSaleStatuses },
      },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: yesterday, lt: today },
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
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          createdAt: { gte: today },
          status: { in: validSaleStatuses },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          createdAt: { gte: recentDays[0] },
          status: { in: validSaleStatuses },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          createdAt: { gte: last30Days },
          status: { in: validSaleStatuses },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.product.findMany({
      where: { stock: { lte: 2 } },
      select: { categoryId: true },
    }),
  ]);

  const todaySales = todaySaleAggregate._sum.total ?? 0;
  const yesterdaySales = yesterdaySaleAggregate._sum.total ?? 0;
  const salesTrendPercent =
    yesterdaySales <= 0 ? (todaySales > 0 ? 100 : 0) : ((todaySales - yesterdaySales) / yesterdaySales) * 100;

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

  const topProductIds = Array.from(
    new Set([
      ...topSoldToday.map((item) => item.productId),
      ...topSold7Days.map((item) => item.productId),
      ...topSold30Days.map((item) => item.productId),
    ]),
  );
  const topProducts = topProductIds.length
    ? await prisma.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, name: true },
      })
    : [];
  const topProductNameById = new Map(topProducts.map((product) => [product.id, product.name]));

  const topProductSections = [
    { label: "Today", rows: topSoldToday },
    { label: "Last 7 Days", rows: topSold7Days },
    { label: "Last 30 Days", rows: topSold30Days },
  ] as const;

  const lowStockCountByCategory = new Map<string, number>();
  for (const product of lowStockCategoryProducts) {
    lowStockCountByCategory.set(
      product.categoryId,
      (lowStockCountByCategory.get(product.categoryId) ?? 0) + 1,
    );
  }
  const categoryLowStock = Array.from(lowStockCountByCategory.entries())
    .map(([categoryId, count]) => {
      const category = allCategories.find((item) => item.id === categoryId);
      return {
        categoryId,
        categoryName: parseCategoryName(category?.name ?? "Unknown").label,
        count,
      };
    })
    .sort((first, second) => second.count - first.count)
    .slice(0, 6)
    .filter((row) => row.count > 0);

  const pendingAndActiveOrders = recentOrders.filter((order) =>
    ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status),
  );

  const statCards = [
    {
      label: "Aaj ki Total Sale",
      value: formatINR(todaySales),
      note: `↑ ${pendingOrdersCount} pending`,
      subNote:
        salesTrendPercent >= 0
          ? `↑ ${salesTrendPercent.toFixed(0)}% vs yesterday`
          : `↓ ${Math.abs(salesTrendPercent).toFixed(0)}% vs yesterday`,
      icon: "💰",
      accent: "bg-green-500",
    },
    {
      label: "Aaj ke Orders",
      value: String(todayOrdersCount),
      note: `↑ ${pendingOrdersCount} naye pending`,
      subNote: `Yesterday sale: ${formatINR(yesterdaySales)}`,
      icon: "📋",
      accent: "bg-green-500",
    },
    {
      label: "Total Products",
      value: String(totalProducts),
      note: `${outOfStockCount} out of stock`,
      subNote: `Low stock <= 2: ${lowStockProducts.length}`,
      icon: "📦",
      accent: "bg-blue-600",
    },
    {
      label: "Total Customers",
      value: String(totalCustomers),
      note: `↑ ${todayNewCustomers} aaj naye`,
      subNote: "Returning customers tracked in orders",
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
              <p className="text-xs text-neutral-500">{stat.subNote}</p>
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

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-extrabold text-neutral-900">Most Sold Products</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {topProductSections.map((section) => (
              <div key={section.label} className="rounded-xl border border-neutral-200 p-3">
                <p className="text-sm font-bold text-neutral-700">{section.label}</p>
                <div className="mt-2 space-y-1.5">
                  {section.rows.length === 0 ? (
                    <p className="text-xs text-neutral-500">No sales data</p>
                  ) : (
                    section.rows.map((row) => (
                      <p key={`${section.label}-${row.productId}`} className="text-xs text-neutral-700">
                        <span className="font-semibold">
                          {topProductNameById.get(row.productId) || row.productId.slice(0, 8)}
                        </span>
                        {" - "}
                        {row._sum.quantity ?? 0} sold
                      </p>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-extrabold text-neutral-900">Category Low Stock Alerts</h2>
          <div className="mt-4 space-y-2">
            {categoryLowStock.length === 0 ? (
              <p className="text-sm text-neutral-600">No category low-stock cluster found.</p>
            ) : (
              categoryLowStock.map((row) => (
                <div
                  key={row.categoryId}
                  className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-red-700">{row.categoryName}</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-700">
                    {row.count} low-stock products
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <StoreToggleCard />

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
