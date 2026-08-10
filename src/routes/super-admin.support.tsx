import { createFileRoute, redirect } from "@tanstack/react-router";
import { SupportConsoleView } from "@/components/super-admin/SupportConsole";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformAdminAccess } from "@/lib/super-admin.server";

export const Route = createFileRoute("/super-admin/support")({
  ssr: false,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
  component: SupportConsoleView,
  head: () => ({ meta: [{ title: "Support — Super Admin" }] }),
});
