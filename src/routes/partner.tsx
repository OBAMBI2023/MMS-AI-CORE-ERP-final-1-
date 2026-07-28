import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
    const queryClient = useQueryClient();

    const handleSignOut = async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        queryClient.clear();
        window.location.replace("/partner-login");
      } catch (error) {
        console.error("[PartnerPortal] Échec de la déconnexion", error);
        toast.error("La déconnexion a échoué. Veuillez réessayer.");
        throw error;
      }
    };

    return (
      <PartnerAdminDashboardView
        data={Route.useLoaderData()}
        onSignOut={handleSignOut}
      />
    );
  },
});
