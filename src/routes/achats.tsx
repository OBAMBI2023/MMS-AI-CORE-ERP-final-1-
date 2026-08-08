import { createFileRoute } from "@tanstack/react-router";
import { PLATFORM_BRANDING } from "@/config/branding";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ShoppingCart,
  Pencil,
  Trash2,
  Eye,
  Printer,
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  Hash,
  ListOrdered,
  Loader2,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { LineItemsDialog } from "@/components/mms/LineItemsDialog";
import { PremiumResourceList, type MobileSort } from "@/components/mms/PremiumResourceList";
import { usePaginatedTable, useDebouncedValue, fetchAllMatching } from "@/hooks/use-paginated-table";
import { ResourceCard, type ResourceCardDetail, type ResourceCardMenuAction } from "@/components/mms/ResourceCard";
import {
  DataExportMenu,
  exportRowsToPdf,
  exportRowsToXlsx,
  exportRowsToCsv,
  type ExportColumn,
} from "@/components/mms/DataExportMenu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/mms/format";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { usePermissions } from "@/hooks/use-permissions";
import { useActionPermission } from "@/hooks/use-action-permission";
import { logAction } from "@/lib/audit.server";
import { useTenant } from "@/providers/TenantProvider";

interface Achat {
  id: string;
  number: string;
  fournisseur_name: string | null;
  total: number;
  created_at: string;
  [k: string]: unknown;
}

interface AchatItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  line_total: number;
  unit: string | null;
}

export const Route = createFileRoute("/achats")({
  component: AchatsPage,
  head: () => ({
    meta: [
      { title: `Achats — ${PLATFORM_BRANDING.productName}` },
      { name: "description", content: "Suivi des achats fournisseurs." },
    ],
  }),
});

function AchatCard({
  row,
  lineCount,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  exportColumns,
}: {
  row: Achat;
  lineCount: number;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  exportColumns: ExportColumn<Achat>[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { settings, logoUrl } = useCompanySettings();

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["achat_items", row.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achat_items")
        .select("id, name, qty, price, line_total, unit")
        .eq("achat_id", row.id);
      if (error) throw error;
      return (data ?? []) as AchatItem[];
    },
    enabled: detailsOpen,
  });

  const exportCtx = {
    filename: `Achat_${row.number}`,
    pdfTitle: "Bon d'achat",
    companySettings: settings,
    logoUrl,
  };

  const title = row.fournisseur_name?.trim() || "Achat sans fournisseur";

  const details: ResourceCardDetail[] = [
    { icon: Calendar, label: "Date", value: formatDateTime(row.created_at) },
    { icon: Building2, label: "Fournisseur", value: row.fournisseur_name || "—" },
    { icon: Hash, label: "Numéro", value: row.number },
    { icon: ListOrdered, label: "Nombre de lignes", value: lineCount },
  ];

  const menuActions: ResourceCardMenuAction[] = [
    { key: "details", icon: Eye, label: "Voir détails", onClick: () => setDetailsOpen(true) },
    { key: "pdf", icon: FileText, label: "Exporter PDF", onClick: () => void exportRowsToPdf([row], exportColumns, exportCtx) },
    { key: "xlsx", icon: FileSpreadsheet, label: "Exporter Excel", onClick: () => exportRowsToXlsx([row], exportColumns, exportCtx) },
    { key: "csv", icon: Download, label: "Exporter CSV", onClick: () => exportRowsToCsv([row], exportColumns, exportCtx) },
  ];
  if (canDelete) {
    menuActions.push({ key: "delete", icon: Trash2, label: "Supprimer", onClick: onDelete, destructive: true });
  }

  return (
    <>
      <ResourceCard
        leading={{ variant: "icon", icon: ShoppingCart, className: "bg-blue-500" }}
        title={title.toUpperCase()}
        badge={{ label: row.number, className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" }}
        headerInfo={{ value: formatCurrency(Number(row.total)), className: "text-primary" }}
        menuAriaLabel="Menu de l'achat"
        menuActions={menuActions}
        details={details}
        footerActions={[
          {
            key: "edit",
            icon: Pencil,
            label: "Modifier",
            onClick: onEdit,
            colorClass:
              "text-blue-600 hover:bg-blue-50 active:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-500/10",
            disabled: !canEdit,
          },
          {
            key: "print",
            icon: Printer,
            label: "Imprimer",
            onClick: () =>
              void exportRowsToPdf([row], exportColumns, { ...exportCtx, successMessage: "Impression lancée" }),
            colorClass:
              "text-gray-600 hover:bg-gray-50 active:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-500/10",
          },
          {
            key: "delete",
            icon: Trash2,
            label: "Supprimer",
            onClick: onDelete,
            colorClass: "text-red-600 hover:bg-red-50 active:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/10",
            disabled: !canDelete,
          },
        ]}
      />

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate">{title}</DialogTitle>
                <DialogDescription>Achat {row.number}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium text-foreground">{formatDateTime(row.created_at)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Total</span>
              <span className="text-base font-bold text-primary">{formatCurrency(Number(row.total))}</span>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Lignes d'achat
              </p>
              {itemsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune ligne.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.qty} {item.unit || "unité"} × {formatCurrency(Number(item.price))}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-foreground">
                        {formatCurrency(Number(item.line_total))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AchatsPage() {
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<MobileSort>("default");
  const pageSize = 20;
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { settings, logoUrl, companyName } = useCompanySettings(tenantLoading ? null : tenantId);
  const { data: userData } = useQuery({ queryKey: ["user"], queryFn: () => supabase.auth.getUser() });
  const permissionsQuery = usePermissions();
  const { roleId } = permissionsQuery.data || { roleId: null };
  const userId = userData?.data?.user?.id;
  const canDeleteAchat = useActionPermission("achats.delete");
  const canCreateAchat = useActionPermission("achats.create");
  const canExportAchat = useActionPermission("achats.export");

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, sort]);

  const orderBy = useMemo(() => {
    if (sort === "name-asc") return { column: "fournisseur_name", ascending: true };
    if (sort === "name-desc") return { column: "fournisseur_name", ascending: false };
    if (sort === "oldest") return { column: "created_at", ascending: true };
    return { column: "created_at", ascending: false };
  }, [sort]);

  const listQuery = usePaginatedTable<Achat>({
    table: "achats",
    tenantId,
    searchFields: ["number", "fournisseur_name"],
    search: debouncedQ,
    orderBy,
    page,
    pageSize,
    enabled: !tenantLoading,
  });
  const data = listQuery.data?.rows ?? [];
  const totalCount = listQuery.data?.count ?? 0;
  const isLoading = listQuery.isLoading;

  const { data: lineCounts = {} } = useQuery({
    queryKey: ["achat_items_counts", tenantId],
    queryFn: async () => {
      // Server-side GROUP BY (get_achat_items_counts) instead of fetching
      // every achat_items row and counting in the browser.
      const { data, error } = await (supabase as any).rpc("get_achat_items_counts");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { achat_id: string; items_count: number }[]) {
        counts[row.achat_id] = Number(row.items_count);
      }
      return counts;
    },
    enabled: !tenantLoading && Boolean(tenantId),
  });

  const exportColumns: ExportColumn<Achat>[] = [
    { header: "Numéro", value: (row) => row.number },
    { header: "Fournisseur", value: (row) => row.fournisseur_name ?? "-" },
    { header: "Date", value: (row) => formatDateTime(row.created_at) },
    { header: "Nombre de lignes", value: (row) => lineCounts[row.id] ?? 0 },
    { header: "Total", value: (row) => formatCurrency(Number(row.total)) },
  ];

  const del = useMutation({
    mutationFn: async (achat: Achat) => {
      if (!tenantId) throw new Error("Locataire introuvable");
      const { error } = await (supabase
        .from("achats")
        .delete() as any)
        .eq("id", achat.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return achat;
    },
    onSuccess: async (achat) => {
      if (userId) {
        await logAction(userId, roleId ?? null, "delete", "achats", {
          achat_number: achat.number,
        });
      }
      toast.success("Achat supprimé");
      qc.invalidateQueries({ queryKey: ["achats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportSource = () =>
    fetchAllMatching<Achat>({
      table: "achats",
      tenantId,
      searchFields: ["number", "fournisseur_name"],
      search: debouncedQ,
      orderBy,
    });

  return (
    <AppShell title="Achats" subtitle="Approvisionnements et commandes fournisseurs">
      <div className="-m-4 bg-muted/40 p-4 md:-m-8 md:p-8">
        <PremiumResourceList<Achat>
          items={data}
          isLoading={isLoading}
          singular="Achat"
          plural="Achats"
          searchValue={q}
          onSearchChange={setQ}
          nameField="fournisseur_name"
          nameSortLabel="Fournisseur"
          dateField="created_at"
          serverPagination={{
            page,
            pageSize,
            totalCount,
            onPageChange: setPage,
            isFetching: listQuery.isFetching,
          }}
          sort={sort}
          onSortChange={setSort}
          emptyState={{
            icon: <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />,
            title: "Aucun achat",
            subtitle: "Ajoutez votre premier achat pour commencer.",
          }}
          actionsSlot={
            canExportAchat ? (
              <DataExportMenu
                data={exportSource}
                columns={exportColumns}
                filename={`Liste_achats_${companyName}`}
                pdfTitle="Liste des achats"
                companySettings={settings}
                logoUrl={logoUrl}
                triggerVariant="outline"
                triggerClassName="w-full min-h-[44px] justify-center gap-2 rounded-xl border-gray-300 bg-white text-gray-700 shadow-sm hover:border-blue-600 hover:bg-white hover:text-blue-600 dark:bg-card sm:w-auto"
              />
            ) : undefined
          }
          createSlot={
            canCreateAchat ? (
              <button
                onClick={() => setCreating(true)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-500/25 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/30 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Nouvel achat
              </button>
            ) : undefined
          }
          renderCard={(row) => (
            <AchatCard
              row={row}
              lineCount={lineCounts[row.id] ?? 0}
              canEdit
              canDelete={canDeleteAchat}
              onEdit={() => setEditId(row.id)}
              onDelete={() => {
                if (confirm("Supprimer cet achat ?")) del.mutate(row);
              }}
              exportColumns={exportColumns}
            />
          )}
        />
      </div>

      <AnimatePresence>
        {(creating || editId) && (
          <LineItemsDialog
            headerTable="achats"
            itemsTable="achat_items"
            fkColumn="achat_id"
            partnerTable="fournisseurs"
            partnerLabel="Fournisseur"
            numberPrefix="ACH"
            singular="Achat"
            tenantId={tenantId}
            initialId={editId}
            onClose={() => {
              setEditId(null);
              setCreating(false);
            }}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
