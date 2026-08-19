import { Sidebar } from "@/components/sidebar";

/**
 * Chrome for the signed-in dashboard. The login screen sits outside this group
 * so it renders standalone, without the sidebar.
 */
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
