import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import {
  SuperAdminAnalyticsSkeleton,
  SuperAdminAnalyticsView,
} from "@/components/super-admin/SuperAdminAnalytics";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  period: z.enum(["today", "7d", "30d", "custom"]).optional().default("30d"),
  tenant_id: z.string().nullish().transform((v) => v ?? null),
  platform_type: z.enum(["ERP", "HOTEL", "ALL"]).optional().default("ALL"),
  module: z.string().nullish().transform((v) => v ?? null),
  user_role: z.string().nullish().transform((v) => v ?? null),
  event_name: z.string().nullish().transform((v) => v ?? null),
  date_from: z.string().nullish().transform((v) => v ?? null),
  date_to: z.string().nullish().transform((v) => v ?? null),
});

export const Route = createFileRoute("/super-admin/analytics")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const { data, error } = await supabase.functions.invoke("posthog-analytics", {
      body: deps,
    });
    if (error) {
      throw error;
    }
    return data;
  },
  component: () => {
    const router = useRouter();
    const data = Route.useLoaderData();
    const search = Route.useSearch();
    const updateSearch = (next: Record<string, unknown>) =>
      void router.navigate({
        search: ((current: Record<string, unknown>) => ({ ...current, ...next })) as never,
      });

    return (
      <SuperAdminAnalyticsView
        data={data ?? null}
        loading={false}
        error={null}
        onRetry={() => void router.invalidate()}
        onRefresh={() => void router.invalidate()}
        filters={search}
        onFiltersChange={updateSearch}
      />
    );
  },
  pendingComponent: SuperAdminAnalyticsSkeleton,
  errorComponent: function SuperAdminAnalyticsError({ error }) {
    const router = useRouter();
    return (
      <SuperAdminAnalyticsView
        data={null}
        loading={false}
        error={error instanceof Error ? error.message : "Impossible de charger Analytics."}
        onRetry={() => void router.invalidate()}
        onRefresh={() => void router.invalidate()}
        filters={Route.useSearch()}
        onFiltersChange={(next) =>
          void router.navigate({
            search: ((current: Record<string, unknown>) => ({ ...current, ...next })) as never,
          })
        }
      />
    );
  },
  head: () => ({ meta: [{ title: "Analytics - Super Admin" }] }),
});
