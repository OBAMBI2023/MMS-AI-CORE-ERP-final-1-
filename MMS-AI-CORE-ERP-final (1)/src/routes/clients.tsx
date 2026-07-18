import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/mms/AppShell";
import { ResourceTable, type FieldDef, type ColumnDef } from "@/components/mms/ResourceTable";
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
  { name: "name", label: "Nom", required: true, colSpan: 2 },
  { name: "phone", label: "Téléphone", type: "tel" },
  { name: "email", label: "Email", type: "email" },
  { name: "address", label: "Adresse", colSpan: 2 },
  { name: "notes", label: "Notes", type: "textarea" },
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

export const Route = createFileRoute("/clients")({
  component: ClientsPage,
  head: () => ({
    meta: [
      { title: "Clients — MMS AI CORE" },
      { name: "description", content: "Répertoire des clients." },
    ],
  }),
});

function ClientsPage() {
  return (
    <AppShell title="Clients" subtitle="Répertoire de vos clients">
      <ResourceTable<Client>
        table="clients"
        singular="Client"
        plural="Clients"
        fields={fields}
        columns={columns}
        searchFields={["name", "phone", "email"]}
        orderBy={{ column: "created_at", ascending: false }}
      />
    </AppShell>
  );
}
