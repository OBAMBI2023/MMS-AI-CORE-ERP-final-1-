import { createFileRoute } from "@tanstack/react-router";
import { Building2, Mail, MoreVertical, Pencil, Phone, Trash2 } from "lucide-react";
import { PLATFORM_BRANDING } from "@/config/branding";
import { AppShell } from "@/components/mms/AppShell";
import {
  ResourceTable,
  type FieldDef,
  type ColumnDef,
  type MobileCardActions,
} from "@/components/mms/ResourceTable";
import { DataExportMenu, type ExportColumn } from "@/components/mms/DataExportMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { formatCurrency, formatDate } from "@/lib/mms/format";

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

const exportValue = (row: Fournisseur, ...keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return "";
};

const exportColumns: ExportColumn<Fournisseur>[] = [
  { header: "Nom", value: (row) => row.name },
  { header: "Entreprise", value: (row) => String(exportValue(row, "company", "company_name", "entreprise")) },
  { header: "Téléphone", value: (row) => row.phone },
  { header: "Email", value: (row) => row.email },
  { header: "Adresse", value: (row) => row.address },
  { header: "Ville", value: (row) => String(exportValue(row, "city", "ville")) },
  { header: "Pays", value: (row) => String(exportValue(row, "country", "pays")) },
  {
    header: "Solde",
    value: (row) => {
      const rawBalance = exportValue(row, "balance", "solde");
      if (rawBalance === "") return "";
      const balance = Number(rawBalance);
      return Number.isFinite(balance) ? formatCurrency(balance) : String(rawBalance);
    },
  },
  { header: "Statut", value: (row) => String(exportValue(row, "status", "statut")) },
  { header: "Date de création", value: (row) => formatDate(row.created_at) },
];

const fields: FieldDef[] = [
  { name: "name", label: "Nom", required: true, colSpan: 2 },
  { name: "phone", label: "Téléphone", type: "tel" },
  { name: "email", label: "Email", type: "email" },
  { name: "address", label: "Adresse", colSpan: 2 },
  { name: "notes", label: "Notes", type: "textarea" },
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

function FournisseurMobileCard({
  row,
  actions,
}: {
  row: Fournisseur;
  actions: MobileCardActions;
}) {
  const hasPhone = Boolean(row.phone);

  return (
    <div className="rounded-[18px] border border-border bg-white p-[18px] shadow-sm shadow-slate-900/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] dark:bg-card dark:shadow-none">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-sm font-semibold text-white shadow-sm shadow-blue-500/30">
          {getInitials(row.name)}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-[18px] font-semibold leading-tight text-foreground">
            {row.name}
          </h3>
          <div className="mt-2 space-y-1.5">
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {row.phone || "—"}
            </p>
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {row.email || "—"}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Menu du fournisseur"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.canEdit && (
              <DropdownMenuItem onClick={actions.onEdit}>
                <Pencil className="h-4 w-4" /> Modifier
              </DropdownMenuItem>
            )}
            {hasPhone && (
              <DropdownMenuItem asChild>
                <a href={`tel:${row.phone}`}>
                  <Phone className="h-4 w-4" /> Appeler
                </a>
              </DropdownMenuItem>
            )}
            {actions.canDelete && (
              <DropdownMenuItem
                onClick={actions.onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1 border-t border-border pt-3">
        {actions.canEdit && (
          <button
            type="button"
            onClick={actions.onEdit}
            className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground active:bg-muted/80"
          >
            <Pencil className="h-4 w-4" /> Modifier
          </button>
        )}
        <a
          href={hasPhone ? `tel:${row.phone}` : undefined}
          onClick={(e) => {
            if (!hasPhone) e.preventDefault();
          }}
          className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-colors duration-200 ${
            hasPhone
              ? "text-primary hover:bg-primary/10 active:bg-primary/15"
              : "cursor-not-allowed text-muted-foreground/40"
          }`}
        >
          <Phone className="h-4 w-4" /> Appeler
        </a>
        {actions.canDelete && (
          <button
            type="button"
            onClick={actions.onDelete}
            className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive active:bg-destructive/15"
          >
            <Trash2 className="h-4 w-4" /> Supprimer
          </button>
        )}
      </div>
    </div>
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

  return (
    <AppShell title="Fournisseurs" subtitle="Gérez vos fournisseurs">
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
        renderMobileCard={(row, actions) => <FournisseurMobileCard row={row} actions={actions} />}
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
              triggerClassName="w-full justify-center gap-2 rounded-xl sm:w-auto"
            />
          ) : null
        }
      />
    </AppShell>
  );
}
