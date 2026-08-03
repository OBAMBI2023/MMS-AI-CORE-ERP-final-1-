import { createFileRoute, redirect } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { SuperAdminSidebar } from "@/components/super-admin/SuperAdminDashboard";
import { TenantModulesManager } from "@/components/super-admin/TenantModulesManager";
import { supabase } from "@/integrations/supabase/client";
import { getSmsAdminState, getSuperAdminDashboard } from "@/lib/super-admin.server";

export const Route = createFileRoute("/super-admin/modules")({
  ssr: false,
  beforeLoad: async ({ search }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw redirect({ to: "/login" });
    try {
      const [dashboard, sms] = await Promise.all([getSuperAdminDashboard(), getSmsAdminState()]);
      return { dashboard, sms, tenantId: (search as { tenantId?: string }).tenantId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("super administrateur")) throw redirect({ to: "/403" });
      throw error;
    }
  },
  loader: ({ context }) => context,
  component: ModulesPage,
});

function ModulesPage() {
  const { dashboard, sms, tenantId } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-muted/30 lg:pl-[248px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] lg:block">
        <SuperAdminSidebar />
      </aside>
      <header className="border-b bg-background px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Boxes className="size-5" /></span>
          <div><h1 className="text-xl font-semibold">Modules</h1><p className="text-sm text-muted-foreground">Catalogue central et attribution par tenant</p></div>
        </div>
      </header>
      <main className="p-5 sm:p-8">
        <TenantModulesManager tenants={dashboard.tenants} initialTenantId={tenantId} smsSubscriptions={sms.subscriptions} />
      </main>
    </div>
  );
}
