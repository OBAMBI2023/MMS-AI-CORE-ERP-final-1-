import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Trash2,
  Eye,
  Printer,
  FileText,
  FileSpreadsheet,
  Download,
  ShoppingBag,
  History,
} from "lucide-react";
import { PLATFORM_BRANDING } from "@/config/branding";
import { AppShell } from "@/components/mms/AppShell";
import {
  ResourceTable,
  type FieldDef,
  type ColumnDef,
  type MobileCardActions,
} from "@/components/mms/ResourceTable";
import { ResourceCard, type ResourceCardDetail, type ResourceCardMenuAction } from "@/components/mms/ResourceCard";
import {
  DataExportMenu,
  exportRowsToPdf,
  exportRowsToXlsx,
  exportRowsToCsv,
  type ExportColumn,
} from "@/components/mms/DataExportMenu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/mms/format";

interface Fournisseur {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  [k: string]: unknown;
}

interface AchatsStat {
  count: number;
  lastDate: string;
}

const fields: FieldDef[] = [
  { name: "name", label: "Nom", required: true, colSpan: 2, icon: Building2 },
  { name: "phone", label: "Téléphone", type: "tel", icon: Phone },
  { name: "email", label: "Email", type: "email", icon: Mail },
  { name: "address", label: "Adresse", colSpan: 2, icon: MapPin },
  { name: "notes", label: "Notes", type: "textarea", colSpan: 2, icon: FileText },
];

const columns: ColumnDef<Fournisseur>[] = [
  { header: "Nom", cell: (r) => <span className="font-medium">{r.name}</span> },
  { header: "Téléphone", cell: (r) => r.phone ?? "-" },
  { header: "Email", cell: (r) => r.email ?? "-" },
  {
    header: "Ajouté le",
    cell: (r) => <span className="text-muted-foreground text-xs">{formatDate(r.created_at)}</span>,
  },
];

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

function useFournisseursAchatsStats() {
  return useQuery({
    queryKey: ["fournisseurs_achats_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("achats").select("fournisseur_id, created_at");
      if (error) throw error;
      const stats: Record<string, AchatsStat> = {};
      for (const row of data ?? []) {
        if (!row.fournisseur_id) continue;
        const existing = stats[row.fournisseur_id];
        if (!existing) {
          stats[row.fournisseur_id] = { count: 1, lastDate: row.created_at };
        } else {
          existing.count += 1;
          if (row.created_at > existing.lastDate) existing.lastDate = row.created_at;
        }
      }
      return stats;
    },
  });
}

function buildExportColumns(achatsStats: Record<string, AchatsStat>): ExportColumn<Fournisseur>[] {
  return [
    { header: "Nom", value: (row) => row.name },
    { header: "Téléphone", value: (row) => row.phone },
    { header: "Email", value: (row) => row.email },
    { header: "Adresse", value: (row) => row.address },
    { header: "Nombre d'achats", value: (row) => achatsStats[row.id]?.count ?? 0 },
    {
      header: "Dernière opération",
      value: (row) => (achatsStats[row.id] ? formatDate(achatsStats[row.id].lastDate) : "—"),
    },
    { header: "Ajouté le", value: (row) => formatDate(row.created_at) },
  ];
}

function FournisseurCard({
  row,
  actions,
  achatsInfo,
  exportColumns,
}: {
  row: Fournisseur;
  actions: MobileCardActions;
  achatsInfo?: AchatsStat;
  exportColumns: ExportColumn<Fournisseur>[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { settings, logoUrl } = useCompanySettings();
  const hasPhone = Boolean(row.phone);

  const exportCtx = {
    filename: `Fournisseur_${row.id}`,
    pdfTitle: "Fiche fournisseur",
    companySettings: settings,
    logoUrl,
  };

  const details: ResourceCardDetail[] = [
    { icon: Phone, label: "Téléphone", value: row.phone || "—" },
    { icon: Mail, label: "Email", value: row.email || "—" },
    { icon: ShoppingBag, label: "Nombre d'achats", value: achatsInfo?.count ?? 0 },
    { icon: History, label: "Dernière opération", value: achatsInfo ? formatDate(achatsInfo.lastDate) : "—" },
  ];

  const menuActions: ResourceCardMenuAction[] = [
    { key: "details", icon: Eye, label: "Voir détails", onClick: () => setDetailsOpen(true) },
    { key: "pdf", icon: FileText, label: "Exporter PDF", onClick: () => void exportRowsToPdf([row], exportColumns, exportCtx) },
    { key: "xlsx", icon: FileSpreadsheet, label: "Exporter Excel", onClick: () => exportRowsToXlsx([row], exportColumns, exportCtx) },
    { key: "csv", icon: Download, label: "Exporter CSV", onClick: () => exportRowsToCsv([row], exportColumns, exportCtx) },
  ];
  if (hasPhone) {
    menuActions.push({ key: "call", icon: Phone, label: "Appeler", href: `tel:${row.phone}` });
  }
  if (actions.canDelete) {
    menuActions.push({ key: "delete", icon: Trash2, label: "Supprimer", onClick: actions.onDelete, destructive: true });
  }

  return (
    <>
      <ResourceCard
        leading={{
          variant: "avatar",
          initials: getInitials(row.name),
          className: "bg-gradient-to-br from-[#2563EB] to-[#3B82F6] shadow-blue-500/30",
        }}
        title={row.name}
        menuAriaLabel="Menu du fournisseur"
        menuActions={menuActions}
        details={details}
        footerActions={[
          {
            key: "edit",
            icon: Pencil,
            label: "Modifier",
            onClick: actions.onEdit,
            colorClass:
              "text-blue-600 hover:bg-blue-50 active:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-500/10",
            disabled: !actions.canEdit,
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
            onClick: actions.onDelete,
            colorClass: "text-red-600 hover:bg-red-50 active:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/10",
            disabled: !actions.canDelete,
          },
        ]}
      />

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-sm font-semibold text-white">
                {getInitials(row.name)}
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate">{row.name}</DialogTitle>
                <DialogDescription>Détails du fournisseur</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Téléphone</span>
              <span className="font-medium text-foreground">{row.phone || "—"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">{row.email || "—"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Nombre d'achats</span>
              <span className="font-medium text-foreground">{achatsInfo?.count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Dernière opération</span>
              <span className="font-medium text-foreground">
                {achatsInfo ? formatDate(achatsInfo.lastDate) : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Adresse</span>
              <p className="mt-1 font-medium text-foreground">{row.address || "—"}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const Route = createFileRoute("/fournisseurs")({
  component: FournisseursPage,
  head: () => ({
    meta: [
      { title: `Fournisseurs — ${PLATFORM_BRANDING.productName}` },
      { name: "description", content: "Répertoire des fournisseurs." },
    ],
  }),
});

function FournisseursPage() {
  const canExport = useActionPermission("fournisseurs.export");
  const { settings, logoUrl, companyName } = useCompanySettings();
  const { data: achatsStats = {} } = useFournisseursAchatsStats();
  const exportColumns = buildExportColumns(achatsStats);

  return (
    <AppShell title="Fournisseurs" subtitle="Gérez vos fournisseurs">
      <div className="-m-4 bg-muted/40 p-4 md:-m-8 md:p-8">
        <ResourceTable<Fournisseur>
          table="fournisseurs"
          singular="Fournisseur"
          plural="Fournisseurs"
          fields={fields}
          columns={columns}
          searchFields={["name", "phone", "email"]}
          orderBy={{ column: "created_at", ascending: false }}
          deletePermission="fournisseurs.delete"
          entityName="fournisseurs"
          premiumLayout
          formVariant="premium"
          formIcon={Building2}
          formCreateSubtitle="Ajoutez les informations de votre fournisseur"
          formSubmitLabel="Créer le fournisseur"
          renderMobileCard={(row, actions) => (
            <FournisseurCard row={row} actions={actions} achatsInfo={achatsStats[row.id]} exportColumns={exportColumns} />
          )}
          mobileEmptyState={{
            icon: <Building2 className="h-10 w-10 text-muted-foreground/50" />,
            title: "Aucun fournisseur",
            subtitle: "Ajoutez votre premier fournisseur pour commencer.",
          }}
          renderActions={(filtered) =>
            canExport ? (
              <DataExportMenu
                data={filtered}
                columns={exportColumns}
                filename={`Liste_fournisseurs_${companyName}`}
                pdfTitle="Liste des fournisseurs"
                companySettings={settings}
                logoUrl={logoUrl}
                triggerVariant="outline"
                triggerClassName="w-full min-h-[44px] justify-center gap-2 rounded-xl border-gray-300 bg-white text-gray-700 shadow-sm hover:border-blue-600 hover:bg-white hover:text-blue-600 dark:bg-card sm:w-auto"
              />
            ) : null
          }
        />
      </div>
    </AppShell>
  );
}
