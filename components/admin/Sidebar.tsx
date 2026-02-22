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
    <aside className="h-fit rounded-2xl bg-green-900 p-3 text-white shadow-sm lg:sticky lg:top-4 lg:p-4">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:block lg:overflow-visible lg:px-0 lg:pb-0">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-0 inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition lg:mb-2 lg:flex lg:w-full lg:gap-3 lg:px-3 lg:py-2.5 lg:text-base ${
                active
                  ? "bg-green-700 text-white"
                  : "text-green-100 hover:bg-green-800/80 hover:text-white"
              }`}
            >
              <span className="text-base lg:text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <form action="/api/auth/logout" method="post" className="shrink-0 lg:block">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-green-100 transition hover:bg-green-800/80 hover:text-white lg:flex lg:w-full lg:gap-3 lg:px-3 lg:py-2.5 lg:text-base"
          >
            <span className="text-base lg:text-lg">🚪</span>
            <span>Logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
