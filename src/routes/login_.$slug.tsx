import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LoginPage } from "@/routes/login";
import { getPlatformAdminAccess } from "@/lib/super-admin.server";
import { profileBelongsToTenant } from "@/lib/tenant-login-access";

export const Route = createFileRoute("/login_/$slug")({
  beforeLoad: async ({ params }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { isPlatformAdmin } = await getPlatformAdminAccess();
      if (isPlatformAdmin) throw redirect({ to: "/super-admin" });

      const [{ data: tenant }, { data: profile }] = await Promise.all([
        supabase.from("tenants").select("id").eq("slug", params.slug).maybeSingle(),
        supabase.from("profiles").select("tenant_id").eq("id", session.user.id).maybeSingle(),
      ]);
      if (tenant && profileBelongsToTenant(profile?.tenant_id, tenant.id)) {
        throw redirect({ to: "/app" });
      }
      await supabase.auth.signOut();
    }
  },
  component: TenantLoginPage,
});

function TenantLoginPage() {
  const { slug } = Route.useParams();
  return <LoginPage tenantSlug={slug} />;
}
