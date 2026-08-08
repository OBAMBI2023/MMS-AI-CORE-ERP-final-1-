import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface MobileEmptyState {
  icon: ReactNode;
  title: string;
  subtitle: string;
}

export type MobileSort = "default" | "name-asc" | "name-desc" | "recent" | "oldest";

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

export interface ServerPaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
}

export interface PremiumResourceListProps<T extends { id: string; [k: string]: unknown }> {
  items: T[];
  isLoading: boolean;
  singular: string;
  plural: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  renderCard: (row: T) => ReactNode;
  emptyState?: MobileEmptyState;
  pageSize?: number;
  actionsSlot?: ReactNode;
  createSlot?: ReactNode;
  nameField?: string;
  nameSortLabel?: string;
  dateField?: string;
  /**
   * Opt-in server-driven pagination. When provided, `items` MUST already be
   * exactly the current page's rows (server-filtered/sorted/paginated) —
   * all internal client-side slicing is skipped and this state drives the
   * pager UI instead. Omit entirely to keep the original, byte-identical
   * client-side pagination behavior (existing consumers are unaffected).
   */
  serverPagination?: ServerPaginationState;
  /** Current sort, only meaningful together with `serverPagination` (the
   * sort menu becomes controlled and calls `onSortChange` instead of
   * re-sorting `items` locally, since the caller owns the server query). */
  sort?: MobileSort;
  onSortChange?: (sort: MobileSort) => void;
}

/**
 * Shared "premium" list chrome: search + sort dropdown, actions/create row, responsive
 * card grid, empty state and pagination. Extracted from ResourceTable's premiumLayout
 * branch so ResourceTable and standalone pages (e.g. Achats, which can't use
 * ResourceTable's flat-field form) render byte-identical lists.
 */
export function PremiumResourceList<T extends { id: string; [k: string]: unknown }>({
  items,
  isLoading,
  singular,
  plural,
  searchValue,
  onSearchChange,
  renderCard,
  emptyState,
  pageSize: pageSizeProp = 10,
  actionsSlot,
  createSlot,
  nameField,
  nameSortLabel = "Nom",
  dateField,
  serverPagination,
  sort: sortProp,
  onSortChange,
}: PremiumResourceListProps<T>) {
  const isServer = Boolean(serverPagination);
  const [localPage, setLocalPage] = useState(1);
  const [localSort, setLocalSort] = useState<MobileSort>("default");

  const sort = isServer ? (sortProp ?? "default") : localSort;
  const setSort = (value: MobileSort) => {
    if (isServer) onSortChange?.(value);
    else setLocalSort(value);
  };

  // Server-paginated mode: `items` is already exactly the current page,
  // filtered/sorted/paginated server-side — no local re-slicing or re-sorting.
  const sorted = useMemo(() => {
    if (isServer || sort === "default") return items;
    const arr = [...items];
    if (sort === "name-asc" && nameField) {
      arr.sort((a, b) => String(a[nameField] ?? "").localeCompare(String(b[nameField] ?? "")));
    } else if (sort === "name-desc" && nameField) {
      arr.sort((a, b) => String(b[nameField] ?? "").localeCompare(String(a[nameField] ?? "")));
    } else if (sort === "recent" && dateField) {
      arr.sort((a, b) => String(b[dateField] ?? "").localeCompare(String(a[dateField] ?? "")));
    } else if (sort === "oldest" && dateField) {
      arr.sort((a, b) => String(a[dateField] ?? "").localeCompare(String(b[dateField] ?? "")));
    }
    return arr;
  }, [items, sort, nameField, dateField, isServer]);

  const pageSize = isServer ? serverPagination!.pageSize : pageSizeProp;
  const page = isServer ? serverPagination!.page : localPage;
  const totalCount = isServer ? serverPagination!.totalCount : sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const setPage = (updater: number | ((p: number) => number)) => {
    const next = typeof updater === "function" ? updater(page) : updater;
    if (isServer) serverPagination!.onPageChange(next);
    else setLocalPage(next);
  };

  useEffect(() => {
    if (!isServer) setLocalPage(1);
  }, [searchValue, sort, isServer]);

  useEffect(() => {
    if (!isServer && page > totalPages) setLocalPage(totalPages);
  }, [isServer, page, totalPages]);

  const pageItems = useMemo(() => {
    if (isServer) return items;
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [isServer, items, sorted, page, pageSize]);

  const effectiveLoading = isLoading || Boolean(serverPagination?.isFetching);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Rechercher un ${singular.toLowerCase()}...`}
            className="w-full rounded-2xl bg-white border border-gray-200 pl-10 pr-4 py-3 text-sm shadow-sm outline-none transition-colors focus:border-primary/40 dark:bg-card dark:border-border"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Filtrer et trier"
              className="inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-muted-foreground shadow-sm transition-colors duration-200 hover:bg-muted hover:text-foreground dark:bg-card dark:border-border"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSort("default")}>
              {sort === "default" ? <Check className="h-4 w-4" /> : <span className="w-4" />} Par
              défaut
            </DropdownMenuItem>
            {nameField && (
              <>
                <DropdownMenuItem onClick={() => setSort("name-asc")}>
                  {sort === "name-asc" ? <Check className="h-4 w-4" /> : <span className="w-4" />}{" "}
                  {nameSortLabel} (A → Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort("name-desc")}>
                  {sort === "name-desc" ? <Check className="h-4 w-4" /> : <span className="w-4" />}{" "}
                  {nameSortLabel} (Z → A)
                </DropdownMenuItem>
              </>
            )}
            {dateField && (
              <>
                <DropdownMenuItem onClick={() => setSort("recent")}>
                  {sort === "recent" ? <Check className="h-4 w-4" /> : <span className="w-4" />} Plus
                  récents
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort("oldest")}>
                  {sort === "oldest" ? <Check className="h-4 w-4" /> : <span className="w-4" />} Plus
                  anciens
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(actionsSlot || createSlot) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {actionsSlot && <div className="flex flex-1 items-center gap-2">{actionsSlot}</div>}
          {createSlot}
        </div>
      )}

      {effectiveLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 px-6 text-center">
          {emptyState?.icon}
          <p className="font-medium text-foreground">{emptyState?.title ?? `Aucun ${plural.toLowerCase()}`}</p>
          <p className="max-w-[26ch] text-sm text-muted-foreground">
            {emptyState?.subtitle ??
              (searchValue ? "Aucun résultat pour cette recherche." : "Rien à afficher pour l'instant.")}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pageItems.map((row) => (
              <div key={row.id}>{renderCard(row)}</div>
            ))}
          </div>

          <div className="mt-5 flex flex-col items-center gap-3 pb-1">
            <p className="text-sm text-muted-foreground">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} sur{" "}
              {totalCount} {plural.toLowerCase()}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Page précédente"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {getPageWindow(page, totalPages).map((p, i) =>
                  p === "ellipsis" ? (
                    <span key={`e-${i}`} className="px-1 text-sm text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      aria-current={p === page ? "page" : undefined}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors duration-200 ${
                        p === page
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
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
  );
}
