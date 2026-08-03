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
import { tenantFromSettings } from "@/lib/mms/PdfTheme";
import { PdfLayoutEngine } from "@/lib/mms/PdfLayoutEngine";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { useExpenseCategories, useExpenseCategoryMutations } from "@/hooks/use-expense-categories";
import { ExpenseCategoriesManager } from "@/components/mms/ExpenseCategoriesManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Depense {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  paid_at: string;
  payment_method: string | null;
  room_id: string | null;
  category_id: string | null;
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

const trailingFields: FieldDef[] = [
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
  const { tenant, profile } = useTenant();
  const isHotel = (tenant as { platform_type?: string } | null)?.platform_type === "HOTEL";
  const [allocationFilter, setAllocationFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const customCategories = useExpenseCategories();
  const categoryMutations = useExpenseCategoryMutations();
  const roomsQuery = useQuery({
    queryKey: ["hotel-expense-rooms", profile?.tenant_id],
    enabled: isHotel && Boolean(profile?.tenant_id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("hotel_rooms")
        .select("id,number").eq("tenant_id", profile!.tenant_id).order("number");
      if (error) throw error;
      return (data ?? []) as { id: string; number: string }[];
    },
  });
  const rooms = roomsQuery.data ?? [];
  const roomNames = useMemo(() => new Map(rooms.map((room) => [room.id, room.number])), [rooms]);
  const categoryField = useMemo<FieldDef>(() => ({
    name: "category", label: "Catégorie", type: "select", required: true,
    options: [
      ...CATEGORIES,
      ...(customCategories.data ?? []).map((category) => ({ value: `custom:${category.id}`, label: category.name })),
    ],
    createOption: {
      label: "+ Nouvelle catégorie",
      inputLabel: "Nom de la catégorie",
      onCreate: async (name) => {
        const created = await categoryMutations.create.mutateAsync(name);
        return { value: `custom:${created.id}`, label: created.name };
      },
    },
  }), [categoryMutations.create, customCategories.data]);
  const fields = useMemo<FieldDef[]>(() => isHotel ? [
    { name: "allocation", label: "Affectation", type: "select", options: ["Générale", "Liée à un logement"], required: true },
    { name: "room_id", label: "Logement", type: "select", options: rooms.map((room) => ({ value: room.id, label: room.number })), hidden: (values) => values.allocation !== "Liée à un logement", requiredWhen: (values) => values.allocation === "Liée à un logement" },
    categoryField,
    ...trailingFields,
  ] : [categoryField, ...trailingFields], [categoryField, isHotel, rooms]);
  const displayedColumns = useMemo<ColumnDef<Depense>[]>(() => isHotel ? [
    ...columns.slice(0, 2),
    { header: "Logement", cell: (row) => row.room_id ? (roomNames.get(row.room_id) ?? "Logement indisponible") : "Général" },
    ...columns.slice(2),
  ] : columns, [isHotel, roomNames]);

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
    PdfLayoutEngine.footer(doc, tenantFromSettings(settings, logoUrl));

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
        columns={displayedColumns}
        searchFields={["category", "description"]}
        orderBy={{ column: "paid_at", ascending: false }}
        defaultValues={
          { category: "Général", paid_at: today, payment_method: "Espèces", allocation: "Générale", room_id: null } as Partial<Depense>
        }
        prepareCreatePayload={(values) => {
          const { allocation: _allocation, ...payload } = values;
          const customId = typeof values.category === "string" && values.category.startsWith("custom:") ? values.category.slice(7) : null;
          const customName = customCategories.data?.find((category) => category.id === customId)?.name;
          const normalized = { ...payload, category_id: customId, category: customName ?? values.category };
          return isHotel ? { ...normalized, room_id: values.allocation === "Liée à un logement" ? values.room_id : null } : normalized;
        }}
        prepareEditValues={(row) => ({ ...row, category: row.category_id ? `custom:${row.category_id}` : row.category, allocation: row.room_id ? "Liée à un logement" : "Générale" })}
        prepareEditPayload={(values) => {
          const { allocation: _allocation, ...payload } = values;
          const customId = typeof values.category === "string" && values.category.startsWith("custom:") ? values.category.slice(7) : null;
          const customName = customCategories.data?.find((category) => category.id === customId)?.name;
          const normalized = { ...payload, category_id: customId, category: customName ?? values.category };
          return isHotel ? { ...normalized, room_id: values.allocation === "Liée à un logement" ? values.room_id : null } : normalized;
        }}
        saveErrorMessage={(error) => {
          const databaseError = error as { code?: string; message?: string };
          if (databaseError.code === "23503" && databaseError.message?.includes("depenses_room_id_tenant_id_fkey")) {
            return "Le logement sélectionné est invalide ou n’appartient pas à votre établissement.";
          }
          return databaseError.message ?? "Impossible d’enregistrer la dépense.";
        }}
        filterRows={(row) => !isHotel || ((allocationFilter === "all" || (allocationFilter === "general" ? !row.room_id : Boolean(row.room_id))) && (roomFilter === "all" || row.room_id === roomFilter))}
        deletePermission="depenses.delete"
        entityName="depenses"
        renderActions={(data) => (
          <div className="flex flex-wrap items-center gap-2">
          <ExpenseCategoriesManager />
          {isHotel && <>
            <Select value={allocationFilter} onValueChange={setAllocationFilter}>
              <SelectTrigger aria-label="Filtrer par affectation" className="h-9 w-full min-w-[190px] rounded-xl border-input bg-background text-foreground hover:bg-accent sm:w-auto [&>svg]:text-foreground">
                <SelectValue placeholder="Toutes les affectations" />
              </SelectTrigger>
              <SelectContent className="border-input bg-popover text-popover-foreground">
                <SelectItem value="all">Toutes les affectations</SelectItem>
                <SelectItem value="general">Générales</SelectItem>
                <SelectItem value="room">Liées à un logement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger aria-label="Filtrer par logement" className="h-9 w-full min-w-[180px] rounded-xl border-input bg-background text-foreground hover:bg-accent sm:w-auto [&>svg]:text-foreground">
                <SelectValue placeholder="Tous les logements" />
              </SelectTrigger>
              <SelectContent className="border-input bg-popover text-popover-foreground">
                <SelectItem value="all">Tous les logements</SelectItem>
                {rooms.map((room) => <SelectItem key={room.id} value={room.id}>{room.number}</SelectItem>)}
              </SelectContent>
            </Select>
          </>}
          {canExport && (
            <button
              onClick={() => exportPDF(data)}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-300 text-gray-700 px-4 py-2 text-sm font-medium hover:text-blue-600 hover:border-blue-600 transition-colors"
            >
              <FileText className="h-4 w-4" /> Exporter PDF
            </button>
          )}
          </div>
        )}
      />
    </AppShell>
  );
}
