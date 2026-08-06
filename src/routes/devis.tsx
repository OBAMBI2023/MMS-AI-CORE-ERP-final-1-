import { createFileRoute } from "@tanstack/react-router";
import { PLATFORM_BRANDING } from "@/config/branding";
import { useState } from "react";
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
} from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { LineItemsDialog } from "@/components/mms/LineItemsDialog";
import { PremiumResourceList } from "@/components/mms/PremiumResourceList";
import { ResourceCard, type ResourceCardDetail, type ResourceCardFooterAction } from "@/components/mms/ResourceCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/mms/format";
import { generateDevisPDF } from "@/lib/mms/pdf-generator";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { usePermissions } from "@/hooks/use-permissions";
import { useActionPermission } from "@/hooks/use-action-permission";
import { logAction } from "@/lib/audit.server";
import { useTenant } from "@/providers/TenantProvider";

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

export const Route = createFileRoute("/devis")({
  component: DevisPage,
  head: () => ({
    meta: [
      { title: `Devis — ${PLATFORM_BRANDING.productName}` },
      { name: "description", content: "Gestion des devis clients." },
    ],
  }),
});

function DevisCard({
  row,
  canDelete,
  onEdit,
  onDelete,
  onDownloadPdf,
}: {
  row: Devis;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDownloadPdf: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const qc = useQueryClient();

  const setStatus = useMutation({
    mutationFn: async (status: string | null) => {
      const { error } = await (supabase.from("devis").update({ status }) as any).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devis"] }),
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

  const footerActions: ResourceCardFooterAction[] = [
    {
      key: "view",
      icon: Eye,
      label: "Voir",
      onClick: () => setDetailsOpen(true),
      colorClass: "text-gray-600 hover:bg-gray-50 active:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-500/10",
    },
    {
      key: "pdf",
      icon: FileDown,
      label: "PDF",
      onClick: onDownloadPdf,
      colorClass: "text-blue-600 hover:bg-blue-50 active:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-500/10",
    },
    {
      key: "edit",
      icon: Pencil,
      label: "Modifier",
      onClick: onEdit,
      colorClass:
        "text-violet-600 hover:bg-violet-50 active:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-500/10",
    },
    {
      key: "delete",
      icon: Trash2,
      label: "Supprimer",
      onClick: onDelete,
      colorClass: "text-red-600 hover:bg-red-50 active:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/10",
      disabled: !canDelete,
    },
  ];

  return (
    <>
      <ResourceCard
        leading={{ variant: "icon", icon: FileText, className: "bg-violet-500" }}
        title={title.toUpperCase()}
        badge={{ label: row.number, className: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" }}
        headerInfo={{ value: formatCurrency(Number(row.total)), className: "text-primary" }}
        details={details}
        footerActions={footerActions}
      />

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
              <span className="text-base font-bold text-primary">{formatCurrency(Number(row.total))}</span>
            </div>
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
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
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

function DevisPage() {
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const { settings } = useCompanySettings(tenantLoading ? null : tenantId);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: userData } = useQuery({ queryKey: ["user"], queryFn: () => supabase.auth.getUser() });
  const permissionsQuery = usePermissions();
  const { roleId } = permissionsQuery.data || { roleId: null };
  const userId = userData?.data?.user?.id;
  const canDeleteDevis = useActionPermission("devis.delete");
  const canCreateDevis = useActionPermission("devis.create");

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

  const { data = [], isLoading } = useQuery({
    queryKey: ["devis", tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error("Locataire introuvable");
      const { data, error } = await (supabase
        .from("devis")
        .select("*") as any)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Devis[];
    },
    enabled: !tenantLoading && Boolean(tenantId),
  });

  const del = useMutation({
    mutationFn: async (devis: Devis) => {
      if (!tenantId) throw new Error("Locataire introuvable");
      const { error } = await (supabase
        .from("devis")
        .delete() as any)
        .eq("id", devis.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return devis;
    },
    onSuccess: async (devis) => {
      if (userId) {
        await logAction(userId, roleId ?? null, "delete", "devis", {
          devis_number: devis.number,
        });
      }
      toast.success("Devis supprimé");
      qc.invalidateQueries({ queryKey: ["devis"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = data.filter(
    (d) =>
      !q ||
      (d.number ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (d.client_name ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell title="Devis" subtitle="Propositions commerciales et suivi">
      <div className="-m-4 bg-muted/40 p-4 md:-m-8 md:p-8">
        <PremiumResourceList<Devis>
          items={filtered}
          isLoading={isLoading}
          singular="Devis"
          plural="Devis"
          searchValue={q}
          onSearchChange={setQ}
          nameField="client_name"
          nameSortLabel="Client"
          dateField="created_at"
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
              onEdit={() => setEditId(row.id)}
              onDelete={() => {
                if (confirm("Supprimer ce devis ?")) del.mutate(row);
              }}
              onDownloadPdf={() => downloadPDF(row)}
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
    </AppShell>
  );
}
