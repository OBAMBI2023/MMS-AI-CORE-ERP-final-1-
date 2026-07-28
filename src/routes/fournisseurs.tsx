import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/mms/AppShell";
import { ResourceTable, type FieldDef, type ColumnDef } from "@/components/mms/ResourceTable";
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
      { title: "Fournisseurs — AUREX ERP" },
      { name: "description", content: "Répertoire des fournisseurs." },
    ],
  }),
});

function FournisseursPage() {
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
      />
    </AppShell>
  );
}
