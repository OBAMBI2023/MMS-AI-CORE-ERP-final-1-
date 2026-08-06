import { createFileRoute } from "@tanstack/react-router";
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
import { formatCurrency, formatDate, getCurrency } from "@/lib/mms/format";
import {
  Wallet,
  Home,
  Zap,
  Package,
  Truck,
  Megaphone,
  Receipt,
  Banknote,
  Waves,
  CreditCard,
  Landmark,
  Smartphone,
  Calendar,
  Tag,
  AlignLeft,
  Pencil,
  Eye,
  Trash2,
  Printer,
  FileText,
  FileSpreadsheet,
  Download,
  Plus,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useExpenseCategories } from "@/hooks/use-expense-categories";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewExpenseCategoryDialog } from "@/components/mms/NewExpenseCategoryDialog";

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
  {
    name: "category",
    label: "Catégorie",
    required: true,
    render: ({ value, onChange }) => (
      <CategorySelectField value={String(value ?? "")} onChange={onChange} />
    ),
  },
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

const exportColumns: ExportColumn<Depense>[] = [
  { header: "Date", value: (row) => formatDate(row.paid_at) },
  { header: "Catégorie", value: (row) => row.category },
  { header: "Description", value: (row) => row.description ?? "-" },
  { header: "Mode de paiement", value: (row) => row.payment_method ?? "-" },
  { header: "Montant", value: (row) => formatCurrency(Number(row.amount)) },
];

// Presentation-only metadata — purely cosmetic, doesn't touch the data model.
const CATEGORY_STYLES: Record<
  string,
  { icon: LucideIcon; iconBg: string; badgeBg: string; amountColor: string }
> = {
  Général: {
    icon: Receipt,
    iconBg: "bg-slate-500",
    badgeBg: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
    amountColor: "text-slate-700 dark:text-slate-300",
  },
  Loyer: {
    icon: Home,
    iconBg: "bg-violet-500",
    badgeBg: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    amountColor: "text-violet-700 dark:text-violet-300",
  },
  Électricité: {
    icon: Zap,
    iconBg: "bg-amber-500",
    badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    amountColor: "text-amber-700 dark:text-amber-300",
  },
  Consommables: {
    icon: Package,
    iconBg: "bg-teal-500",
    badgeBg: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    amountColor: "text-teal-700 dark:text-teal-300",
  },
  Transport: {
    icon: Truck,
    iconBg: "bg-indigo-500",
    badgeBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    amountColor: "text-indigo-700 dark:text-indigo-300",
  },
  Salaires: {
    icon: Wallet,
    iconBg: "bg-rose-500",
    badgeBg: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    amountColor: "text-rose-600 dark:text-rose-400",
  },
  Marketing: {
    icon: Megaphone,
    iconBg: "bg-pink-500",
    badgeBg: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
    amountColor: "text-pink-700 dark:text-pink-300",
  },
  Autre: {
    icon: ReceiptText,
    iconBg: "bg-gray-400",
    badgeBg: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300",
    amountColor: "text-gray-700 dark:text-gray-300",
  },
};
const DEFAULT_CATEGORY_STYLE = CATEGORY_STYLES.Autre;

const PAYMENT_ICONS: Record<string, LucideIcon> = {
  Espèces: Banknote,
  Wave: Waves,
  "Orange Money": Smartphone,
  Carte: CreditCard,
  Virement: Landmark,
};

const CREATE_CATEGORY_OPTION = "__create_expense_category__";

function CategorySelectField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { data: dbCategories = [] } = useExpenseCategories();
  const [createOpen, setCreateOpen] = useState(false);

  const options = useMemo(() => {
    const byLowerName = new Map<string, string>();
    for (const name of CATEGORIES) byLowerName.set(name.toLowerCase(), name);
    for (const category of dbCategories) byLowerName.set(category.name.toLowerCase(), category.name);
    return Array.from(byLowerName.values());
  }, [dbCategories]);

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Select
          value={value || undefined}
          onValueChange={(next) => {
            if (next === CREATE_CATEGORY_OPTION) {
              setCreateOpen(true);
              return;
            }
            onChange(next);
          }}
        >
          <SelectTrigger className="h-auto w-full rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm shadow-none focus:ring-0">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value={CREATE_CATEGORY_OPTION} className="font-medium text-primary">
              ➕ Créer une nouvelle catégorie
            </SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label="Créer une nouvelle catégorie"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <NewExpenseCategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(category) => onChange(category.name)}
      />
    </>
  );
}

function DepenseMobileCard({ row, actions }: { row: Depense; actions: MobileCardActions }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { settings, logoUrl } = useCompanySettings();
  const style = CATEGORY_STYLES[row.category] ?? DEFAULT_CATEGORY_STYLE;
  const CategoryIcon = style.icon;
  const PaymentIcon = (row.payment_method && PAYMENT_ICONS[row.payment_method]) || CreditCard;
  const title = (row.description?.trim() || row.category).toUpperCase();

  const exportCtx = {
    filename: `Depense_${row.id}`,
    pdfTitle: "Dépense",
    companySettings: settings,
    logoUrl,
  };

  const details: ResourceCardDetail[] = [
    { icon: Calendar, label: "Date", value: formatDate(row.paid_at) },
    { icon: Tag, label: "Catégorie", value: row.category, valueClassName: style.amountColor },
    { icon: AlignLeft, label: "Description", value: row.description || "—" },
    { icon: PaymentIcon, label: "Mode de paiement", value: row.payment_method || "—" },
  ];

  const menuActions: ResourceCardMenuAction[] = [
    { key: "details", icon: Eye, label: "Voir détails", onClick: () => setDetailsOpen(true) },
    { key: "pdf", icon: FileText, label: "Exporter PDF", onClick: () => void exportRowsToPdf([row], exportColumns, exportCtx) },
    { key: "xlsx", icon: FileSpreadsheet, label: "Exporter Excel", onClick: () => exportRowsToXlsx([row], exportColumns, exportCtx) },
    { key: "csv", icon: Download, label: "Exporter CSV", onClick: () => exportRowsToCsv([row], exportColumns, exportCtx) },
  ];
  if (actions.canDelete) {
    menuActions.push({ key: "delete", icon: Trash2, label: "Supprimer", onClick: actions.onDelete, destructive: true });
  }

  return (
    <>
      <ResourceCard
        leading={{ variant: "icon", icon: CategoryIcon, className: style.iconBg }}
        title={title}
        badge={{ label: row.category, className: style.badgeBg }}
        headerInfo={{ value: formatCurrency(Number(row.amount)), className: style.amountColor }}
        menuAriaLabel="Menu de la dépense"
        menuActions={menuActions}
        details={details}
        footerActions={[
          { key: "edit", icon: Pencil, label: "Modifier", onClick: actions.onEdit, colorClass: "text-blue-600 hover:bg-blue-50 active:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-500/10", disabled: !actions.canEdit },
          {
            key: "print",
            icon: Printer,
            label: "Imprimer",
            onClick: () =>
              void exportRowsToPdf([row], exportColumns, { ...exportCtx, successMessage: "Impression lancée" }),
            colorClass: "text-gray-600 hover:bg-gray-50 active:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-500/10",
          },
          { key: "delete", icon: Trash2, label: "Supprimer", onClick: actions.onDelete, colorClass: "text-red-600 hover:bg-red-50 active:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/10", disabled: !actions.canDelete },
        ]}
      />

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.iconBg} text-white`}
              >
                <CategoryIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate">{title}</DialogTitle>
                <DialogDescription>Détails de la dépense</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Montant</span>
              <span className={`text-base font-bold ${style.amountColor}`}>
                {formatCurrency(Number(row.amount))}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium text-foreground">{formatDate(row.paid_at)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Catégorie</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badgeBg}`}>
                {row.category}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Mode de paiement</span>
              <span className="font-medium text-foreground">{row.payment_method || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Description</span>
              <p className="mt-1 font-medium text-foreground">{row.description || "—"}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
  const { settings, logoUrl, companyName } = useCompanySettings();
  const canExport = useActionPermission("depenses.export");

  return (
    <AppShell title="Dépenses" subtitle="Gérez vos dépenses">
      <div className="-m-4 bg-muted/40 p-4 md:-m-8 md:p-8">
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
          premiumLayout
          nameSortLabel="Catégorie"
          renderMobileCard={(row, actions) => <DepenseMobileCard row={row} actions={actions} />}
          mobileEmptyState={{
            icon: <Wallet className="h-10 w-10 text-muted-foreground/50" />,
            title: "Aucune dépense",
            subtitle: "Ajoutez votre première dépense pour commencer.",
          }}
          renderActions={(data) =>
            canExport && (
              <DataExportMenu
                data={data}
                columns={exportColumns}
                filename={`Liste_depenses_${companyName}`}
                pdfTitle="Liste des dépenses"
                companySettings={settings}
                logoUrl={logoUrl}
                triggerVariant="outline"
                triggerClassName="w-full min-h-[44px] justify-center gap-2 rounded-xl border-gray-300 bg-white text-gray-700 shadow-sm hover:border-blue-600 hover:bg-white hover:text-blue-600 dark:bg-card sm:w-auto"
              />
            )
          }
        />
      </div>
    </AppShell>
  );
}
