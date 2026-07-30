import { createFileRoute, redirect } from "@tanstack/react-router";
import { MmsUsersView } from "@/components/super-admin/MmsUsers";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformAdminAccess } from "@/lib/super-admin.server";

export const Route = createFileRoute("/super-admin/users")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw redirect({ to: "/login" });

    try {
      const access = await getPlatformAdminAccess();
      if (!access.isPlatformAdmin) throw redirect({ to: "/403" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Unauthorized")) throw redirect({ to: "/login" });
      throw error;
    }
  },
  component: MmsUsersView,
  head: () => ({ meta: [{ title: "Utilisateurs MMS — Super Admin" }] }),
});
