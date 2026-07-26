import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getSuperAdminDashboard } from "@/lib/super-admin.server";
import {
  SuperAdminDashboardSkeleton,
  SuperAdminDashboardView,
} from "@/components/super-admin/SuperAdminDashboard";

function SuperAdminDashboardPage() {
  const data = Route.useLoaderData();

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.assign("/login");
  };

  return <SuperAdminDashboardView data={data} onSignOut={signOut} />;
}

export const Route = createFileRoute("/super-admin")({
  beforeLoad: async () => {
    try {
      return { dashboard: await getSuperAdminDashboard() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("super administrateur de plateforme requis")) {
        throw redirect({ to: "/403" });
      }
      if (message.includes("Unauthorized")) {
        throw redirect({ to: "/login" });
      }

      throw error;
    }
  },
  loader: ({ context }) => context.dashboard,
  pendingComponent: SuperAdminDashboardSkeleton,
  component: SuperAdminDashboardPage,
});
