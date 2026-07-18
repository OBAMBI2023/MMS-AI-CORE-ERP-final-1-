import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/mms/AppShell";
import { ResourceTable, type FieldDef, type ColumnDef } from "@/components/mms/ResourceTable";
import { formatFCFA, formatDate } from "@/lib/mms/format";

interface Depense {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  paid_at: string;
  payment_method: string | null;
  created_at: string;
  [k: string]: unknown;
}

const CATEGORIES = [
  "Général",
  "Loyer",
  "Électricité",
  "Consommables",
  "Transport",
  "Salaires",
  "Marketing",
  "Autre",
] as const;
const METHODS = ["Espèces", "Wave", "Orange Money", "Carte", "Virement"] as const;

const fields: FieldDef[] = [
  { name: "category", label: "Catégorie", type: "select", options: CATEGORIES, required: true },
  { name: "amount", label: "Montant (FCFA)", type: "number", required: true, step: "1" },
  { name: "paid_at", label: "Date", type: "date", required: true },
  { name: "payment_method", label: "Mode de paiement", type: "select", options: METHODS },
  { name: "description", label: "Description", type: "textarea" },
];

const columns: ColumnDef<Depense>[] = [
  { header: "Date", cell: (r) => formatDate(r.paid_at) },
  {
    header: "Catégorie",
    cell: (r) => (
      <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
        {r.category}
      </span>
    ),
  },
  { header: "Description", cell: (r) => r.description ?? "-" },
  { header: "Mode", cell: (r) => r.payment_method ?? "-" },
  {
    header: "Montant",
    cell: (r) => (
      <span className="font-semibold text-destructive">-{formatFCFA(Number(r.amount))}</span>
    ),
  },
];

export const Route = createFileRoute("/depenses")({
  component: DepensesPage,
  head: () => ({
    meta: [
      { title: "Dépenses — MMS AI CORE" },
      { name: "description", content: "Suivi des dépenses." },
    ],
  }),
});

function DepensesPage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <AppShell title="Dépenses" subtitle="Sorties de caisse et charges">
      <ResourceTable<Depense>
        table="depenses"
        singular="Dépense"
        plural="Dépenses"
        fields={fields}
        columns={columns}
        searchFields={["category", "description"]}
        orderBy={{ column: "paid_at", ascending: false }}
        defaultValues={
          { category: "Général", paid_at: today, payment_method: "Espèces" } as Partial<Depense>
        }
      />
    </AppShell>
  );
}
