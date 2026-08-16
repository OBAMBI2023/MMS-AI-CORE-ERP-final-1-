import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Calendar,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Landmark,
  Loader2,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  Search,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { ImageField } from "@/components/hotel/HotelImageField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useTenant } from "@/providers/TenantProvider";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { formatCurrency, formatDate, getCurrency } from "@/lib/mms/format";

// The generated Supabase types do not include the recently provisioned
// hotel_expenses table yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const RECEIPTS_BUCKET = "hotel-expense-receipts";

const CATEGORIES = [
  "Électricité",
  "Eau",
  "Internet",
  "Entretien / Maintenance",
  "Ménage",
  "Blanchisserie",
  "Fournitures",
  "Achats logement",
  "Personnel",
  "Transport",
  "Sécurité",
  "Taxes / Frais",
  "Marketing",
  "Autre",
] as const;

const PAYMENT_METHODS = ["Espèces", "Mobile Money", "Carte bancaire", "Virement", "Chèque", "Autre"] as const;

const PAYMENT_ICONS: Record<string, LucideIcon> = {
  "Espèces": Banknote,
  "Mobile Money": Smartphone,
  "Carte bancaire": CreditCard,
  "Virement": Landmark,
  "Chèque": Receipt,
  "Autre": Wallet,
};

type Expense = {
  id: string;
  tenant_id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string | null;
  payee: string | null;
  reference: string | null;
  notes: string | null;
  receipt_path: string | null;
  created_at: string;
  updated_at: string;
};

type ExpenseForm = {
  expense_date: string;
  category: string;
  description: string;
  amount: string;
  payment_method: string;
  payee: string;
  reference: string;
  receipt_path: string;
  notes: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = (): ExpenseForm => ({
  expense_date: todayIso(),
  category: CATEGORIES[0],
  description: "",
  amount: "",
  payment_method: "",
  payee: "",
  reference: "",
  receipt_path: "",
  notes: "",
});

export function HotelDepensesPage() {
  const qc = useQueryClient();
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const canView = useActionPermission("hotel.expenses.view");
  const canCreate = useActionPermission("hotel.expenses.create");
  const canUpdate = useActionPermission("hotel.expenses.update");
  const canDelete = useActionPermission("hotel.expenses.delete");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [method, setMethod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const expensesQuery = useQuery({
    queryKey: ["hotel-expenses", tenantId],
    enabled: Boolean(tenantId) && canView,
    queryFn: async () => {
      const { data, error } = await db
        .from("hotel_expenses")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });

  const expenses = expensesQuery.data ?? [];

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return expenses.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (method !== "all" && (e.payment_method ?? "") !== method) return false;
      if (dateFrom && e.expense_date < dateFrom) return false;
      if (dateTo && e.expense_date > dateTo) return false;
      if (
        normalized &&
        !`${e.description} ${e.payee ?? ""} ${e.category} ${e.reference ?? ""}`
          .toLocaleLowerCase("fr")
          .includes(normalized)
      )
        return false;
      return true;
    });
  }, [expenses, query, category, method, dateFrom, dateTo]);

  const now = new Date();
  const today = todayIso();
  const todayTotal = expenses
    .filter((e) => e.expense_date === today)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const monthTotal = expenses
    .filter((e) => {
      const d = new Date(e.expense_date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const hasActiveFilters = Boolean(query || category !== "all" || method !== "all" || dateFrom || dateTo);
  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setMethod("all");
    setDateFrom("");
    setDateTo("");
  };

  const deleteExpense = useMutation({
    mutationFn: async (expense: Expense) => {
      if (!tenantId) throw new Error("Établissement introuvable.");
      const { error } = await db
        .from("hotel_expenses")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", expense.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hotel-expenses", tenantId] });
      setDeleting(null);
      toast.success("Dépense supprimée");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setFormOpen(true);
  };

  if (!canView) {
    return (
      <HotelAppShell title="Dépenses" subtitle="Suivez les dépenses de votre établissement">
        <div className="mt-4 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <Wallet className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">Accès restreint</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Vous n'avez pas la permission de consulter les dépenses de cet établissement.
            </p>
          </div>
        </div>
      </HotelAppShell>
    );
  }

  return (
    <HotelAppShell
      title="Dépenses"
      subtitle="Suivez les dépenses de votre établissement"
      actions={
        canCreate ? (
          <Button onClick={openCreate} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" />
            Nouvelle dépense
          </Button>
        ) : null
      }
    >
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {(
          [
            ["Dépenses aujourd'hui", formatCurrency(todayTotal), Wallet],
            ["Ce mois", formatCurrency(monthTotal), Calendar],
            ["Nombre de dépenses", String(filtered.length), Receipt],
          ] as const
        ).map(([label, value, Icon]) => (
          <div
            key={label}
            className="group flex items-center gap-3 rounded-2xl border border-primary/25 bg-card px-4 py-3.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#102A43] text-hotel-petrol-accent transition-transform duration-300 group-hover:scale-105">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold leading-none text-[#102A43] dark:text-white sm:text-xl">{value}</p>
              <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-4 rounded-2xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 sm:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Description, bénéficiaire, référence…"
              className="h-11 w-full rounded-xl border bg-background pl-10 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setFilterSheetOpen(true)}
            aria-label="Filtres"
            className="relative h-11 w-11 shrink-0 rounded-xl"
          >
            <SlidersHorizontal className="size-4" />
            {hasActiveFilters && <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />}
          </Button>
        </div>

        <div className="hidden sm:grid sm:grid-cols-2 sm:gap-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]">
          <div className="relative min-w-0">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Description, bénéficiaire, référence…"
              className="h-11 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <FilterSelect
            value={category}
            onChange={setCategory}
            options={[["all", "Toutes les catégories"], ...CATEGORIES.map((c) => [c, c])]}
          />
          <FilterSelect
            value={method}
            onChange={setMethod}
            options={[["all", "Tous les modes"], ...PAYMENT_METHODS.map((m) => [m, m])]}
          />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-11 w-[150px] rounded-xl" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-11 w-[150px] rounded-xl" />
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={resetFilters}
              aria-label="Réinitialiser les filtres"
              className="h-11 w-11 shrink-0 justify-self-start rounded-xl text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-[24px] sm:hidden">
          <SheetHeader>
            <SheetTitle>Filtrer les dépenses</SheetTitle>
            <SheetDescription>Affinez la liste par catégorie, mode de paiement ou période.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Catégorie</p>
              <div className="flex flex-wrap gap-2">
                {[["all", "Toutes"], ...CATEGORIES.map((c) => [c, c])].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`h-10 rounded-xl px-3 text-sm font-medium ring-1 transition-colors ${
                      category === key ? "bg-primary text-primary-foreground ring-primary" : "bg-background text-foreground ring-border hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mode de paiement</p>
              <div className="flex flex-wrap gap-2">
                {[["all", "Tous"], ...PAYMENT_METHODS.map((m) => [m, m])].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMethod(key)}
                    className={`h-10 rounded-xl px-3 text-sm font-medium ring-1 transition-colors ${
                      method === key ? "bg-primary text-primary-foreground ring-primary" : "bg-background text-foreground ring-border hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1.5 block">Du</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-11" />
              </div>
              <div>
                <Label className="mb-1.5 block">Au</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-11" />
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6 flex-row gap-2">
            <Button type="button" variant="ghost" onClick={resetFilters} className="flex-1 rounded-xl">
              Réinitialiser
            </Button>
            <Button
              type="button"
              onClick={() => setFilterSheetOpen(false)}
              className="flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Voir {filtered.length} dépense{filtered.length > 1 ? "s" : ""}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {expensesQuery.isLoading ? (
        <>
          <div className="hidden min-h-72 place-items-center md:grid">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
          <div className="mt-4 space-y-3 md:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
                <Skeleton className="size-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : expensesQuery.isError ? (
        <div className="mt-4 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <Wallet className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">Impossible de charger les dépenses</h3>
            <p className="mt-1 text-sm text-muted-foreground">Vérifiez votre connexion puis réessayez.</p>
            <Button variant="outline" onClick={() => void expensesQuery.refetch()} className="mt-5 rounded-xl">
              Réessayer
            </Button>
          </div>
        </div>
      ) : filtered.length ? (
        <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[#102A43] text-white">
                <tr>
                  {["Date", "Catégorie", "Description", "Bénéficiaire", "Mode", "Montant", "Référence", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    onEdit={() => openEdit(expense)}
                    onDelete={() => setDeleting(expense)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y md:hidden">
            {filtered.map((expense) => (
              <ExpenseMobileCard
                key={expense.id}
                expense={expense}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onEdit={() => openEdit(expense)}
                onDelete={() => setDeleting(expense)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Wallet className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">Aucune dépense</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasActiveFilters ? "Aucun résultat pour ces filtres." : "Ajoutez votre première dépense pour commencer le suivi."}
            </p>
            {canCreate && !hasActiveFilters && (
              <Button onClick={openCreate} className="mt-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="size-4" />
                Nouvelle dépense
              </Button>
            )}
          </div>
        </div>
      )}

      <ExpenseFormDialog
        open={formOpen}
        expense={editing}
        tenantId={tenantId}
        onOpenChange={setFormOpen}
        onSaved={() => void qc.invalidateQueries({ queryKey: ["hotel-expenses", tenantId] })}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer{" "}
              <span className="font-medium text-foreground">{deleting?.description}</span> ({deleting ? formatCurrency(Number(deleting.amount)) : ""}) ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteExpense.mutate(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteExpense.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HotelAppShell>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="relative flex h-11 items-center rounded-xl border bg-background px-3 text-sm">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none bg-transparent pr-7 outline-none"
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-3.5 text-muted-foreground" />
    </label>
  );
}

function ReceiptLink({ path }: { path: string | null }) {
  const url = useSignedUrl(path, RECEIPTS_BUCKET);
  if (!path) return <span className="text-muted-foreground">—</span>;
  if (!url) return <Loader2 className="size-3.5 animate-spin text-muted-foreground" />;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      <Paperclip className="size-3.5" /> Voir <ExternalLink className="size-3" />
    </a>
  );
}

type RowProps = {
  expense: Expense;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function ActionsMenu({ canUpdate, canDelete, onEdit, onDelete }: Omit<RowProps, "expense">) {
  if (!canUpdate && !canDelete) return <span className="text-muted-foreground">—</span>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Actions">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canUpdate && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-4" /> Modifier
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="size-4" /> Supprimer
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ExpenseRow({ expense, canUpdate, canDelete, onEdit, onDelete }: RowProps) {
  return (
    <tr className="hover:bg-muted/30">
      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{formatDate(expense.expense_date)}</td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center rounded-full bg-[#102A43]/5 px-2.5 py-1 text-[11px] font-semibold text-[#102A43] ring-1 ring-[#102A43]/10 dark:bg-white/5 dark:text-white dark:ring-white/10">
          {expense.category}
        </span>
      </td>
      <td className="max-w-[220px] truncate px-3 py-3">{expense.description}</td>
      <td className="px-3 py-3 text-muted-foreground">{expense.payee || "—"}</td>
      <td className="px-3 py-3 text-muted-foreground">{expense.payment_method || "—"}</td>
      <td className="whitespace-nowrap px-3 py-3 font-semibold text-destructive">-{formatCurrency(Number(expense.amount))}</td>
      <td className="px-3 py-3">
        <ReceiptLink path={expense.receipt_path} />
      </td>
      <td className="px-3 py-3 text-right">
        <ActionsMenu canUpdate={canUpdate} canDelete={canDelete} onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  );
}

function ExpenseMobileCard({ expense, canUpdate, canDelete, onEdit, onDelete }: RowProps) {
  const PaymentIcon = (expense.payment_method && PAYMENT_ICONS[expense.payment_method]) || Wallet;
  return (
    <div className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#102A43] text-hotel-petrol-accent">
            <PaymentIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{expense.description}</p>
            <p className="text-xs text-muted-foreground">{formatDate(expense.expense_date)} · {expense.category}</p>
          </div>
        </div>
        <ActionsMenu canUpdate={canUpdate} canDelete={canDelete} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-base font-bold text-destructive">-{formatCurrency(Number(expense.amount))}</span>
        <ReceiptLink path={expense.receipt_path} />
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function ExpenseFormDialog({
  open,
  expense,
  tenantId,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  expense: Expense | null;
  tenantId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ExpenseForm>(emptyForm());
  const isEdit = Boolean(expense);
  const reset = () =>
    setForm(
      expense
        ? {
            expense_date: expense.expense_date,
            category: expense.category,
            description: expense.description,
            amount: String(expense.amount),
            payment_method: expense.payment_method ?? "",
            payee: expense.payee ?? "",
            reference: expense.reference ?? "",
            receipt_path: expense.receipt_path ?? "",
            notes: expense.notes ?? "",
          }
        : emptyForm(),
    );

  const save = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Aucun établissement actif.");
      const description = form.description.trim();
      if (!description) throw new Error("La description est obligatoire.");
      if (!form.category) throw new Error("La catégorie est obligatoire.");
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount < 0) throw new Error("Le montant doit être un nombre positif.");
      const payload = {
        expense_date: form.expense_date || todayIso(),
        category: form.category,
        description,
        amount,
        payment_method: form.payment_method || null,
        payee: form.payee.trim() || null,
        reference: form.reference.trim() || null,
        receipt_path: form.receipt_path || null,
        notes: form.notes.trim() || null,
      };
      const result = expense
        ? await db.from("hotel_expenses").update(payload).eq("tenant_id", tenantId).eq("id", expense.id)
        : await db.from("hotel_expenses").insert({ ...payload, tenant_id: tenantId });
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Dépense mise à jour" : "Dépense ajoutée");
      onSaved();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex w-[calc(100vw-24px)] max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-[20px] p-0 sm:w-full sm:max-w-[560px]">
        <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
          <DialogTitle>{isEdit ? "Modifier la dépense" : "Nouvelle dépense"}</DialogTitle>
          <DialogDescription>Renseignez les informations de la dépense.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!save.isPending) save.mutate();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" required>
                <Input
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                  className="h-11"
                />
              </Field>
              <Field label="Catégorie" required>
                <FilterSelect
                  value={form.category}
                  onChange={(v) => setForm({ ...form, category: v })}
                  options={CATEGORIES.map((c) => [c, c])}
                />
              </Field>
            </div>
            <Field label="Description" required>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex : Facture SODECI de juillet"
                className="h-11"
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Montant (${getCurrency()})`} required>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                  className="h-11"
                />
              </Field>
              <Field label="Mode de paiement">
                <FilterSelect
                  value={form.payment_method}
                  onChange={(v) => setForm({ ...form, payment_method: v })}
                  options={[["", "—"], ...PAYMENT_METHODS.map((m) => [m, m])]}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bénéficiaire / Fournisseur">
                <Input
                  value={form.payee}
                  onChange={(e) => setForm({ ...form, payee: e.target.value })}
                  placeholder="Ex : SODECI"
                  className="h-11"
                />
              </Field>
              <Field label="Référence">
                <Input
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="N° facture, reçu…"
                  className="h-11"
                />
              </Field>
            </div>
            <div>
              <Label className="mb-1.5 block">Justificatif</Label>
              <ImageField
                value={form.receipt_path}
                onChange={(v) => setForm({ ...form, receipt_path: v })}
                storage={{ bucket: RECEIPTS_BUCKET, folder: "receipts" }}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value.slice(0, 500) })}
                placeholder="Remarques…"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-4 py-4 sm:flex-row sm:justify-end sm:gap-2 sm:px-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-11 w-full rounded-xl sm:w-auto">
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={save.isPending}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Mettre à jour" : "Enregistrer la dépense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
