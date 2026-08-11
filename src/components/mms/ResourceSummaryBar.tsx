/**
 * Compact summary bar shown between a module's search/filter bar and its
 * list/grid: "N <items> • <totalLabel> : X FCFA" plus a "a–b sur N <items>"
 * pagination line. Visually matches the bar first built for Dépenses
 * (src/routes/depenses.tsx) — kept as a separate shared component so Achats,
 * Devis, Clients (and future modules) stay pixel-consistent with each other
 * without each page re-implementing the same markup.
 *
 * Purely presentational: every number it renders must already be computed
 * server-side (RPC/aggregate query) by the caller — this component never
 * sums or counts anything itself.
 */
export function ResourceSummaryBar({
  count,
  page,
  pageSize,
  itemLabelSingular,
  itemLabelPlural,
  total,
  totalLabel = "Total",
  totalLoading = false,
}: {
  count: number;
  page: number;
  pageSize: number;
  itemLabelSingular: string;
  itemLabelPlural: string;
  /** Omit entirely for count-only modules (e.g. Clients) — no amount line is rendered. */
  total?: number;
  totalLabel?: string;
  totalLoading?: boolean;
}) {
  const itemLabel = count === 1 ? itemLabelSingular : itemLabelPlural;
  const rangeStart = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, count);

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-foreground">
          {formatThousands(count)} {itemLabel}
        </span>
        {total !== undefined && (
          <>
            <span className="text-muted-foreground" aria-hidden="true">
              •
            </span>
            <span className="text-muted-foreground">
              {totalLabel} :{" "}
              <span className="font-semibold text-foreground">
                {totalLoading ? "…" : `${formatThousands(total)} FCFA`}
              </span>
            </span>
          </>
        )}
      </div>
      {count > 0 && (
        <span className="text-xs text-muted-foreground">
          {formatThousands(rangeStart)}–{formatThousands(rangeEnd)} sur {formatThousands(count)}{" "}
          {itemLabel}
        </span>
      )}
    </div>
  );
}

export function formatThousands(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}
