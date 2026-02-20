"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarItem {
  href: string;
  label: string;
  icon: string;
  group: "MAIN" | "CATALOG" | "SETTINGS";
}

const ITEMS: SidebarItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊", group: "MAIN" },
  { href: "/admin/orders", label: "Orders", icon: "📋", group: "MAIN" },
  { href: "/admin/products", label: "Products", icon: "📦", group: "CATALOG" },
  { href: "/admin/categories", label: "Categories", icon: "🗂️", group: "CATALOG" },
  { href: "/", label: "Live Site Dekho", icon: "🌐", group: "SETTINGS" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-fit rounded-2xl bg-green-900 p-4 text-white shadow-sm lg:sticky lg:top-4">
      <div className="space-y-6">
        {(["MAIN", "CATALOG", "SETTINGS"] as const).map((group) => (
          <div key={group}>
            <p className="mb-2 px-2 text-xs font-bold tracking-[0.2em] text-green-300">
              {group}
            </p>
            <nav className="space-y-1.5">
              {ITEMS.filter((item) => item.group === group).map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-semibold transition ${
                      active
                        ? "bg-green-700 text-white"
                        : "text-green-100 hover:bg-green-800/80 hover:text-white"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-base font-semibold text-green-100 transition hover:bg-green-800/80 hover:text-white"
          >
            <span className="text-lg">🚪</span>
            <span>Logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
