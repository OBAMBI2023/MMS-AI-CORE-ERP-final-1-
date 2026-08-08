import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/mms/format";
import {
  History,
  Search,
  FileText,
  Printer,
  Pencil,
  Trash2,
  AlertTriangle,
  Filter,
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
  CheckCircle2,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { logAction } from "@/lib/audit.server";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { downloadPdf } from "@/lib/mms/download-pdf";
import { tenantFromSettings } from "@/lib/mms/PdfTheme";
import { PdfLayoutEngine } from "@/lib/mms/PdfLayoutEngine";
import { useTenant } from "@/providers/TenantProvider";

interface SalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
}

type SaleRow = Tables<"ventes">;

function escapeIlike(value: string): string {
  return value.replace(/[%_,]/g, (c) => `\\${c}`);
}

const PAYMENT_STYLES: Record<string, { icon: LucideIcon; className: string }> = {
  "Espèces": {
    icon: Banknote,
    className: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  "Carte": {
    icon: CreditCard,
    className: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  "Wave": {
    icon: Smartphone,
    className: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  },
  "Orange Money": {
    icon: Smartphone,
    className: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  },
};
const DEFAULT_PAYMENT_STYLE = { icon: Wallet, className: "bg-muted text-muted-foreground" };

function getPaymentStyle(method: string | null | undefined) {
  return (method && PAYMENT_STYLES[method]) || DEFAULT_PAYMENT_STYLE;
}

function PaymentBadge({ method }: { method: string | null | undefined }) {
  const { icon: Icon, className } = getPaymentStyle(method);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <Icon className="h-3 w-3" /> {method || "-"}
    </span>
  );
}

function StatusBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
      <CheckCircle2 className="h-3 w-3" /> Validée
    </span>
  );
}

function SaleMobileCard({
  sale,
  canManageSales,
  onPrint,
  onEdit,
  onDelete,
}: {
  sale: SaleRow;
  canManageSales: boolean;
  onPrint: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-[18px] border border-border bg-white p-4 shadow-sm shadow-slate-900/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-card dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight text-foreground">
              {sale.number}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{sale.client_name || "Client comptoir"}</span>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" /> {formatDate(sale.created_at)}
            </p>
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap text-[15px] font-bold text-foreground">
          {formatCurrency(sale.total)}
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-border pt-3.5">
        <PaymentBadge method={sale.payment_method} />
        <StatusBadge />
      </div>

      <div className="mt-3.5 flex items-center gap-2 border-t border-border pt-3.5">
        <button
          type="button"
          onClick={onPrint}
          aria-label="Imprimer la vente"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors duration-200 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300"
        >
          <Printer className="h-4 w-4" />
        </button>
        {canManageSales && (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label="Modifier la vente"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors duration-200 hover:bg-muted/70"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Supprimer la vente"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors duration-200 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

type Cursor = { created_at: string; id: string } | null;

export function SalesHistoryModal({ isOpen, onClose, onEdit }: SalesHistoryModalProps) {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<any>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // Keyset/cursor pagination: OFFSET-based `.range()` degrades linearly with
  // page depth (40–208ms at page ~5000 on a 50k-row MEDIUM-volume tenant,
  // scanning/skipping every prior row every time); get_ventes_keyset_page()
  // seeks directly via the (created_at, id) index instead, so page cost stays
  // ~constant regardless of depth. The tradeoff: a keyset cursor only knows
  // how to go to the *next*/*previous* page from where it is, not jump to an
  // arbitrary page number — so pageIndex/cursors below intentionally replace
  // the old numbered-page-buttons UI with Précédent/Suivant. cursors[i] is
  // the cursor needed to fetch page i (cursors[0] is always null = first page).
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<Cursor[]>([null]);
  const permissionsQuery = usePermissions();
  const queryClient = useQueryClient();
  const { profile, loading: tenantLoading } = useTenant();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  // Debounce search so every keystroke doesn't trigger a new request.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setPageIndex(0);
    setCursors([null]);
  }, [debouncedSearch, paymentFilter, itemsPerPage]);

  function applyListFilters(query: any): any {
    let q = query;
    if (debouncedSearch) {
      const escaped = escapeIlike(debouncedSearch);
      q = q.or(`number.ilike.%${escaped}%,client_name.ilike.%${escaped}%`);
    }
    if (paymentFilter.length > 0) {
      q = q.in("payment_method", paymentFilter);
    }
    return q;
  }

  const currentCursor = cursors[pageIndex] ?? null;

  const { data: sales = [], isLoading } = useQuery({
    queryKey: [
      "ventes",
      "history",
      "keyset",
      profile?.tenant_id,
      pageIndex,
      itemsPerPage,
      debouncedSearch,
      paymentFilter,
      currentCursor?.created_at ?? null,
      currentCursor?.id ?? null,
    ],
    queryFn: async () => {
      if (!profile?.tenant_id) {
        throw new Error("Impossible de charger les ventes : aucun tenant courant n'est disponible.");
      }
      const { data, error } = await (supabase.rpc as any)("get_ventes_keyset_page", {
        p_cursor_created_at: currentCursor?.created_at ?? null,
        p_cursor_id: currentCursor?.id ?? null,
        p_limit: itemsPerPage,
        p_search: debouncedSearch ? escapeIlike(debouncedSearch) : null,
        p_payment_methods: paymentFilter.length > 0 ? paymentFilter : null,
      });
      if (error) throw error;
      return (data ?? []) as SaleRow[];
    },
    enabled: isOpen && !tenantLoading && Boolean(profile?.tenant_id),
    placeholderData: keepPreviousData,
  });

  // Lightweight count-only query (same filters, no rows) — keeps the "X–Y sur
  // Z ventes" display and the Suivant/Précédent enabled state accurate without
  // ever fetching (or OFFSET-skipping) the underlying rows themselves.
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["ventes", "history", "count", profile?.tenant_id, debouncedSearch, paymentFilter],
    queryFn: async () => {
      if (!profile?.tenant_id) return 0;
      let query = (supabase.from("ventes") as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", profile.tenant_id);
      query = applyListFilters(query);
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: isOpen && !tenantLoading && Boolean(profile?.tenant_id),
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["ventes", "history", "payment-methods", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_distinct_ventes_payment_methods");
      if (error) throw error;
      return ((data ?? []) as { payment_method: string }[]).map((r) => r.payment_method);
    },
    enabled: isOpen && !tenantLoading && Boolean(profile?.tenant_id),
  });

  const { role, roleId } = permissionsQuery.data || { permissions: [], role: null, roleId: null };
  const { settings, logoUrl } = useCompanySettings();
  // La gestion d'une vente est volontairement plus stricte qu'une permission
  // configurable : seul le rôle Administrateur peut la modifier ou la supprimer.
  const canManageSales = role === "Administrateur";

  const paginatedSales = sales;
  // A full page (== itemsPerPage rows) means there may be more after it;
  // a short page is unambiguously the last one. Doesn't require totalCount,
  // so it stays correct even if that separate count query hasn't resolved yet.
  const hasNextPage = sales.length === itemsPerPage;
  const rangeStart = sales.length === 0 ? 0 : pageIndex * itemsPerPage + 1;
  const rangeEnd = pageIndex * itemsPerPage + sales.length;

  const goToNextPage = () => {
    if (!hasNextPage) return;
    const last = sales[sales.length - 1];
    setCursors((prev) => {
      const next = [...prev];
      next[pageIndex + 1] = { created_at: last.created_at as string, id: last.id as string };
      return next;
    });
    setPageIndex((p) => p + 1);
  };
  const goToPrevPage = () => setPageIndex((p) => Math.max(0, p - 1));

  const togglePaymentFilter = (method: string) => {
    setPaymentFilter((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method],
    );
  };

  // Export/print cover every sale matching the current search+filter (not just
  // the page on screen), so this fetches its own unpaginated copy on demand.
  const fetchAllMatchingSales = async (): Promise<SaleRow[]> => {
    if (!profile?.tenant_id) return [];
    let query = (supabase.from("ventes") as any)
      .select("*")
      .eq("tenant_id", profile.tenant_id);
    query = applyListFilters(query);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as SaleRow[];
  };

  const handleExportPDF = async () => {
    const allMatching = await fetchAllMatchingSales();
    const doc = new jsPDF();
    const tenant = tenantFromSettings(settings, logoUrl);
    const total = allMatching.reduce((sum, sale) => sum + Number(sale.total), 0);
    const y = await PdfLayoutEngine.header(doc, tenant, "Historique des ventes", [
      { label: "Nombre de ventes", value: String(allMatching.length) },
      { label: "Montant total", value: formatCurrency(total) },
      { label: "Période", value: "Toutes" },
      { label: "Statut", value: "Validées" },
    ]);

    // Sales Table
    const tableData = allMatching.map((s) => [
      s.number,
      new Date(s.created_at).toLocaleDateString(),
      s.client_name || "-",
      formatCurrency(s.total),
      s.payment_method,
      "Validée",
    ]);

    const finalY = PdfLayoutEngine.table(
      doc,
      ["Référence", "Date", "Client", "Montant", "Paiement", "Statut"],
      tableData,
      y,
      { columnStyles: { 3: { halign: "right", fontStyle: "bold" } } },
    );
    PdfLayoutEngine.totals(doc, [{ label: "Total des ventes", value: formatCurrency(total) }], finalY + 7);
    PdfLayoutEngine.footer(doc, tenant);

    await downloadPdf(doc, "historique-ventes.pdf");
    toast.success("PDF généré");
  };

  const canPrint = (_sale: any) => true;

  const handlePrint = async (sale: SaleRow) => {
    // Line items are only needed for the printed ticket, so they're fetched
    // on demand here instead of being embedded in the (paginated) list query.
    const { data: items, error: itemsError } = await supabase
      .from("vente_items")
      .select("*")
      .eq("vente_id", sale.id);
    if (itemsError) {
      toast.error("Impossible de charger les articles de cette vente.");
      return;
    }
    const doc = new jsPDF({ format: "a4", unit: "mm" });
    const tenant = tenantFromSettings(settings, logoUrl);
    const y = await PdfLayoutEngine.header(doc, tenant, "Ticket de caisse", [
      { label: "Référence", value: sale.number },
      { label: "Date", value: new Date(sale.created_at).toLocaleDateString("fr-FR") },
      { label: "Statut", value: "Validée" },
      { label: "Total", value: formatCurrency(sale.total) },
    ]);
    const contentY = sale.client_name
      ? PdfLayoutEngine.contact(doc, { heading: "Client", name: sale.client_name }, y)
      : y;
    const finalY = PdfLayoutEngine.table(
      doc,
      ["Article", "Quantité", "Prix unitaire", "Montant"],
      (items ?? []).map((item) => [
        item.name,
        item.qty,
        formatCurrency(item.price),
        formatCurrency(Number(item.price) * Number(item.qty)),
      ]),
      contentY + 6,
      { columnStyles: { 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } } },
    );
    PdfLayoutEngine.totals(doc, [{ label: "Total TTC", value: formatCurrency(sale.total) }], finalY + 7);
    PdfLayoutEngine.footer(doc, tenant);

    await downloadPdf(doc, `ticket-${sale.number}.pdf`);
    toast.success("Impression lancée");
  };

  const handleDelete = async () => {
    if (!canManageSales) {
      toast.error("Accès refusé");
      setSaleToDelete(null);
      return;
    }

    if (!saleToDelete || !userId) return;
    const { error } = await supabase.from("ventes").delete().eq("id", saleToDelete.id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      await logAction(userId, roleId ?? null, "delete", "ventes", {
        sale_number: saleToDelete.number,
      });
      toast.success("Vente supprimée");
      queryClient.invalidateQueries({ queryKey: ["ventes", "history"] });
      setSaleToDelete(null);
    }
  };

  const handleEditClick = (sale: any) => {
    if (!canManageSales) {
      toast.error("Accès refusé");
      return;
    }
    onClose();
    onEdit(sale.id);
  };

  const handleDeleteClick = (sale: any) => {
    if (!canManageSales) {
      toast.error("Accès refusé");
      return;
    }
    setSaleToDelete(sale);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="flex h-[90vh] w-full max-w-[95vw] flex-col rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <History className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>Historique des ventes</DialogTitle>
                <DialogDescription>
                  Consultez, recherchez et gérez les ventes enregistrées.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par client, référence..."
                  className="rounded-xl pl-10 shadow-sm"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-xl shadow-sm">
                    <Filter className="h-4 w-4" /> Filtres
                    {paymentFilter.length > 0 && (
                      <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
                        {paymentFilter.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Moyen de paiement</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {paymentMethods.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Aucun filtre disponible</div>
                  ) : (
                    paymentMethods.map((m) => (
                      <DropdownMenuCheckboxItem
                        key={m}
                        checked={paymentFilter.includes(m)}
                        onCheckedChange={() => togglePaymentFilter(m)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {m}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                  {paymentFilter.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setPaymentFilter([])}>
                        Réinitialiser
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="gap-2 rounded-xl shadow-sm" onClick={handleExportPDF}>
                <FileText className="h-4 w-4" /> Exporter PDF
              </Button>
              <Button
                variant="outline"
                className="gap-2 rounded-xl shadow-sm"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" /> Imprimer
              </Button>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              {totalCount} vente{totalCount > 1 ? "s" : ""} enregistrée
              {totalCount > 1 ? "s" : ""}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden flex-1 overflow-auto rounded-2xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Référence
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Client
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Montant
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Paiement
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Statut
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : paginatedSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Aucune vente trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSales.map((s) => (
                    <TableRow key={s.id} className="transition-colors hover:bg-muted/30">
                      <TableCell className="font-medium">{s.number}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(s.created_at)}</TableCell>
                      <TableCell>{s.client_name || "Client comptoir"}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(s.total)}</TableCell>
                      <TableCell>
                        <PaymentBadge method={s.payment_method} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canPrint(s) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              aria-label="Imprimer la vente"
                              onClick={() => handlePrint(s)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          )}
                          {canManageSales && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label="Modifier la vente"
                                onClick={() => handleEditClick(s)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                aria-label="Supprimer la vente"
                                onClick={() => handleDeleteClick(s)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex-1 overflow-auto md:hidden">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Chargement...</div>
            ) : paginatedSales.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Aucune vente trouvée</div>
            ) : (
              <div className="space-y-3.5">
                {paginatedSales.map((s) => (
                  <SaleMobileCard
                    key={s.id}
                    sale={s}
                    canManageSales={canManageSales}
                    onPrint={() => handlePrint(s)}
                    onEdit={() => handleEditClick(s)}
                    onDelete={() => handleDeleteClick(s)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
            <div className="text-sm text-muted-foreground">
              {rangeEnd === 0
                ? "0 vente"
                : `${rangeStart}–${rangeEnd} sur ${totalCount} vente${totalCount > 1 ? "s" : ""}`}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goToPrevPage}
                disabled={pageIndex === 0}
                aria-label="Page précédente"
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Précédent
              </button>
              <span className="px-1 text-sm text-muted-foreground">
                Page {pageIndex + 1}
                {totalCount > 0 ? ` / ${Math.max(1, Math.ceil(totalCount / itemsPerPage))}` : ""}
              </span>
              <button
                type="button"
                onClick={goToNextPage}
                disabled={!hasNextPage}
                aria-label="Page suivante"
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </button>

              <select
                className="ml-2 h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                }}
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle /> Confirmer la suppression
            </DialogTitle>
            <DialogDescription>Voulez-vous vraiment supprimer cette vente ?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleToDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
