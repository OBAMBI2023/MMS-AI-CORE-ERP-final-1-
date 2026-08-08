import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Users, User, UserPlus, Mail, Phone, MapPin, Pencil, Trash2, Eye, Printer, FileText, FileSpreadsheet, Download, CalendarDays } from "lucide-react";
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
import { formatDate } from "@/lib/mms/format";

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  [k: string]: unknown;
}

const fields: FieldDef[] = [
  { name: "name", label: "Nom", required: true, colSpan: 2, icon: User },
  { name: "phone", label: "Téléphone", type: "tel", icon: Phone },
  { name: "email", label: "Email", type: "email", icon: Mail },
  { name: "address", label: "Adresse", colSpan: 2, icon: MapPin },
  { name: "notes", label: "Notes", type: "textarea", colSpan: 2, icon: FileText },
];

const columns: ColumnDef<Client>[] = [
  { header: "Nom", cell: (r) => <span className="font-medium">{r.name}</span> },
  { header: "Téléphone", cell: (r) => r.phone ?? "-" },
  { header: "Email", cell: (r) => r.email ?? "-" },
  {
    header: "Ajouté le",
    cell: (r) => <span className="text-muted-foreground text-xs">{formatDate(r.created_at)}</span>,
  },
];

const exportColumns: ExportColumn<Client>[] = [
  { header: "Nom", value: (row) => row.name },
  { header: "Téléphone", value: (row) => row.phone },
  { header: "Email", value: (row) => row.email },
  { header: "Adresse", value: (row) => row.address },
  { header: "Ajouté le", value: (row) => formatDate(row.created_at) },
];

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

function ClientCard({ row, actions }: { row: Client; actions: MobileCardActions }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { settings, logoUrl } = useCompanySettings();
  const hasPhone = Boolean(row.phone);

  const exportCtx = {
    filename: `Client_${row.id}`,
    pdfTitle: "Fiche client",
    companySettings: settings,
    logoUrl,
  };

  const details: ResourceCardDetail[] = [
    { icon: Phone, label: "Téléphone", value: row.phone || "—" },
    { icon: Mail, label: "Email", value: row.email || "—" },
    { icon: MapPin, label: "Adresse", value: row.address || "—" },
    { icon: CalendarDays, label: "Ajouté le", value: formatDate(row.created_at) },
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
          className: "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30",
        }}
        title={row.name}
        menuAriaLabel="Menu du client"
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
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-sm font-semibold text-white">
                {getInitials(row.name)}
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate">{row.name}</DialogTitle>
                <DialogDescription>Détails du client</DialogDescription>
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
              <span className="text-muted-foreground">Ajouté le</span>
              <span className="font-medium text-foreground">{formatDate(row.created_at)}</span>
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

export const Route = createFileRoute("/clients")({
  component: ClientsPage,
  head: () => ({
    meta: [
      { title: `Clients — ${PLATFORM_BRANDING.productName}` },
      { name: "description", content: "Répertoire des clients." },
    ],
  }),
});

function ClientsPage() {
  const canExport = useActionPermission("clients.export");
  const { settings, logoUrl, companyName } = useCompanySettings();

  return (
    <AppShell title="Clients" subtitle="Répertoire de vos clients">
      <div className="-m-4 bg-muted/40 p-4 md:-m-8 md:p-8">
        <ResourceTable<Client>
          table="clients"
          singular="Client"
          plural="Clients"
          fields={fields}
          columns={columns}
          searchFields={["name", "phone", "email"]}
          orderBy={{ column: "created_at", ascending: false }}
          deletePermission="clients.delete"
          entityName="clients"
          premiumLayout
          serverPaginated
          serverPageSize={20}
          formVariant="premium"
          formIcon={UserPlus}
          formCreateSubtitle="Ajoutez les informations de votre nouveau client"
          formSubmitLabel="Créer le client"
          renderMobileCard={(row, actions) => <ClientCard row={row} actions={actions} />}
          mobileEmptyState={{
            icon: <Users className="h-10 w-10 text-muted-foreground/50" />,
            title: "Aucun client",
            subtitle: "Ajoutez votre premier client pour commencer.",
          }}
          renderActions={(filtered) =>
            canExport ? (
              <DataExportMenu
                data={filtered}
                columns={exportColumns}
                filename={`Liste_clients_${companyName}`}
                pdfTitle="Liste des clients"
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
