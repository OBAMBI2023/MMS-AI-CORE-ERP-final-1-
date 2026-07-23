import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/mms/AppShell";
import { ResourceTable, type FieldDef, type ColumnDef } from "@/components/mms/ResourceTable";
import { formatCurrency } from "@/lib/mms/format";

interface Service {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  active: boolean;
  created_at: string;
  [k: string]: unknown;
}

const CATEGORIES = ["Impression", "Copie", "Reliure", "Finition", "Numérique", "Autre"] as const;

const fields: FieldDef[] = [
  { name: "name", label: "Nom du service", required: true, colSpan: 2 },
  { name: "category", label: "Catégorie", type: "select", options: CATEGORIES, required: true },
  { name: "unit", label: "Unité", placeholder: "page, unité, lot..." },
  { name: "price", label: "Prix (FCFA)", type: "number", required: true, step: "1" },
];

const columns: ColumnDef<Service>[] = [
  { header: "Service", cell: (r) => <span className="font-medium">{r.name}</span> },
  {
    header: "Catégorie",
    cell: (r) => (
      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
        {r.category}
      </span>
    ),
  },
  { header: "Unité", cell: (r) => r.unit },
  {
    header: "Prix",
    cell: (r) => (
      <span className="font-semibold text-primary">{formatCurrency(Number(r.price))}</span>
    ),
  },
];

export const Route = createFileRoute("/services")({
  component: ServicesPage,
  head: () => ({
    meta: [
      { title: "Produits & Services — MMS AI CORE" },
      { name: "description", content: "Catalogue des services et produits." },
    ],
  }),
});

function ServicesPage() {
  return (
    <AppShell
      title="Produits & Services"
      subtitle="Catalogue des prestations proposées au comptoir"
    >
      <ResourceTable<Service>
        table="services"
        singular="Service"
        plural="Produits & Services"
        fields={fields}
        columns={columns}
        searchFields={["name", "category"]}
        orderBy={{ column: "created_at", ascending: false }}
        defaultValues={{ category: "Impression", unit: "unité", active: true } as Partial<Service>}
        deletePermission="services.delete"
        entityName="services"
      />
    </AppShell>
  );
}
