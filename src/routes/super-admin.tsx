import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getSuperAdminDashboard } from "@/lib/super-admin.server";
import {
  SuperAdminDashboardSkeleton,
  SuperAdminDashboardView,
} from "@/components/super-admin/SuperAdminDashboard";

function SuperAdminDashboardPage() {
  const data = Route.useLoaderData();

  if (!data) {
    return <Outlet />;
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.assign("/login");
  };

  return <SuperAdminDashboardView data={data} onSignOut={signOut} />;
}

export const Route = createFileRoute("/super-admin")({
  // The Supabase session is persisted in browser storage. Waiting for the
  // client prevents an authenticated serverFn from running during SSR without
  // the bearer token that attachSupabaseAuth reads from that session.
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (location.pathname !== "/super-admin" && location.pathname !== "/super-admin/") {
      return { dashboard: null };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw redirect({ to: "/login" });
    }

    try {
      return { dashboard: await getSuperAdminDashboard() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("Unauthorized")) {
        throw redirect({ to: "/login" });
      }
      if (message.includes("super administrateur de plateforme requis")) {
        throw redirect({ to: "/403" });
      }
      throw error;
    }
  },
  loader: ({ context }) => context.dashboard,
  pendingComponent: SuperAdminDashboardSkeleton,
  component: SuperAdminDashboardPage,
  errorComponent: function SuperAdminDashboardError({ error }) {
    const router = useRouter();

    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
        <Card className="w-full max-w-lg space-y-4 rounded-2xl p-6 text-center">
          <TriangleAlert className="mx-auto size-10 text-destructive" />
          <div>
            <h1 className="text-xl font-semibold">Super Admin indisponible</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Impossible de charger le tableau de bord."}
            </p>
          </div>
          <Button onClick={() => void router.invalidate()}>Réessayer</Button>
        </Card>
      </main>
    );
  },
});
