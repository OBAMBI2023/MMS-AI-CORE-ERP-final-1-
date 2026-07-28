import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getPartnerDashboard } from "@/lib/partner-admin.server";
import { PartnerAdminDashboardView } from "@/components/partner-admin/PartnerAdminDashboard";

function PartnerAdminPage() {
  const data = Route.useLoaderData();
  return (
    <PartnerAdminDashboardView
      data={data}
      onSignOut={async () => {
        await supabase.auth.signOut();
        window.location.assign("/partner-login");
      }}
    />
  );
}

export const Route = createFileRoute("/partner-admin")({
  beforeLoad: async () => {
    try {
      return { dashboard: await getPartnerDashboard() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Partner access denied")) {
        throw redirect({ to: "/403" });
      }
      if (message.includes("Unauthorized")) throw redirect({ to: "/partner-login" });
      throw error;
    }
  },
  loader: ({ context }) => context.dashboard,
  component: PartnerAdminPage,
});
