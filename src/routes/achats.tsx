import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { LineItemsDialog } from "@/components/mms/LineItemsDialog";
import { supabase } from "@/integrations/supabase/client";
import { formatFCFA, formatDateTime } from "@/lib/mms/format";

interface Achat {
  id: string;
  number: string;
  fournisseur_name: string | null;
  total: number;
  created_at: string;
}

export const Route = createFileRoute("/achats")({
  component: AchatsPage,
  head: () => ({
    meta: [
      { title: "Achats — MMS AI CORE" },
      { name: "description", content: "Suivi des achats fournisseurs." },
    ],
  }),
});

function AchatsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["achats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achats")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Achat[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("achats").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Achat supprimé");
      qc.invalidateQueries({ queryKey: ["achats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = data.filter(
    (d) =>
      !q ||
      (d.number ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (d.fournisseur_name ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell title="Achats" subtitle="Approvisionnements et commandes fournisseurs">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un achat..."
              className="w-full rounded-xl bg-muted/60 border border-border pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/40"
            />
          </div>
          <button
            onClick={() => setCreating(true)}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nouvel achat
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-x-auto w-full">
          <table className="w-full text-sm min-w-max">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Numéro</th>
                <th className="text-left px-4 py-3 font-medium">Fournisseur</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    Aucun achat {q ? "trouvé" : "pour l'instant"}.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{d.number}</td>
                    <td className="px-4 py-3">{d.fournisseur_name ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDateTime(d.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      {formatFCFA(Number(d.total))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditId(d.id)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => confirm("Supprimer cet achat ?") && del.mutate(d.id)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
            headerTable="achats"
            itemsTable="achat_items"
            fkColumn="achat_id"
            partnerTable="fournisseurs"
            partnerLabel="Fournisseur"
            numberPrefix="ACH"
            singular="Achat"
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
