import { createFileRoute } from "@tanstack/react-router";
import { PLATFORM_BRANDING } from "@/config/branding";
import { AppShell } from "@/components/mms/AppShell";
import { ResourceTable, type FieldDef, type ColumnDef } from "@/components/mms/ResourceTable";
import { DataExportMenu, type ExportColumn } from "@/components/mms/DataExportMenu";
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
    <AppShell title="Fournisseurs" subtitle="Vos partenaires et prestataires">
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
        renderActions={(filtered) =>
          canExport ? (
            <DataExportMenu
              data={filtered}
              columns={exportColumns}
              filename={`Liste_fournisseurs_${companyName}`}
              pdfTitle="Liste des fournisseurs"
              companySettings={settings}
              logoUrl={logoUrl}
            />
          ) : null
        }
      />
    </AppShell>
  );
}
