import { Sidebar } from "@/components/admin/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-100 px-3 py-4 sm:px-6 sm:py-6">
      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-4">
        <Sidebar />
        <section>{children}</section>
      </div>
    </div>
  );
}
