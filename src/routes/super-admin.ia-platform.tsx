import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { PLATFORM_BRANDING } from "@/config/branding";
import { TriangleAlert } from "lucide-react";
import { AiControlCenter } from "@/components/super-admin/AiControlCenter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getAiControlCenter } from "@/lib/ai-control-center.server";

export const Route = createFileRoute("/super-admin/ia-platform")({
  // Supabase persists the browser session locally. Running this child route's
  // beforeLoad during SSR cannot access that session and would issue an
  // unauthenticated serverFn request.
  ssr: false,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw redirect({ to: "/login" });
    }

    try {
      // The global attachSupabaseAuth function middleware propagates this
      // session as: Authorization: Bearer <access_token>.
      return { aiPlatform: await getAiControlCenter() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Unauthorized")) throw redirect({ to: "/login" });
      if (message.includes("super administrateur de plateforme requis")) throw redirect({ to: "/403" });
      throw error;
    }
  },
  loader: ({ context }) => context.aiPlatform,
  component: function AiPlatformPage() {
    return <AiControlCenter data={Route.useLoaderData()} />;
  },
  errorComponent: function AiPlatformError({ error }) {
    const router = useRouter();
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
        <Card className="w-full max-w-lg space-y-4 rounded-2xl p-6 text-center">
          <TriangleAlert className="mx-auto size-10 text-destructive" />
          <div>
            <h1 className="text-xl font-semibold">
              {PLATFORM_BRANDING.products.ai} indisponible
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Impossible de charger les données de la plateforme."}
            </p>
          </div>
          <Button onClick={() => void router.invalidate()}>Réessayer</Button>
        </Card>
      </main>
    );
  },
  head: () => ({
    meta: [
      {
        title: `${PLATFORM_BRANDING.products.ai} — ${PLATFORM_BRANDING.products.erp}`,
      },
    ],
  }),
});
