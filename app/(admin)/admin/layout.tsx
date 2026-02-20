import { Sidebar } from "@/components/admin/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-100 px-4 py-6 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Sidebar />
        <section>{children}</section>
      </div>
    </div>
  );
}
