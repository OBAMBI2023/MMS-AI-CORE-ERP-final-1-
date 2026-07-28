import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getPartnerDashboard } from "@/lib/partner-admin.server";
import { PartnerAdminDashboardView } from "@/components/partner-admin/PartnerAdminDashboard";

export const Route = createFileRoute("/partner")({
  beforeLoad: async () => {
    try {
      return { dashboard: await getPartnerDashboard() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Partner access denied")) throw redirect({ to: "/403" });
      if (message.includes("Unauthorized")) throw redirect({ to: "/partner-login" });
      throw error;
    }
  },
  loader: ({ context }) => context.dashboard,
  component: function PartnerPage() {
    return (
      <PartnerAdminDashboardView
        data={Route.useLoaderData()}
        onSignOut={async () => {
          await supabase.auth.signOut();
          window.location.assign("/partner-login");
        }}
      />
    );
  },
});
