import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaginatedFilter {
  column: string;
  op: "eq" | "in";
  value: string | number | boolean | (string | number)[] | null | undefined;
}

export interface OrderBy {
  column: string;
  ascending?: boolean;
}

/** Escapes PostgREST `ilike` pattern metacharacters so raw user input can't
 * inject unintended wildcards. */
export function escapeIlike(value: string): string {
  return value.replace(/[%_,]/g, (c) => `\\${c}`);
}

function applyFilteredQuery(
  query: any,
  { searchFields, search, filters, orderBy }: {
    searchFields: string[];
    search: string;
    filters: PaginatedFilter[];
    orderBy?: OrderBy;
  },
) {
  let q = query;
  for (const f of filters) {
    if (f.value === undefined || f.value === null) continue;
    if (Array.isArray(f.value)) {
      if (f.value.length === 0) continue;
      q = q.in(f.column, f.value);
    } else {
      q = q.eq(f.column, f.value);
    }
  }
  const trimmed = search.trim();
  if (trimmed && searchFields.length > 0) {
    const escaped = escapeIlike(trimmed);
    q = q.or(searchFields.map((c) => `${c}.ilike.%${escaped}%`).join(","));
  }
  if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? false });
  return q;
}

export interface UsePaginatedTableArgs {
  table: string;
  tenantId: string | undefined;
  selectColumns?: string;
  searchFields?: string[];
  search: string;
  orderBy?: OrderBy;
  page: number;
  pageSize: number;
  filters?: PaginatedFilter[];
  enabled?: boolean;
}

/**
 * Server-side pagination + search + filters for a single tenant-scoped
 * table: tenant/RLS -> filters -> search -> sort -> .range() pagination, in
 * that order (never filters only the already-paginated page). Used by every
 * list migrated off full-table fetch (Clients, Fournisseurs, Achats, Devis,
 * Dépenses, Produits admin).
 */
export function usePaginatedTable<T>({
  table,
  tenantId,
  selectColumns = "*",
  searchFields = [],
  search,
  orderBy,
  page,
  pageSize,
  filters = [],
  enabled = true,
}: UsePaginatedTableArgs) {
  return useQuery({
    queryKey: [
      table,
      "paginated",
      tenantId,
      page,
      pageSize,
      search,
      orderBy?.column,
      orderBy?.ascending,
      filters,
    ],
    queryFn: async () => {
      if (!tenantId) return { rows: [] as T[], count: 0 };
      const base = (supabase as any)
        .from(table)
        .select(selectColumns, { count: "exact" })
        .eq("tenant_id", tenantId);
      const query = applyFilteredQuery(base, { searchFields, search, filters, orderBy });
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as T[], count: count ?? 0 };
    },
    enabled: enabled && Boolean(tenantId),
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetches every row matching the current search/filters (no `.range()`),
 * for on-demand use only (CSV/PDF/XLSX export) — never for the on-screen
 * list, which stays paginated.
 */
export async function fetchAllMatching<T>({
  table,
  tenantId,
  selectColumns = "*",
  searchFields = [],
  search,
  orderBy,
  filters = [],
}: Omit<UsePaginatedTableArgs, "page" | "pageSize" | "enabled">): Promise<T[]> {
  if (!tenantId) return [];
  const base = (supabase as any).from(table).select(selectColumns).eq("tenant_id", tenantId);
  const query = applyFilteredQuery(base, { searchFields, search, filters, orderBy });
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

/** Debounces a fast-changing value (search input) so callers don't issue a
 * server request on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}
