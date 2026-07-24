import { useEffect, useState } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency, makeNumber } from "@/lib/mms/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface LineItem {
  id?: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
}

export interface LineItemsDialogProps {
  headerTable: string; // 'devis' | 'achats' | 'ventes'
  itemsTable: string; // 'devis_items' | 'achat_items' | 'vente_items'
  fkColumn: string; // 'devis_id' | 'achat_id' | 'vente_id'
  partnerTable?: "clients" | "fournisseurs";
  partnerLabel: string;
  numberPrefix: string;
  singular: string;
  extraFields?: {
    name: string;
    label: string;
    type?: "select" | "date" | "textarea" | "text";
    options?: string[];
  }[];
  initialId?: string | null;
  onClose: () => void;
}

const db = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => {
      eq: (
        col: string,
        v: unknown,
      ) => Promise<{ data: unknown; error: Error | null }> & {
        maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
        order: (
          c: string,
          o?: { ascending?: boolean },
        ) => Promise<{ data: unknown; error: Error | null }>;
      };
      order: (
        c: string,
        o?: { ascending?: boolean },
      ) => Promise<{ data: unknown; error: Error | null }>;
    };
    insert: (p: Record<string, unknown> | Record<string, unknown>[]) => Promise<{
      error: Error | null;
    }> & {
      select: (c: string) => {
        single: () => Promise<{ data: { id: string } | null; error: Error | null }>;
      };
    };
    update: (p: Record<string, unknown>) => {
      eq: (c: string, v: unknown) => Promise<{ error: Error | null }>;
    };
    delete: () => { eq: (c: string, v: unknown) => Promise<{ error: Error | null }> };
  };
};

export function LineItemsDialog(props: LineItemsDialogProps) {
  const {
    headerTable,
    itemsTable,
    fkColumn,
    partnerTable,
    partnerLabel,
    numberPrefix,
    singular,
    extraFields = [],
    initialId,
    onClose,
  } = props;
  const qc = useQueryClient();
  const isEdit = Boolean(initialId);
  const permissionsQuery = usePermissions();
  const canManageSales = permissionsQuery.data?.role === "Administrateur";

  const [partnerId, setPartnerId] = useState<string>("");
  const [partnerName, setPartnerName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<LineItem[]>([{ name: "", unit: "unité", qty: 1, price: 0 }]);
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [discount, setDiscount] = useState(0);

  const { data: partners = [] } = useQuery({
    queryKey: [partnerTable ?? "no-partner"],
    queryFn: async () => {
      if (!partnerTable) return [] as { id: string; name: string }[];
      const { data, error } = await db
        .from(partnerTable)
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as { id: string; name: string }[]) ?? [];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", "active"],
    queryFn: async () => {
      const { data, error } = await db
        .from("services")
        .select("id, name, unit, price")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as { id: string; name: string; unit: string; price: number }[]) ?? [];
    },
  });

  useEffect(() => {
    if (!isEdit || !initialId) return;
    (async () => {
      const { data: head, error: e1 } = await db
        .from(headerTable)
        .select("*")
        .eq("id", initialId)
        .maybeSingle();
      if (e1 || !head) return;
      const h = head as Record<string, unknown>;
      setPartnerId(
        (h[fkColumn.replace("_id", partnerTable === "clients" ? "_id" : "_id")] as string) ?? "",
      );
      setPartnerId(
        (h[partnerTable === "clients" ? "client_id" : "fournisseur_id"] as string) ?? "",
      );
      setPartnerName(
        (h[partnerTable === "clients" ? "client_name" : "fournisseur_name"] as string) ?? "",
      );
      setNotes((h.notes as string) ?? "");
      setDiscount(Number(h.discount ?? 0));
      const ex: Record<string, string> = {};
      for (const f of extraFields) ex[f.name] = (h[f.name] as string) ?? "";
      setExtra(ex);
      const { data: rows } = await db
        .from(itemsTable)
        .select("id, name, unit, qty, price")
        .eq(fkColumn, initialId);
      const list = (rows as LineItem[]) ?? [];
      if (list.length) setItems(list);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId, isEdit]);

  const subtotal = items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.price || 0), 0);
  const total = Math.max(0, subtotal - Number(discount || 0));

  const saveMut = useMutation({
    mutationFn: async () => {
      if (headerTable === "ventes" && isEdit && !canManageSales) {
        throw new Error("Accès refusé");
      }

      const validItems = items.filter((i) => i.name && Number(i.qty) > 0);
      if (validItems.length === 0) throw new Error("Ajoutez au moins une ligne");
      const partnerFk = partnerTable === "clients" ? "client_id" : "fournisseur_id";
      const partnerNameCol = partnerTable === "clients" ? "client_name" : "fournisseur_name";
      const payload: Record<string, unknown> = {
        [partnerFk]: partnerId || null,
        [partnerNameCol]: partnerName || partners.find((p) => p.id === partnerId)?.name || null,
        subtotal,
        total,
        notes: notes || null,
        discount: headerTable === "devis" ? Number(discount || 0) : 0,
      };

      for (const f of extraFields) payload[f.name] = extra[f.name] || null;

      let headerId = initialId;
      if (isEdit && headerId) {
        const { error } = await db.from(headerTable).update(payload).eq("id", headerId);
        if (error) throw error;
        await db.from(itemsTable).delete().eq(fkColumn, headerId);
      } else {
        payload.number = makeNumber(numberPrefix);
        const ins = await db.from(headerTable).insert(payload).select("id").single();
        if (ins.error || !ins.data) throw ins.error ?? new Error("Création échouée");
        headerId = ins.data.id;
      }
      const rows = validItems.map((i) => ({
        [fkColumn]: headerId,
        name: i.name,
        unit: i.unit || null,
        qty: Number(i.qty),
        price: Number(i.price),
        line_total: Number(i.qty) * Number(i.price),
      }));
      const { error: e2 } = await db.from(itemsTable).insert(rows);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success(isEdit ? `${singular} mis à jour` : `${singular} créé`);
      qc.invalidateQueries({ queryKey: [headerTable] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Modifier ${singular.toLowerCase()}` : `Nouveau ${singular.toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMut.mutate();
          }}
          className="space-y-5"
        >
          <div className="max-h-[60vh] overflow-y-auto space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">{partnerLabel}</span>
                <select
                  value={partnerId}
                  onChange={(e) => {
                    setPartnerId(e.target.value);
                    setPartnerName("");
                  }}
                  className="w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40"
                >
                  <option value="">— Sélectionner —</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Ou saisir un nom libre
                </span>
                <input
                  value={partnerName}
                  onChange={(e) => {
                    setPartnerName(e.target.value);
                    if (e.target.value) setPartnerId("");
                  }}
                  className="w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40"
                />
              </label>
              {extraFields.map((f) => (
                <label key={f.name} className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                  {f.type === "select" ? (
                    <select
                      value={extra[f.name] ?? ""}
                      onChange={(e) => setExtra((s) => ({ ...s, [f.name]: e.target.value }))}
                      className="w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40"
                    >
                      <option value="">—</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type ?? "text"}
                      value={extra[f.name] ?? ""}
                      onChange={(e) => setExtra((s) => ({ ...s, [f.name]: e.target.value }))}
                      className="w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40"
                    />
                  )}
                </label>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Lignes</h4>
                <button
                  type="button"
                  onClick={() =>
                    setItems((arr) => [...arr, { name: "", unit: "unité", qty: 1, price: 0 }])
                  }
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
                </button>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  <div className="col-span-5">Désignation</div>
                  <div className="col-span-2">Unité</div>
                  <div className="col-span-1 text-right">Qté</div>
                  <div className="col-span-2 text-right">P.U.</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-1" />
                </div>
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-border items-center"
                  >
                    <input
                      list="svc-list"
                      value={it.name}
                      onChange={(e) => {
                        const v = e.target.value;
                        const svc = services.find((s) => s.name === v);
                        if (svc)
                          updateItem(idx, {
                            name: svc.name,
                            unit: svc.unit,
                            price: Number(svc.price),
                          });
                        else updateItem(idx, { name: v });
                      }}
                      placeholder="Service..."
                      className="col-span-5 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm outline-none focus:border-primary/40"
                    />
                    <input
                      value={it.unit}
                      onChange={(e) => updateItem(idx, { unit: e.target.value })}
                      className="col-span-2 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm outline-none focus:border-primary/40"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.qty}
                      onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                      className="col-span-1 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm text-right outline-none focus:border-primary/40"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={it.price}
                      onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
                      className="col-span-2 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm text-right outline-none focus:border-primary/40"
                    />
                    <div className="col-span-1 text-right text-sm font-medium">
                      {formatCurrency(Number(it.qty || 0) * Number(it.price || 0))}
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => setItems((a) => a.filter((_, i) => i !== idx))}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <datalist id="svc-list">
                  {services.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Notes</span>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <div className="rounded-xl bg-muted/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {headerTable === "devis" && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Remise</span>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-28 text-right rounded-lg bg-background border border-border px-2 py-1 text-sm outline-none"
                    />
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border font-semibold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
