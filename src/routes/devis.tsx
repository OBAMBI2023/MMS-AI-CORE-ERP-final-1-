import { createFileRoute } from "@tanstack/react-router";
import { PLATFORM_BRANDING } from "@/config/branding";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Search, FileDown } from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { LineItemsDialog } from "@/components/mms/LineItemsDialog";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/mms/format";
import { generateDevisPDF } from "@/lib/mms/pdf-generator";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  const setStatus = useMutation({
    mutationFn: async (v: { id: string; status: string | null }) => {
      if (!tenantId) throw new Error("Locataire introuvable");
      const { error } = await (supabase
        .from("devis")
        .update({ status: v.status }) as any)
        .eq("id", v.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devis"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = data.filter(
    (d) =>
      !q ||
      (d.number ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (d.client_name ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <TooltipProvider>
      <AppShell title="Devis" subtitle="Propositions commerciales et suivi">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher un devis..."
                className="w-full rounded-xl bg-muted/60 border border-border pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/40"
              />
            </div>
            {canCreateDevis && (
                <button
                onClick={() => setCreating(true)}
                className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
                >
                <Plus className="h-4 w-4" /> Nouveau devis
                </button>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto w-full">
            <table className="w-full text-sm min-w-max">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Numéro</th>
                  <th className="text-left px-4 py-3 font-medium">Client</th>
                  <th className="text-left px-4 py-3 font-medium">Échéance</th>
                  <th className="text-left px-4 py-3 font-medium">Statut</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      Aucun devis {q ? "trouvé" : "pour l'instant"}.
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => (
                    <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{d.number}</td>
                      <td className="px-4 py-3">{d.client_name ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(d.due_date)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={d.status ?? ""}
                          onChange={(e) => setStatus.mutate({ id: d.id, status: e.target.value || null })}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${statusColor[d.status ?? ""] ?? "bg-muted text-muted-foreground"}`}
                        >
                          <option value="">— Aucun —</option>
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {formatCurrency(Number(d.total))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
                                onClick={() => downloadPDF(d)}
                              >
                                <FileDown className="h-4 w-4 mr-2" /> PDF
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Télécharger le devis</TooltipContent>
                          </Tooltip>
                          <button
                            onClick={() => setEditId(d.id)}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {canDeleteDevis && (
                            <button
                                onClick={() => confirm("Supprimer ce devis ?") && del.mutate(d)}
                                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
    </TooltipProvider>
  );
}
