import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
      <Sidebar role={session.role} />
      {/* Fixed sidebar offset - desktop 64, mobile full width */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <Header />
        <main className="flex-1 bg-zinc-50 dark:bg-zinc-900 p-4 md:p-6 overflow-auto min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
