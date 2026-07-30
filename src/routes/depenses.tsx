import { createFileRoute } from "@tanstack/react-router";
import { PLATFORM_BRANDING } from "@/config/branding";
import { AppShell } from "@/components/mms/AppShell";
import { ResourceTable, type FieldDef, type ColumnDef } from "@/components/mms/ResourceTable";
import { formatCurrency, formatDate, getCurrency } from "@/lib/mms/format";
import { jsPDF } from "jspdf";
import { downloadPdf } from "@/lib/mms/download-pdf";
import {
  renderDepensesHeader,
  renderDepensesTable,
  renderDepensesTotals,
} from "@/lib/mms/pdf-template-engine";
import { renderPdfFooter, tenantFromSettings } from "@/lib/mms/PdfTheme";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useActionPermission } from "@/hooks/use-action-permission";

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
  { name: "amount", label: `Montant (${getCurrency()})`, type: "number", required: true, step: "1" },
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
      <span className="font-semibold text-destructive">-{formatCurrency(Number(r.amount))}</span>
    ),
  },
];

export const Route = createFileRoute("/depenses")({
  component: DepensesPage,
  head: () => ({
    meta: [
      { title: `Dépenses — ${PLATFORM_BRANDING.productName}` },
      { name: "description", content: "Suivi des dépenses." },
    ],
  }),
});

function DepensesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const { settings, logoUrl } = useCompanySettings();
  const canExport = useActionPermission("depenses.export");

  const exportPDF = async (data: Depense[]) => {
    if (data.length === 0) {
      toast.error("Aucune dépense à exporter.");
      return;
    }
    if (!settings) {
      toast.error("Paramètres de l'entreprise non chargés.");
      return;
    }

    const doc = new jsPDF();
    const total = data.reduce((acc, d) => acc + Number(d.amount), 0);

    const startY = await renderDepensesHeader(doc, settings, logoUrl);

    renderDepensesTable(
      doc,
      data.map((d) => ({
        date: formatDate(d.paid_at),
        category: d.category,
        description: d.description,
        payment_method: d.payment_method,
        amount: formatCurrency(Number(d.amount)),
      })),
      startY + 10,
    );

    renderDepensesTotals(doc, formatCurrency(total), 0);
    renderPdfFooter(doc, tenantFromSettings(settings, logoUrl));

    await downloadPdf(doc, `Depenses_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF généré.");
  };

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
        deletePermission="depenses.delete"
        entityName="depenses"
        renderActions={(data) => (
          canExport && (
            <button
              onClick={() => exportPDF(data)}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-300 text-gray-700 px-4 py-2 text-sm font-medium hover:text-blue-600 hover:border-blue-600 transition-colors"
            >
              <FileText className="h-4 w-4" /> Exporter PDF
            </button>
          )
        )}
      />
    </AppShell>
  );
}
