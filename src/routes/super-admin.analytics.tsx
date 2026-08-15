import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { z } from "zod";
import {
  SuperAdminAnalyticsSkeleton,
  SuperAdminAnalyticsView,
  type AnalyticsErrorKind,
  type AnalyticsFilters,
} from "@/components/super-admin/SuperAdminAnalytics";
import { getAnalyticsTenants } from "@/lib/posthog-analytics.server";
import { supabase } from "@/integrations/supabase/client";

/** 401/403 from the edge function are access-control states, not analytics
 *  outages — only a real 5xx/network failure should read as "temporairement
 *  indisponible". Status comes from FunctionsHttpError.context (the raw,
 *  unread Response), never from re-parsing the response body. */
function classifyAnalyticsError(error: unknown): { kind: AnalyticsErrorKind; message: string } {
  if (error instanceof FunctionsHttpError) {
    const status = error.context?.status;
    if (status === 401) {
      return { kind: "unauthorized", message: "Reconnectez-vous pour accéder aux Analytics SAOVIA." };
    }
    if (status === 403) {
      return {
        kind: "forbidden",
        message: "Vous n'avez pas les autorisations nécessaires pour consulter les analytics globaux.",
      };
    }
  }
  return { kind: "outage", message: error instanceof Error ? error.message : "Impossible de charger Analytics." };
}

const nullableString = z
  .string()
  .nullish()
  .transform((v) => (v && v !== "null" ? v : null));

const searchSchema = z.object({
  period: z.enum(["today", "7d", "30d", "custom"]).optional().default("30d"),
  tenant_id: nullableString,
  platform_type: z.enum(["ERP", "HOTEL", "ALL"]).optional().default("ALL"),
  module: nullableString,
  user_role: nullableString,
  event_name: nullableString,
  date_from: nullableString,
  date_to: nullableString,
});

const DEFAULT_FILTERS: Record<string, unknown> = { period: "30d", platform_type: "ALL" };

function cleanSearch(input: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined || value === "") continue;
    if (DEFAULT_FILTERS[key] !== undefined && value === DEFAULT_FILTERS[key]) continue;
    next[key] = value;
  }
  return next;
}

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
    const [analyticsResult, tenants] = await Promise.all([
      supabase.functions.invoke("posthog-analytics", { body: deps }),
      getAnalyticsTenants().catch(() => []),
    ]);
    if (analyticsResult.error) {
      throw analyticsResult.error;
    }
    return { analytics: analyticsResult.data, tenants };
  },
  component: () => {
    const router = useRouter();
    const { analytics, tenants } = Route.useLoaderData();
    const search = Route.useSearch();
    const updateSearch = (next: Partial<AnalyticsFilters>) =>
      void router.navigate({
        search: ((current: Record<string, unknown>) => cleanSearch({ ...current, ...next })) as never,
      });

    return (
      <SuperAdminAnalyticsView
        data={analytics ?? null}
        loading={false}
        error={null}
        onRetry={() => void router.invalidate()}
        onRefresh={() => void router.invalidate()}
        filters={search}
        onFiltersChange={updateSearch}
        tenants={tenants}
      />
    );
  },
  pendingComponent: SuperAdminAnalyticsSkeleton,
  errorComponent: function SuperAdminAnalyticsError({ error }) {
    const router = useRouter();
    const classified = classifyAnalyticsError(error);
    return (
      <SuperAdminAnalyticsView
        data={null}
        loading={false}
        error={classified.message}
        errorKind={classified.kind}
        onRetry={() => void router.invalidate()}
        onRefresh={() => void router.invalidate()}
        filters={Route.useSearch()}
        onFiltersChange={(next) =>
          void router.navigate({
            search: ((current: Record<string, unknown>) => cleanSearch({ ...current, ...next })) as never,
          })
        }
      />
    );
  },
  head: () => ({ meta: [{ title: "Analytics - Super Admin" }] }),
});
