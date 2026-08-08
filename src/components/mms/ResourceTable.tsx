import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Check,
  type LucideIcon,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { useActionPermission } from "@/hooks/use-action-permission";
import { logAction } from "@/lib/audit.server";
import { useTenant } from "@/providers/TenantProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PremiumResourceList,
  type MobileEmptyState,
  type MobileSort as ListSort,
} from "@/components/mms/PremiumResourceList";
import {
  usePaginatedTable,
  useDebouncedValue,
  fetchAllMatching,
  type PaginatedFilter,
} from "@/hooks/use-paginated-table";
import type { ExportDataSource } from "@/components/mms/DataExportMenu";

// Dynamic table access — cast client so table names typed as string are accepted.
const db = supabase as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      order: (
        col: string,
        opts?: { ascending?: boolean },
      ) => Promise<{ data: unknown[] | null; error: Error | null }>;
    } & Promise<{ data: unknown[] | null; error: Error | null }>;
    delete: () => { eq: (col: string, val: unknown) => Promise<{ error: Error | null }> };
    update: (payload: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => Promise<{ error: Error | null }>;
    };
    insert: (payload: Record<string, unknown>) => Promise<{ error: Error | null }>;
  };
};

export type FieldType = "text" | "textarea" | "number" | "email" | "tel" | "date" | "select";

export interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: readonly string[];
  placeholder?: string;
  colSpan?: 1 | 2;
  step?: string;
  /** Opt-in: overrides the default input/select/textarea for this field with a custom
   * control (e.g. a searchable select backed by its own data source). When set, `type`
   * and `options` are ignored for rendering but `required` validation still applies. */
  render?: (ctx: {
    value: string | number;
    onChange: (value: string) => void;
    required?: boolean;
  }) => ReactNode;
  /** Icon shown inside the input. Only rendered by the "premium" form dialog variant
   * (see `ResourceTableProps.formVariant`); ignored otherwise. */
  icon?: LucideIcon;
}

export interface ColumnDef<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface MobileCardActions {
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export type { MobileEmptyState };

export interface ResourceTableProps<T extends { id: string }> {
  table: string;
  singular: string;
  plural: string;
  fields: FieldDef[];
  columns: ColumnDef<T>[];
  searchFields?: string[];
  orderBy?: { column: string; ascending?: boolean };
  defaultValues?: Partial<T>;
  /** Receives the current page's rows in client mode (unchanged), or a lazy
   * fetcher of every row matching the current search/filters when
   * `serverPaginated` is on — both are valid `DataExportMenu` data sources. */
  renderActions?: (data: ExportDataSource<T>) => ReactNode;
  deletePermission?: string;
  entityName?: string;
  /** Opt-in premium mobile card list (<768px). When provided, the table is hidden on
   * mobile and this renderer is used instead, with pagination + sort. Other consumers
   * of ResourceTable that don't pass this prop keep the original table-only layout. */
  renderMobileCard?: (row: T, actions: MobileCardActions) => ReactNode;
  mobileEmptyState?: MobileEmptyState;
  mobilePageSize?: number;
  /** Opt-in: renders the card list (via renderMobileCard) at every breakpoint instead of
   * just <768px, replacing the desktop <table> entirely, and switches the toolbar to a
   * single unified search/filter/actions layout with a white, shadowed search bar.
   * Defaults to false so existing table+card consumers are unaffected. */
  premiumLayout?: boolean;
  /** Label used for the "sort by first search field" options in the filter menu.
   * Defaults to "Nom". */
  nameSortLabel?: string;
  /** Opt-in premium visual style for the create/edit form dialog (rounded 24px card,
   * icon header, floating inputs with left icons). Defaults to "default" so existing
   * consumers keep their current dialog, byte-for-byte. */
  formVariant?: "default" | "premium";
  /** Icon shown in the premium form dialog header. Ignored when formVariant is "default". */
  formIcon?: LucideIcon;
  /** Subtitle shown under the title when creating a record, premium variant only. */
  formCreateSubtitle?: string;
  /** Submit button label when creating a record, premium variant only. */
  formSubmitLabel?: string;
  /**
   * Opt-in server-side pagination + search (`.range()` + `count: 'exact'` +
   * `.ilike()`/`.or()`) instead of fetching the whole table and
   * filtering/paginating in the browser. Only wired into the
   * `premiumLayout` + `renderMobileCard` rendering path (the only one any
   * current consumer uses); omit to keep the exact previous full-fetch
   * behavior.
   */
  serverPaginated?: boolean;
  /** Page size when `serverPaginated` is on. Defaults to 20. */
  serverPageSize?: number;
  /** Extra server-side filters applied before search/pagination (e.g. a
   * status or category dropdown). Only used when `serverPaginated` is on. */
  serverFilters?: PaginatedFilter[];
  /** Columns fetched server-side when `serverPaginated` is on. Defaults to
   * "*" (unchanged from the full-fetch behavior). */
  serverSelectColumns?: string;
}

type MobileSort = "default" | "name-asc" | "name-desc" | "recent" | "oldest";

function getPageWindow(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

export function ResourceTable<T extends { id: string; [k: string]: unknown }>(
  props: ResourceTableProps<T>,
) {
  const {
    table,
    singular,
    plural,
    fields,
    columns,
    searchFields = [],
    orderBy,
    defaultValues = {},
    renderActions,
    deletePermission,
    entityName,
    renderMobileCard,
    mobileEmptyState,
    mobilePageSize = 10,
    premiumLayout = false,
    nameSortLabel = "Nom",
    formVariant = "default",
    formIcon,
    formCreateSubtitle,
    formSubmitLabel,
    serverPaginated = false,
    serverPageSize = 20,
    serverFilters = [],
    serverSelectColumns = "*",
  } = props;
  const hasMobileCards = Boolean(renderMobileCard);
  const useUnifiedCards = hasMobileCards && premiumLayout;
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [mobilePage, setMobilePage] = useState(1);
  const [mobileSort, setMobileSort] = useState<MobileSort>("default");
  const [serverPage, setServerPage] = useState(1);
  const [serverSort, setServerSort] = useState<ListSort>("default");
  const nameField = searchFields[0];
  const dateField = orderBy?.column;
  const { data: userData } = useQuery({ queryKey: ["user"], queryFn: () => supabase.auth.getUser() });
  const permissionsQuery = usePermissions();
  const { roleId } = permissionsQuery.data || { roleId: null };
  const userId = userData?.data?.user?.id;
  const canDelete = deletePermission ? useActionPermission(deletePermission) : true;
  const canCreate = entityName ? useActionPermission(`${entityName}.create`) : true;
  const canEdit = entityName ? useActionPermission(`${entityName}.edit`) : true;
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;

  useEffect(() => {
    setServerPage(1);
  }, [debouncedQ, serverSort, serverFilters]);

  const serverOrderBy = useMemo(() => {
    if (serverSort === "name-asc" && nameField) return { column: nameField, ascending: true };
    if (serverSort === "name-desc" && nameField) return { column: nameField, ascending: false };
    if (serverSort === "recent" && dateField) return { column: dateField, ascending: false };
    if (serverSort === "oldest" && dateField) return { column: dateField, ascending: true };
    return orderBy;
  }, [serverSort, nameField, dateField, orderBy]);

  const serverQuery = usePaginatedTable<T>({
    table,
    tenantId,
    selectColumns: serverSelectColumns,
    searchFields,
    search: debouncedQ,
    orderBy: serverOrderBy,
    page: serverPage,
    pageSize: serverPageSize,
    filters: serverFilters,
    enabled: serverPaginated,
  });

  const { data: fullData = [], isLoading: fullLoading } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const query = db.from(table).select("*");
      const { data, error } = await (orderBy
        ? query.order(orderBy.column, { ascending: orderBy.ascending ?? false })
        : query);
      if (error) throw error;
      return (data ?? []) as T[];
    },
    enabled: !serverPaginated,
  });

  const data = serverPaginated ? (serverQuery.data?.rows ?? []) : fullData;
  const isLoading = serverPaginated ? serverQuery.isLoading : fullLoading;
  const serverTotalCount = serverQuery.data?.count ?? 0;

  const filtered = useMemo(() => {
    if (serverPaginated) return data;
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((row) =>
      searchFields.some((f) =>
        String(row[f] ?? "")
          .toLowerCase()
          .includes(s),
      ),
    );
  }, [data, q, searchFields, serverPaginated]);

  const exportSource: ExportDataSource<T> = serverPaginated
    ? () =>
        fetchAllMatching<T>({
          table,
          tenantId,
          selectColumns: serverSelectColumns,
          searchFields,
          search: debouncedQ,
          orderBy: serverOrderBy,
          filters: serverFilters,
        })
    : filtered;

  const sortedForMobile = useMemo(() => {
    if (!hasMobileCards || mobileSort === "default") return filtered;
    const arr = [...filtered];
    if (mobileSort === "name-asc" && nameField) {
      arr.sort((a, b) => String(a[nameField] ?? "").localeCompare(String(b[nameField] ?? "")));
    } else if (mobileSort === "name-desc" && nameField) {
      arr.sort((a, b) => String(b[nameField] ?? "").localeCompare(String(a[nameField] ?? "")));
    } else if (mobileSort === "recent" && dateField) {
      arr.sort((a, b) => String(b[dateField] ?? "").localeCompare(String(a[dateField] ?? "")));
    } else if (mobileSort === "oldest" && dateField) {
      arr.sort((a, b) => String(a[dateField] ?? "").localeCompare(String(b[dateField] ?? "")));
    }
    return arr;
  }, [filtered, hasMobileCards, mobileSort, nameField, dateField]);

  const totalMobilePages = Math.max(1, Math.ceil(sortedForMobile.length / mobilePageSize));

  useEffect(() => {
    setMobilePage(1);
  }, [q, mobileSort]);

  useEffect(() => {
    if (mobilePage > totalMobilePages) setMobilePage(totalMobilePages);
  }, [mobilePage, totalMobilePages]);

  const mobilePageItems = useMemo(() => {
    const start = (mobilePage - 1) * mobilePageSize;
    return sortedForMobile.slice(start, start + mobilePageSize);
  }, [sortedForMobile, mobilePage, mobilePageSize]);

  const delMut = useMutation({
    mutationFn: async (row: T) => {
      const { error } = await db.from(table).delete().eq("id", row.id);
      if (error) throw error;
      return row;
    },
    onSuccess: async (row) => {
      if (userId && entityName) {
        await logAction(userId, roleId ?? null, "delete", entityName, { id: row.id });
      }
      toast.success(`${singular} supprimé`);
      qc.invalidateQueries({ queryKey: [table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createButton = canCreate ? (
    <button
      onClick={() => setCreating(true)}
      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-500/25 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/30 active:scale-[0.98]"
    >
      <Plus className="h-4 w-4" /> Nouveau {singular.toLowerCase()}
    </button>
  ) : undefined;

  return (
    <div className="space-y-4">
      {useUnifiedCards ? (
        <PremiumResourceList<T>
          items={filtered}
          isLoading={isLoading}
          singular={singular}
          plural={plural}
          searchValue={q}
          onSearchChange={setQ}
          renderCard={(row) =>
            renderMobileCard!(row, {
              onEdit: () => setEditing(row),
              onDelete: () => {
                if (confirm(`Supprimer ce ${singular.toLowerCase()} ?`)) delMut.mutate(row);
              },
              canEdit,
              canDelete,
            })
          }
          emptyState={mobileEmptyState}
          pageSize={mobilePageSize}
          actionsSlot={renderActions ? renderActions(exportSource) : undefined}
          createSlot={createButton}
          nameField={nameField}
          nameSortLabel={nameSortLabel}
          dateField={dateField}
          serverPagination={
            serverPaginated
              ? {
                  page: serverPage,
                  pageSize: serverPageSize,
                  totalCount: serverTotalCount,
                  onPageChange: setServerPage,
                  isFetching: serverQuery.isFetching,
                }
              : undefined
          }
          sort={serverPaginated ? serverSort : undefined}
          onSortChange={serverPaginated ? setServerSort : undefined}
        />
      ) : (
        <>
          {hasMobileCards && (
            <div className="flex items-center gap-2 md:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Rechercher un ${singular.toLowerCase()}...`}
                  className="w-full rounded-xl bg-muted/60 border border-border pl-10 pr-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/40"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Filtrer et trier"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setMobileSort("default")}>
                    {mobileSort === "default" ? <Check className="h-4 w-4" /> : <span className="w-4" />}{" "}
                    Par défaut
                  </DropdownMenuItem>
                  {nameField && (
                    <>
                      <DropdownMenuItem onClick={() => setMobileSort("name-asc")}>
                        {mobileSort === "name-asc" ? <Check className="h-4 w-4" /> : <span className="w-4" />}{" "}
                        {nameSortLabel} (A → Z)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMobileSort("name-desc")}>
                        {mobileSort === "name-desc" ? <Check className="h-4 w-4" /> : <span className="w-4" />}{" "}
                        {nameSortLabel} (Z → A)
                      </DropdownMenuItem>
                    </>
                  )}
                  {dateField && (
                    <>
                      <DropdownMenuItem onClick={() => setMobileSort("recent")}>
                        {mobileSort === "recent" ? <Check className="h-4 w-4" /> : <span className="w-4" />}{" "}
                        Plus récents
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMobileSort("oldest")}>
                        {mobileSort === "oldest" ? <Check className="h-4 w-4" /> : <span className="w-4" />}{" "}
                        Plus anciens
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div
            className={
              hasMobileCards
                ? "hidden md:flex md:items-center md:justify-between md:flex-wrap md:gap-3"
                : "flex items-center justify-between flex-wrap gap-3"
            }
          >
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Rechercher un ${singular.toLowerCase()}...`}
                className="w-full rounded-xl bg-muted/60 border border-border pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/40"
              />
            </div>
            <div className="flex items-center gap-3">
              {renderActions && renderActions(filtered)}
              {canCreate && (
                  <button
                    onClick={() => setCreating(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" /> Nouveau {singular.toLowerCase()}
                  </button>
              )}
            </div>
          </div>

          {hasMobileCards && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center md:hidden">
              {renderActions && <div className="flex items-center gap-2">{renderActions(filtered)}</div>}
              {createButton}
            </div>
          )}

          <div
            className={`rounded-2xl border border-border bg-card overflow-x-auto w-full ${hasMobileCards ? "hidden md:block" : ""}`}
          >
            <table className="w-full text-sm min-w-max">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  {columns.map((c, i) => (
                    <th key={i} className={`text-left px-4 py-3 font-medium ${c.className ?? ""}`}>
                      {c.header}
                    </th>
                  ))}
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Aucun {plural.toLowerCase()} {q ? "trouvé" : "pour l'instant"}.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border hover:bg-muted/30 transition-colors"
                    >
                      {columns.map((c, i) => (
                        <td key={i} className={`px-4 py-3 ${c.className ?? ""}`}>
                          {c.cell(row)}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              onClick={() => setEditing(row)}
                              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                              aria-label="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (confirm(`Supprimer ce ${singular.toLowerCase()} ?`))
                                  delMut.mutate(row);
                              }}
                              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {hasMobileCards && (
            <div className="md:hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : sortedForMobile.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 px-6 text-center">
                  {mobileEmptyState?.icon}
                  <p className="font-medium text-foreground">
                    {mobileEmptyState?.title ?? `Aucun ${plural.toLowerCase()}`}
                  </p>
                  <p className="max-w-[26ch] text-sm text-muted-foreground">
                    {mobileEmptyState?.subtitle ??
                      (q ? "Aucun résultat pour cette recherche." : "Rien à afficher pour l'instant.")}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3.5">
                    {mobilePageItems.map((row) => (
                      <div key={row.id}>
                        {renderMobileCard!(row, {
                          onEdit: () => setEditing(row),
                          onDelete: () => {
                            if (confirm(`Supprimer ce ${singular.toLowerCase()} ?`)) delMut.mutate(row);
                          },
                          canEdit,
                          canDelete,
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col items-center gap-3 pb-1">
                    <p className="text-sm text-muted-foreground">
                      {(mobilePage - 1) * mobilePageSize + 1}–
                      {Math.min(mobilePage * mobilePageSize, sortedForMobile.length)} sur{" "}
                      {sortedForMobile.length} {plural.toLowerCase()}
                    </p>
                    {totalMobilePages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMobilePage((p) => Math.max(1, p - 1))}
                          disabled={mobilePage === 1}
                          aria-label="Page précédente"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        {getPageWindow(mobilePage, totalMobilePages).map((p, i) =>
                          p === "ellipsis" ? (
                            <span key={`e-${i}`} className="px-1 text-sm text-muted-foreground">
                              …
                            </span>
                          ) : (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setMobilePage(p)}
                              aria-current={p === mobilePage ? "page" : undefined}
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors duration-200 ${
                                p === mobilePage
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {p}
                            </button>
                          ),
                        )}
                        <button
                          type="button"
                          onClick={() => setMobilePage((p) => Math.min(totalMobilePages, p + 1))}
                          disabled={mobilePage === totalMobilePages}
                          aria-label="Page suivante"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {(creating || editing) && (
          <ResourceFormDialog
            table={table}
            singular={singular}
            fields={fields}
            initial={editing ?? (defaultValues as Partial<T>)}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
            variant={formVariant}
            icon={formIcon}
            createSubtitle={formCreateSubtitle}
            submitLabel={formSubmitLabel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ResourceFormDialog<T extends { id: string }>({
  table,
  singular,
  fields,
  initial,
  onClose,
  variant = "default",
  icon,
  createSubtitle,
  submitLabel,
}: {
  table: string;
  singular: string;
  fields: FieldDef[];
  initial: Partial<T> | T;
  onClose: () => void;
  variant?: "default" | "premium";
  icon?: LucideIcon;
  createSubtitle?: string;
  submitLabel?: string;
}) {
  const qc = useQueryClient();
  const { profile } = useTenant();
  const isEdit = Boolean((initial as T).id);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const base: Record<string, unknown> = {};
    for (const f of fields) base[f.name] = (initial as Record<string, unknown>)[f.name] ?? "";
    return base;
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        let v = values[f.name];
        if (f.type === "number") v = v === "" || v === null ? null : Number(v);
        if (v === "") v = null;
        payload[f.name] = v;
      }
      if (isEdit) {
        const { error } = await db
          .from(table)
          .update(payload)
          .eq("id", (initial as T).id);
        if (error) throw error;
      } else {
        if (profile?.tenant_id) {
            payload.tenant_id = profile.tenant_id;
        }
        const { error } = await db.from(table).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? `${singular} mis à jour` : `${singular} créé`);
      qc.invalidateQueries({ queryKey: [table] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !values[f.name]) {
        toast.error(`Le champ « ${f.label} » est requis`);
        return;
      }
    }
    saveMut.mutate();
  };

  if (variant === "premium") {
    return (
      <PremiumResourceFormDialog
        singular={singular}
        fields={fields}
        values={values}
        setValues={setValues}
        isEdit={isEdit}
        icon={icon}
        createSubtitle={createSubtitle}
        submitLabel={submitLabel}
        isPending={saveMut.isPending}
        onClose={onClose}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold">
            {isEdit ? `Modifier ${singular.toLowerCase()}` : `Nouveau ${singular.toLowerCase()}`}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {fields.map((f) => {
            const span =
              (f.colSpan ?? (f.type === "textarea" ? 2 : 1)) === 2 ? "col-span-2" : "col-span-1";
            const commonProps = {
              value: (values[f.name] ?? "") as string | number,
              onChange: (
                e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
              ) => setValues((s) => ({ ...s, [f.name]: e.target.value })),
              required: f.required,
              placeholder: f.placeholder,
              className:
                "w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40",
            };
            return (
              <label key={f.name} className={`${span} flex flex-col gap-1.5`}>
                <span className="text-xs font-medium text-muted-foreground">
                  {f.label}
                  {f.required && <span className="text-destructive"> *</span>}
                </span>
                {f.render ? (
                  f.render({
                    value: (values[f.name] ?? "") as string | number,
                    onChange: (v) => setValues((s) => ({ ...s, [f.name]: v })),
                    required: f.required,
                  })
                ) : f.type === "textarea" ? (
                  <textarea rows={3} {...commonProps} />
                ) : f.type === "select" ? (
                  <select {...commonProps}>
                    <option value="">—</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type={f.type ?? "text"} step={f.step} {...commonProps} />
                )}
              </label>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saveMut.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/** Premium SaaS-styled form dialog (rounded-24px card, icon header, inputs with left
 * icons). Opt-in via `ResourceTableProps.formVariant="premium"` — shares the exact same
 * state, validation and submit handler as the default dialog; only the markup differs. */
function PremiumResourceFormDialog({
  singular,
  fields,
  values,
  setValues,
  isEdit,
  icon: Icon,
  createSubtitle,
  submitLabel,
  isPending,
  onClose,
  onSubmit,
}: {
  singular: string;
  fields: FieldDef[];
  values: Record<string, unknown>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  isEdit: boolean;
  icon?: LucideIcon;
  createSubtitle?: string;
  submitLabel?: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const titleId = useId();
  const subtitleId = useId();
  const cardRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    cardRef.current?.querySelector<HTMLElement>("input, textarea, select")?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      const focusables = cardRef.current.querySelectorAll<HTMLElement>(
        'input, textarea, select, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const title = isEdit ? `Modifier ${singular.toLowerCase()}` : `Nouveau ${singular.toLowerCase()}`;
  const subtitle = isEdit
    ? `Modifiez les informations de ce ${singular.toLowerCase()}.`
    : (createSubtitle ?? `Ajoutez les informations de votre nouveau ${singular.toLowerCase()}.`);
  const submitText = isEdit
    ? "Enregistrer les modifications"
    : (submitLabel ?? `Créer ${singular.toLowerCase()}`);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.form
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_25px_70px_-15px_rgba(15,23,42,0.35)] dark:border-border dark:bg-card sm:max-h-[85vh] sm:rounded-[24px]"
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Icon className="h-6 w-6" />
              </div>
            )}
            <div>
              <h3 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-foreground">
                {title}
              </h3>
              <p id={subtitleId} className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-2 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-muted dark:hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 overflow-y-auto px-6 pb-2 sm:grid-cols-2 sm:gap-5 sm:px-8">
          {fields.map((f) => {
            const span =
              (f.colSpan ?? (f.type === "textarea" ? 2 : 1)) === 2 ? "sm:col-span-2" : "sm:col-span-1";
            const FieldIcon = f.icon;
            const commonProps = {
              value: (values[f.name] ?? "") as string | number,
              onChange: (
                e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
              ) => setValues((s) => ({ ...s, [f.name]: e.target.value })),
              required: f.required,
              placeholder: f.placeholder,
            };
            const inputClasses = `w-full rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 dark:border-border dark:bg-muted/40 dark:text-foreground ${FieldIcon ? "pl-11" : "pl-4"} pr-4`;

            return (
              <label key={f.name} className={`col-span-1 ${span} flex flex-col gap-2`}>
                <span className="text-sm font-medium text-slate-700 dark:text-foreground">
                  {f.label}
                  {f.required && <span className="text-blue-600"> *</span>}
                </span>
                {f.render ? (
                  f.render({
                    value: (values[f.name] ?? "") as string | number,
                    onChange: (v) => setValues((s) => ({ ...s, [f.name]: v })),
                    required: f.required,
                  })
                ) : f.type === "textarea" ? (
                  <div className="relative">
                    {FieldIcon && (
                      <FieldIcon className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />
                    )}
                    <textarea
                      rows={4}
                      {...commonProps}
                      className={`h-[120px] resize-none py-3.5 ${inputClasses}`}
                    />
                  </div>
                ) : f.type === "select" ? (
                  <div className="relative">
                    {FieldIcon && (
                      <FieldIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    )}
                    <select {...commonProps} className={`h-14 ${inputClasses}`}>
                      <option value="">—</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="relative">
                    {FieldIcon && (
                      <FieldIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    )}
                    <input
                      type={f.type ?? "text"}
                      step={f.step}
                      {...commonProps}
                      className={`h-14 ${inputClasses}`}
                    />
                  </div>
                )}
              </label>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-5 dark:border-border dark:bg-muted/10 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 dark:border-border dark:text-muted-foreground dark:hover:bg-muted"
          >
            <X className="h-4 w-4" /> Annuler
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitText}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
