import Link from "next/link";

interface SidebarItem {
  href: string;
  label: string;
}

const ITEMS: SidebarItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
];

export function Sidebar() {
  return (
    <aside className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-bold text-green-800">Admin Panel</p>
      <nav className="space-y-2">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-green-50 hover:text-green-800"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
