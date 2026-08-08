import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { formatSupabaseError } from "@/lib/supabase-error";

export type CatalogItem = {
  id: string;
  type: "product" | "service";
  category_id: string | null;
  category: string;
  name: string;
  price: number;
  cost_price: number;
  unit: string;
  photo_url: string | null;
  stock: number | null;
  manage_stock: boolean;
  stock_alert_threshold: number;
  active: boolean;
  created_at: string;
};

const CATALOG_ITEMS_SELECT =
  "id, type, category_id, category, name, price, cost_price, unit, photo_url, stock, manage_stock, stock_alert_threshold, active, created_at";

/** Escapes PostgREST `ilike` pattern metacharacters so raw user input can't
 * inject unintended wildcards — same helper as use-paginated-table.ts. */
function escapeIlike(value: string): string {
  return value.replace(/[%_,]/g, (c) => `\\${c}`);
}

const PAGE_SIZE = 60;

/**
 * Server-paginated, server-searched catalog items for the POS product grid.
 * Replaces the old unconditional full-table fetch (`useCatalogItems`, which
 * PostgREST's platform-level `db-max-rows` default silently truncated to
 * 1000 rows out of a MEDIUM-volume tenant's ~9,507 active products — the
 * remaining ~89% were both unlisted AND unfindable, since the search was a
 * client-side substring filter over whatever had already loaded).
 *
 * First page is bounded (60 rows) and instant; scrolling further calls
 * fetchNextPage() for the next page via `.range()`. Typing in the search box
 * re-queries the *entire* tenant catalog server-side (`name ilike`), not just
 * the pages already fetched — a product outside the first page is exactly as
 * findable as one on it. Sort key is (created_at desc, id desc): stable and
 * unique, so paging never repeats or skips a row even under concurrent
 * inserts. No RPC needed — a plain PostgREST query already respects RLS
 * (tenant_id comes from the caller's own session, never a client-supplied
 * value) and needs no elevated privileges.
 */
export function useCatalogItemsSearch(options: {
  type: "product" | "service";
  category?: string | null;
  search?: string;
  activeOnly?: boolean;
}) {
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const { type, category, search, activeOnly = false } = options;
  const trimmedSearch = search?.trim() ?? "";

  const query = useInfiniteQuery({
    queryKey: ["catalog-items", "search", tenantId, type, category ?? null, trimmedSearch, activeOnly],
    initialPageParam: 0,
    enabled: !tenantLoading && Boolean(tenantId),
    queryFn: async ({ pageParam }) => {
      if (!tenantId) {
        throw new Error("Impossible de charger le catalogue : aucun tenant n'est associé à ce profil.");
      }
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("services")
        .select(CATALOG_ITEMS_SELECT)
        .eq("tenant_id", tenantId)
        .eq("type", type);
      if (activeOnly) q = q.eq("active", true);
      if (category) q = q.eq("category", category);
      if (trimmedSearch) q = q.ilike("name", `%${escapeIlike(trimmedSearch)}%`);
      const { data, error } = await q
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as CatalogItem[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  });

  const data = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);

  return {
    data,
    loading: tenantLoading || query.isLoading,
    error: query.error ? formatSupabaseError(query.error) : null,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    reload: query.refetch,
  };
}
