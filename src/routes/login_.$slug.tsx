import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LoginPage } from "@/routes/login";
import { getPlatformAdminAccess } from "@/lib/super-admin.server";

export const Route = createFileRoute("/login_/$slug")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { isPlatformAdmin } = await getPlatformAdminAccess();
      throw redirect({ to: isPlatformAdmin ? "/super-admin" : "/app" });
    }
  },
  component: TenantLoginPage,
});

function TenantLoginPage() {
  const { slug } = Route.useParams();
  return <LoginPage tenantSlug={slug} />;
}
