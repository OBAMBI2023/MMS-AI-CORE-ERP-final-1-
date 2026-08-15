import { createFileRoute } from "@tanstack/react-router";
import { PLATFORM_BRANDING } from "@/config/branding";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  Pencil,
  Trash2,
  Eye,
  FileDown,
  Calendar,
  Tag,
  Loader2,
  Plus,
  Wallet,
  Banknote,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { LineItemsDialog } from "@/components/mms/LineItemsDialog";
import { PremiumResourceList, type MobileSort } from "@/components/mms/PremiumResourceList";
import { ResourceSummaryBar } from "@/components/mms/ResourceSummaryBar";
import {
  usePaginatedTable,
  useDebouncedValue,
  type PaginatedFilter,
} from "@/hooks/use-paginated-table";
import {
  ResourceCard,
  type ResourceCardDetail,
  type ResourceCardFooterAction,
} from "@/components/mms/ResourceCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/mms/format";
import { generateDevisPDF } from "@/lib/mms/pdf-generator";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { usePermissions } from "@/hooks/use-permissions";
import { useActionPermission } from "@/hooks/use-action-permission";
import { logAction } from "@/lib/audit.server";
import { useTenant } from "@/providers/TenantProvider";
import { analyticsEvents } from "@/lib/analytics";
import { trackBusinessEvent } from "@/lib/analytics/business";

type SettlementStatus = "en_attente" | "partiel" | "reglé" | null;

interface Devis {
  id: string;
  number: string;
  client_name: string | null;
  status: string | null;
  due_date: string | null;
  subtotal: number;
  discount: number;
  total: number;
  created_at: string;
  paid_total: number;
  balance_due: number;
  settlement_status: SettlementStatus;
  [k: string]: unknown;
}

interface DevisItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  line_total: number;
  unit: string | null;
}

const STATUSES = ["brouillon", "envoyé", "accepté", "refusé"] as const;
const statusColor: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  envoyé: "bg-primary/10 text-primary",
  accepté: "bg-emerald-500/15 text-emerald-600",
  refusé: "bg-destructive/10 text-destructive",
};

const PAYMENT_METHODS = ["Espèces", "Wave", "Orange Money", "Carte", "Virement"] as const;

const settlementLabel: Record<Exclude<SettlementStatus, null>, string> = {
  en_attente: "En attente de règlement",
  partiel: "Partiellement réglé",
  reglé: "Réglé",
};
const settlementColor: Record<Exclude<SettlementStatus, null>, string> = {
  en_attente: "bg-amber-500/15 text-amber-600",
  partiel: "bg-blue-500/15 text-blue-600",
  reglé: "bg-emerald-500/15 text-emerald-600",
};

type DevisTab = "tous" | "brouillon" | "envoyé" | "accepté" | "partiel" | "reglé";
const TABS: { key: DevisTab; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "brouillon", label: "Brouillons" },
  { key: "envoyé", label: "Envoyés" },
  { key: "accepté", label: "Acceptés" },
  { key: "partiel", label: "Partiellement réglés" },
  { key: "reglé", label: "Réglés" },
];

export const Route = createFileRoute("/devis")({
  component: DevisPage,
  head: () => ({
    meta: [
      { title: `Devis — ${PLATFORM_BRANDING.productName}` },
      { name: "description", content: "Gestion des devis clients." },
    ],
  }),
});

function todayInputValue() {
  const offset = new Date().getTimezoneOffset() * 60_000;
  return new Date(Date.now() - offset).toISOString().slice(0, 10);
}

function DevisPaymentDialog({
  devis,
  open,
  onOpenChange,
  onSuccess,
}: {
  devis: Devis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"partial" | "full">("full");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("Espèces");
  const [paidAt, setPaidAt] = useState(todayInputValue());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const remaining = devis?.balance_due ?? 0;

  useEffect(() => {
    if (!devis) return;
    setMode("full");
    setAmount(String(remaining));
    setMethod("Espèces");
    setPaidAt(todayInputValue());
    setReference("");
    setNotes("");
    // devis.id intentionally not in deps beyond identity: reset whenever a new devis opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devis?.id]);

  const selectMode = (next: "partial" | "full") => {
    setMode(next);
    if (next === "full") setAmount(String(remaining));
    else if (Number(amount) >= remaining) setAmount("");
  };

  const submit = async () => {
    if (!devis || submitting) return;
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Le montant reçu doit être positif.");
      return;
    }
    if (parsedAmount > remaining) {
      toast.error("Le montant dépasse le reste à payer.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("collect_devis_payment", {
        requested_devis_id: devis.id,
        requested_amount: parsedAmount,
        requested_method: method,
        requested_reference: reference.trim() || undefined,
        requested_notes: notes.trim() || undefined,
        requested_paid_at: new Date(`${paidAt}T12:00:00`).toISOString(),
      });
      if (error) throw error;
      toast.success(
        parsedAmount >= remaining ? "Devis réglé intégralement." : "Paiement partiel enregistré.",
      );
      trackBusinessEvent(
        analyticsEvents.quotePaymentRecorded,
        {
          tenant_id: typeof devis.tenant_id === "string" ? devis.tenant_id : null,
          platform_type: "ERP",
          module: "devis",
        },
        {
          quote_id: devis.id,
          amount: parsedAmount,
          currency: "XOF",
        },
      );
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Règlement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Régler le devis {devis?.number}</DialogTitle>
          <DialogDescription>{devis?.client_name || "Client inconnu"}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center text-xs">
          <div>
            <p className="font-semibold tabular-nums">{formatCurrency(devis?.total ?? 0)}</p>
            <p className="text-muted-foreground">Montant total</p>
          </div>
          <div>
            <p className="font-semibold tabular-nums text-emerald-600">
              {formatCurrency(devis?.paid_total ?? 0)}
            </p>
            <p className="text-muted-foreground">Déjà payé</p>
          </div>
          <div>
            <p className="font-semibold tabular-nums text-amber-600">{formatCurrency(remaining)}</p>
            <p className="text-muted-foreground">Reste à payer</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => selectMode("partial")}
            disabled={submitting}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              mode === "partial"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Paiement partiel
          </button>
          <button
            type="button"
            onClick={() => selectMode("full")}
            disabled={submitting}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              mode === "full"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Paiement total
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="payment-amount">Montant reçu</Label>
            <Input
              id="payment-amount"
              type="number"
              min={1}
              max={remaining}
              value={amount}
              disabled={submitting || mode === "full"}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment-method">Mode de paiement</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as (typeof PAYMENT_METHODS)[number])}
                disabled={submitting}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-date">Date du règlement</Label>
              <Input
                id="payment-date"
                type="date"
                max={todayInputValue()}
                value={paidAt}
                disabled={submitting}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-reference">Référence (optionnel)</Label>
            <Input
              id="payment-reference"
              value={reference}
              disabled={submitting}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-notes">Notes (optionnel)</Label>
            <Input
              id="payment-notes"
              value={notes}
              disabled={submitting}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={() => void submit()} disabled={submitting || remaining <= 0}>
            {submitting ? "Enregistrement…" : "Confirmer le règlement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DevisCard({
  row,
  canDelete,
  canCollect,
  onEdit,
  onDelete,
  onDownloadPdf,
  onCollect,
}: {
  row: Devis;
  canDelete: boolean;
  canCollect: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDownloadPdf: () => void;
  onCollect: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const qc = useQueryClient();

  const setStatus = useMutation({
    mutationFn: async (status: string | null) => {
      const { error } = await (supabase.from("devis").update({ status }) as any).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      trackBusinessEvent(
        analyticsEvents.quoteUpdated,
        {
          tenant_id: typeof row.tenant_id === "string" ? row.tenant_id : null,
          platform_type: "ERP",
          module: "devis",
        },
        {
          quote_id: row.id,
          quote_status: row.status,
        },
      );
      qc.invalidateQueries({ queryKey: ["devis"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["devis_items", row.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devis_items")
        .select("id, name, qty, price, line_total, unit")
        .eq("devis_id", row.id);
      if (error) throw error;
      return (data ?? []) as DevisItem[];
    },
    enabled: detailsOpen,
  });

  const title = row.client_name?.trim() || "Client inconnu";
  const isAccepted = row.status === "accepté";
  const canRegler = canCollect && isAccepted && row.balance_due > 0;
  const hasPayment = row.paid_total > 0;
  const isFullyPaid = row.settlement_status === "reglé";

  const details: ResourceCardDetail[] = [
    { icon: Calendar, label: "Échéance", value: formatDate(row.due_date) },
    {
      icon: Tag,
      label: "Statut",
      value: (
        <select
          value={row.status ?? ""}
          onChange={(e) => setStatus.mutate(e.target.value || null)}
          onClick={(e) => e.stopPropagation()}
          className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none cursor-pointer ${
            statusColor[row.status ?? ""] ?? "bg-muted text-muted-foreground"
          }`}
        >
          <option value="">— Aucun —</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
  ];

  if (isAccepted) {
    details.push(
      { icon: Banknote, label: "Montant réglé", value: formatCurrency(row.paid_total) },
      {
        icon: Wallet,
        label: "Reste à payer",
        value: formatCurrency(row.balance_due),
        valueClassName: row.balance_due > 0 ? "text-amber-600" : "text-emerald-600",
      },
    );
  }

  const footerActions: ResourceCardFooterAction[] = [
    {
      key: "view",
      icon: Eye,
      label: "Voir",
      onClick: () => setDetailsOpen(true),
      colorClass:
        "text-gray-600 hover:bg-gray-50 active:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-500/10",
    },
    {
      key: "pdf",
      icon: FileDown,
      label: "PDF",
      onClick: onDownloadPdf,
      colorClass:
        "text-blue-600 hover:bg-blue-50 active:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-500/10",
    },
    ...(canRegler
      ? [
          {
            key: "collect",
            icon: CheckCircle2,
            label: "Régler",
            onClick: onCollect,
            colorClass:
              "text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-500/10",
          },
        ]
      : []),
    ...(isFullyPaid
      ? []
      : [
          {
            key: "edit",
            icon: Pencil,
            label: "Modifier",
            onClick: onEdit,
            colorClass:
              "text-violet-600 hover:bg-violet-50 active:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-500/10",
          },
        ]),
    // Masqué (pas seulement désactivé) dès qu'un règlement existe : un devis
    // avec paid_total > 0 ne doit jamais pouvoir être supprimé, cf. la FK
    // devis_payments_devis_id_tenant_id_fkey qui protège déjà ces lignes.
    ...(hasPayment
      ? []
      : [
          {
            key: "delete",
            icon: Trash2,
            label: "Supprimer",
            onClick: onDelete,
            colorClass:
              "text-red-600 hover:bg-red-50 active:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/10",
            disabled: !canDelete,
          },
        ]),
  ];

  return (
    <>
      <ResourceCard
        leading={{ variant: "icon", icon: FileText, className: "bg-violet-500" }}
        title={title.toUpperCase()}
        badge={{
          label: row.number,
          className: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
        }}
        headerInfo={{ value: formatCurrency(Number(row.total)), className: "text-primary" }}
        details={details}
        footerActions={footerActions}
      >
        {isAccepted && row.settlement_status && (
          <span
            className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${settlementColor[row.settlement_status]}`}
          >
            {settlementLabel[row.settlement_status]}
          </span>
        )}
      </ResourceCard>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate">{title}</DialogTitle>
                <DialogDescription>Devis {row.number}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium text-foreground">{formatDateTime(row.created_at)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Échéance</span>
              <span className="font-medium text-foreground">{formatDate(row.due_date)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-muted-foreground">Total</span>
              <span className="text-base font-bold text-primary">
                {formatCurrency(Number(row.total))}
              </span>
            </div>
            {isAccepted && (
              <>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-muted-foreground">Montant réglé</span>
                  <span className="font-medium text-emerald-600">
                    {formatCurrency(row.paid_total)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-muted-foreground">Reste à payer</span>
                  <span className="font-medium text-amber-600">
                    {formatCurrency(row.balance_due)}
                  </span>
                </div>
              </>
            )}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Lignes du devis
              </p>
              {itemsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune ligne.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.qty} {item.unit || "unité"} × {formatCurrency(Number(item.price))}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-foreground">
                        {formatCurrency(Number(item.line_total))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Total amount matching the current search AND active tab, computed entirely
 * in Postgres via the `devis_summary` RPC (COUNT + SUM in one aggregate
 * query) — never loads a single devis row just to render this total. Tenant
 * scoping comes from current_tenant_id() inside the function itself, the
 * same as this page's own RLS, not from a client param.
 */
function useDevisTotalAmount(
  search: string,
  status: string | null,
  settlementStatus: string | null,
) {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  return useQuery({
    queryKey: ["devis", "summary-total", tenantId, search, status, settlementStatus],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("devis_summary", {
        p_search: search || undefined,
        p_status: status,
        p_settlement_status: settlementStatus,
      });
      if (error) throw error;
      return Number(data?.[0]?.total ?? 0);
    },
    enabled: Boolean(tenantId),
  });
}

function DevisPage() {
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const { settings } = useCompanySettings(tenantLoading ? null : tenantId);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [tab, setTab] = useState<DevisTab>("tous");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<MobileSort>("default");
  const pageSize = 20;
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [payingDevis, setPayingDevis] = useState<Devis | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Devis | null>(null);
  const { data: userData } = useQuery({
    queryKey: ["user"],
    queryFn: () => supabase.auth.getUser(),
  });
  const permissionsQuery = usePermissions();
  const { roleId } = permissionsQuery.data || { roleId: null };
  const userId = userData?.data?.user?.id;
  const canDeleteDevis = useActionPermission("devis.delete");
  const canCreateDevis = useActionPermission("devis.create");
  const canEditDevis = useActionPermission("devis.edit");

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, sort, tab]);

  const orderBy = useMemo(() => {
    if (sort === "name-asc") return { column: "client_name", ascending: true };
    if (sort === "name-desc") return { column: "client_name", ascending: false };
    if (sort === "oldest") return { column: "created_at", ascending: true };
    return { column: "created_at", ascending: false };
  }, [sort]);

  const { statusFilterValue, settlementFilterValue } = useMemo(() => {
    if (tab === "brouillon" || tab === "envoyé" || tab === "accepté") {
      return { statusFilterValue: tab as string, settlementFilterValue: null as string | null };
    }
    if (tab === "partiel" || tab === "reglé") {
      return { statusFilterValue: null as string | null, settlementFilterValue: tab as string };
    }
    return {
      statusFilterValue: null as string | null,
      settlementFilterValue: null as string | null,
    };
  }, [tab]);

  const filters = useMemo<PaginatedFilter[]>(() => {
    const list: PaginatedFilter[] = [];
    if (statusFilterValue) list.push({ column: "status", op: "eq", value: statusFilterValue });
    if (settlementFilterValue)
      list.push({ column: "settlement_status", op: "eq", value: settlementFilterValue });
    return list;
  }, [statusFilterValue, settlementFilterValue]);

  const downloadPDF = async (devis: Devis) => {
    if (!tenantId) {
      toast.error("Locataire introuvable");
      return;
    }
    const { data: items, error } = await supabase
      .from("devis_items")
      .select("*")
      .eq("devis_id", devis.id);
    if (error) {
      toast.error("Erreur chargement items");
      return;
    }

    if (!settings) {
      toast.error("Paramètres entreprise manquants");
      return;
    }

    const getUrl = async (path?: string | null) => {
      if (!path) return null;
      const { data } = await supabase.storage.from("company-assets").createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    };

    const logoUrl = await getUrl(settings.logo_url);
    const signatureUrl = await getUrl(settings.signature_url);
    const cachetUrl = await getUrl(settings.cachet_url);

    await generateDevisPDF(
      {
        numero: devis.number,
        date: new Date(devis.created_at).toLocaleDateString(),
        dateExpiration: devis.due_date ? new Date(devis.due_date).toLocaleDateString() : "",
        statut: devis.status ?? "",
        client: {
          nom: devis.client_name ?? "Client inconnu",
        },
        items: (items ?? []).map((i) => ({
          description: i.name,
          quantite: i.qty,
          prixUnitaire: i.price,
          remise: 0,
          tva: 0,
          montant: i.price * i.qty,
        })),
        totals: {
          sousTotal: devis.subtotal ?? 0,
          remise: devis.discount ?? 0,
          tva: (devis.total ?? 0) - (devis.subtotal ?? 0),
          totalTTC: devis.total ?? 0,
        },
        conditionsPaiement: "À réception",
      },
      settings,
      { logo: logoUrl, signature: signatureUrl, cachet: cachetUrl },
    );
  };

  const listQuery = usePaginatedTable<Devis>({
    table: "devis_balances",
    tenantId,
    searchFields: ["number", "client_name"],
    search: debouncedQ,
    orderBy,
    page,
    pageSize,
    filters,
    enabled: !tenantLoading,
  });
  const data = listQuery.data?.rows ?? [];
  const totalCount = listQuery.data?.count ?? 0;
  const isLoading = listQuery.isLoading;
  const totalAmountQuery = useDevisTotalAmount(
    debouncedQ,
    statusFilterValue,
    settlementFilterValue,
  );

  const PAYMENT_BLOCKS_DELETE_MESSAGE =
    "Ce devis possède déjà un règlement et ne peut pas être supprimé. Vous pouvez l’archiver ou l’annuler.";

  const del = useMutation({
    mutationFn: async (devis: Devis) => {
      if (!tenantId) throw new Error("Locataire introuvable");
      // Court-circuite avant même d'appeler la base : un devis réglé (même
      // partiellement) ne doit jamais être envoyé en suppression — la FK
      // devis_payments_devis_id_tenant_id_fkey (ON DELETE RESTRICT, jamais
      // CASCADE) protège déjà les paiements côté serveur, ceci n'est qu'un
      // message clair côté client au lieu de laisser échouer la requête.
      if (devis.paid_total > 0) {
        throw new Error(PAYMENT_BLOCKS_DELETE_MESSAGE);
      }
      const { error } = await (supabase.from("devis").delete() as any)
        .eq("id", devis.id)
        .eq("tenant_id", tenantId);
      if (error) {
        // Filet de sécurité si un règlement a été enregistré entre le
        // chargement de la liste et le clic sur Supprimer : ne jamais laisser
        // remonter le message Postgres brut (nom de contrainte, code SQL...).
        if (error.code === "23503" || /devis_payments/i.test(error.message ?? "")) {
          throw new Error(PAYMENT_BLOCKS_DELETE_MESSAGE);
        }
        console.error("Échec de la suppression du devis", error);
        throw new Error("La suppression a échoué. Réessayez ou contactez le support.");
      }
      return devis;
    },
    onSuccess: async (devis) => {
      if (userId) {
        await logAction(userId, roleId ?? null, "delete", "devis", {
          devis_number: devis.number,
        });
      }
      trackBusinessEvent(
        analyticsEvents.quoteDeleted,
        {
          tenant_id: tenantId ?? null,
          platform_type: "ERP",
          module: "devis",
        },
        {
          quote_id: devis.id,
          quote_number: devis.number,
        },
      );
      toast.success("Devis supprimé");
      qc.invalidateQueries({ queryKey: ["devis"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setDeleteTarget(null),
  });

  return (
    <AppShell title="Devis" subtitle="Propositions commerciales et suivi">
      <div className="-m-4 bg-muted/40 p-4 md:-m-8 md:p-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as DevisTab)} className="mb-3">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:bg-card"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <ResourceSummaryBar
          count={totalCount}
          page={page}
          pageSize={pageSize}
          itemLabelSingular="devis"
          itemLabelPlural="devis"
          totalLabel="Montant total"
          total={totalAmountQuery.data ?? 0}
          totalLoading={totalAmountQuery.isLoading}
        />
        <PremiumResourceList<Devis>
          items={data}
          isLoading={isLoading}
          singular="Devis"
          plural="Devis"
          searchValue={q}
          onSearchChange={setQ}
          nameField="client_name"
          nameSortLabel="Client"
          dateField="created_at"
          serverPagination={{
            page,
            pageSize,
            totalCount,
            onPageChange: setPage,
            isFetching: listQuery.isFetching,
          }}
          sort={sort}
          onSortChange={setSort}
          emptyState={{
            icon: <FileText className="h-10 w-10 text-muted-foreground/50" />,
            title: "Aucun devis",
            subtitle: "Créez votre premier devis pour commencer.",
          }}
          createSlot={
            canCreateDevis ? (
              <button
                onClick={() => setCreating(true)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-500/25 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/30 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Nouveau devis
              </button>
            ) : undefined
          }
          renderCard={(row) => (
            <DevisCard
              row={row}
              canDelete={canDeleteDevis}
              canCollect={canEditDevis}
              onEdit={() => setEditId(row.id)}
              onDelete={() => setDeleteTarget(row)}
              onDownloadPdf={() => downloadPDF(row)}
              onCollect={() => setPayingDevis(row)}
            />
          )}
        />
      </div>

      <AnimatePresence>
        {(creating || editId) && (
          <LineItemsDialog
            headerTable="devis"
            itemsTable="devis_items"
            fkColumn="devis_id"
            partnerTable="clients"
            partnerLabel="Client"
            numberPrefix="DEV"
            singular="Devis"
            tenantId={tenantId}
            extraFields={[
              { name: "status", label: "Statut", type: "select", options: [...STATUSES] },
              { name: "due_date", label: "Échéance", type: "date" },
            ]}
            initialId={editId}
            onClose={() => {
              setEditId(null);
              setCreating(false);
            }}
          />
        )}
      </AnimatePresence>

      <DevisPaymentDialog
        devis={payingDevis}
        open={Boolean(payingDevis)}
        onOpenChange={(open) => {
          if (!open) setPayingDevis(null);
        }}
        onSuccess={() => {
          setPayingDevis(null);
          qc.invalidateQueries({ queryKey: ["devis"] });
        }}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !del.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le devis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive et supprimera ce devis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={del.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget && !del.isPending) del.mutate(deleteTarget);
              }}
            >
              {del.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
