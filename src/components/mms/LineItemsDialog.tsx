import { useEffect, useState } from "react";
import { X, Plus, Trash2, Loader2, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency, makeNumber } from "@/lib/mms/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCatalogSettings } from "@/hooks/use-catalog-settings";

export interface LineItem {
  id?: string;
  service_id?: string | null;
  item_type?: "service" | "product";
  cost_price?: number;
  selling_price?: number;
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
  tenantId?: string;
  onClose: () => void;
}

type DynamicQuery = PromiseLike<{ data: unknown; error: Error | null }> & {
  eq: (column: string, value: unknown) => DynamicQuery;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => Promise<{ data: unknown; error: Error | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
};

const db = supabase as unknown as {
  from: (t: string) => {
    select: (columns: string) => DynamicQuery;
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

function formatSupabaseError(error: unknown): string {
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  return [
    e.code && `code: ${e.code}`,
    e.message && `message: ${e.message}`,
    e.details && `details: ${e.details}`,
    e.hint && `hint: ${e.hint}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function LineItemsDialog(props: LineItemsDialogProps) {
  const catalogSettingsQuery = useCatalogSettings();
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
    tenantId,
    onClose,
  } = props;
  const qc = useQueryClient();
  const isEdit = Boolean(initialId);
  const isAchats = headerTable === "achats";
  const permissionsQuery = usePermissions();
  const canManageSales = permissionsQuery.data?.role === "Administrateur";

  const [partnerId, setPartnerId] = useState<string>("");
  const [partnerName, setPartnerName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<LineItem[]>([{ name: "", unit: "unité", qty: 0, price: 0 }]);
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [discount, setDiscount] = useState(0);

  const { data: partners = [] } = useQuery({
    queryKey: [partnerTable ?? "no-partner", tenantId],
    queryFn: async () => {
      if (!partnerTable) return [] as { id: string; name: string }[];
      let query = db.from(partnerTable).select("id, name");
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query.order("name", { ascending: true });
      if (error) throw error;
      return (data as { id: string; name: string }[]) ?? [];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", "active", tenantId, catalogSettingsQuery.data],
    queryFn: async () => {
      let query = db.from("services").select("id, name, unit, price, type, cost_price");
      if (tenantId) query = query.eq("tenant_id", tenantId);
      query = query.eq("active", true);
      const settings = catalogSettingsQuery.data;
      const allowedTypes: ("product" | "service")[] = [];
      if (settings?.catalog_mode !== "services" && (headerTable === "achats" || settings?.products_in_sales_enabled)) allowedTypes.push("product");
      if (headerTable !== "achats" && settings?.catalog_mode !== "products" && settings?.services_in_sales_enabled) allowedTypes.push("service");
      if (allowedTypes.length === 0) return [];
      if (allowedTypes.length === 1) query = query.eq("type", allowedTypes[0]);
      const { data, error } = await query.order("name", { ascending: true });
      if (error) throw error;
      return (
        data as {
          id: string;
          name: string;
          unit: string;
          price: number;
          type: "service" | "product";
          cost_price: number;
        }[]
      ) ?? [];
    },
    enabled: catalogSettingsQuery.isSuccess,
  });

  useEffect(() => {
    if (!isEdit || !initialId) return;
    (async () => {
      let headQuery = db.from(headerTable).select("*").eq("id", initialId);
      if (tenantId) headQuery = headQuery.eq("tenant_id", tenantId);
      const { data: head, error: e1 } = await headQuery.maybeSingle();
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
        .select("id, service_id, item_type, cost_price, selling_price, name, unit, qty, price")
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
      const isTenantScopedDocument = headerTable === "achats" || headerTable === "devis";
      if (isTenantScopedDocument && !tenantId) {
        throw new Error("Création bloquée : aucun tenant associé au compte.");
      }

      const validItems = items.filter((i) => i.name && Number(i.qty) > 0);
      if (validItems.length === 0) throw new Error("Ajoutez au moins une ligne");
      if (
        (headerTable === "ventes" || headerTable === "devis") &&
        validItems.some((item) => !item.service_id || !item.item_type)
      ) {
        throw new Error("Sélectionnez chaque produit ou service dans le catalogue.");
      }
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
      if (isTenantScopedDocument) payload.tenant_id = tenantId;

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
        ...(headerTable === "ventes" || headerTable === "devis"
          ? {
              service_id: i.service_id ?? null,
              item_type: i.item_type ?? "service",
              cost_price: i.item_type === "product" ? Number(i.cost_price ?? 0) : 0,
              ...(headerTable === "ventes" ? { selling_price: Number(i.price) } : {}),
            }
          : {}),
      }));
      const { error: e2 } = await db.from(itemsTable).insert(rows);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success(isEdit ? `${singular} mis à jour` : `${singular} créé`);
      qc.invalidateQueries({ queryKey: [headerTable] });
      onClose();
    },
    onError: (error: unknown) => {
      const message = formatSupabaseError(error) || "Erreur Supabase inconnue";
      console.error("Échec de l'enregistrement du document", error);
      toast.error(message);
    },
  });

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const partnerField = (
    <>
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
        <span className="text-xs font-medium text-muted-foreground">Ou saisir un nom libre</span>
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
    </>
  );

  const notesField = (
    <textarea
      rows={isAchats ? 3 : 2}
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      className={
        isAchats
          ? "w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40 resize-none"
          : "w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40"
      }
    />
  );

  const nameInput = (idx: number, it: LineItem, className: string) => (
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
            service_id: svc.id,
            item_type: svc.type,
            cost_price: Number(svc.cost_price),
            selling_price: Number(svc.price),
          });
        else updateItem(idx, { name: v });
      }}
      placeholder={isAchats ? "Produit..." : "Service..."}
      className={className}
    />
  );

  const unitInput = (idx: number, it: LineItem, className: string) => (
    <input
      value={it.unit}
      onChange={(e) => updateItem(idx, { unit: e.target.value })}
      className={className}
    />
  );

  const qtyInput = (idx: number, it: LineItem, className: string) => (
    <input
      type="number"
      min="0"
      step="0.01"
      value={it.qty === 0 || it.qty === undefined || it.qty === null ? "" : it.qty}
      placeholder="0"
      onChange={(e) =>
        updateItem(idx, { qty: e.target.value === "" ? 0 : Number(e.target.value) })
      }
      className={className}
    />
  );

  const priceInput = (idx: number, it: LineItem, className: string) => (
    <input
      type="number"
      min="0"
      step="1"
      value={it.price === 0 || it.price === undefined || it.price === null ? "" : it.price}
      placeholder="0"
      onChange={(e) =>
        updateItem(idx, { price: e.target.value === "" ? 0 : Number(e.target.value) })
      }
      className={className}
    />
  );

  const removeLineButton = (idx: number, className: string) => (
    <button
      type="button"
      onClick={() => setItems((a) => a.filter((_, i) => i !== idx))}
      className={className}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );

  const addLineButton = (className: string) => (
    <button
      type="button"
      onClick={() => setItems((arr) => [...arr, { name: "", unit: "unité", qty: 0, price: 0 }])}
      className={className}
    >
      <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
    </button>
  );

  const summaryBlock = isAchats ? (
    <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2.5 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Sous-total</span>
        <span className="font-medium">{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between pt-2.5 border-t border-border">
        <span className="text-sm font-semibold">Total</span>
        <span className="text-2xl font-bold text-primary break-all text-right">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  ) : (
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
  );

  const svcDatalist = (
    <datalist id="svc-list">
      {services.map((s) => (
        <option key={s.id} value={s.name} />
      ))}
    </datalist>
  );

  const footerButtons = (
    <>
      <button
        type="button"
        onClick={onClose}
        className={
          isAchats
            ? "px-4 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted"
            : "px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted"
        }
      >
        Annuler
      </button>
      <button
        type="submit"
        disabled={saveMut.isPending}
        className={
          isAchats
            ? "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
            : "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
        }
      >
        {saveMut.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isAchats ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : null}
        {isEdit ? "Enregistrer" : isAchats ? "Créer l'achat" : "Créer"}
      </button>
    </>
  );

  if (isAchats) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-4xl">
          <DialogHeader className="flex-row items-start gap-3 space-y-0 pb-4 border-b border-border">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <DialogTitle className="text-lg font-semibold">
                {isEdit ? "Modifier l'achat" : "Nouvel achat"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isEdit
                  ? "Modifiez les informations de cet achat fournisseur."
                  : "Enregistrez un nouvel approvisionnement fournisseur."}
              </p>
            </div>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate();
            }}
            className="space-y-5"
          >
            <div className="max-h-[65vh] overflow-y-auto space-y-5 pr-1">
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{partnerField}</div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">Lignes d'achat</h4>
                  {addLineButton(
                    "inline-flex items-center gap-1.5 rounded-lg border border-primary/30 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/5",
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block rounded-xl border border-border overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    <div className="col-span-5">Désignation</div>
                    <div className="col-span-2">Unité</div>
                    <div className="col-span-1 text-right">Quantité</div>
                    <div className="col-span-2 text-right">Prix unitaire</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-1" />
                  </div>
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-border items-center"
                    >
                      {nameInput(
                        idx,
                        it,
                        "col-span-5 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm outline-none focus:border-primary/40",
                      )}
                      {unitInput(
                        idx,
                        it,
                        "col-span-2 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm outline-none focus:border-primary/40",
                      )}
                      {qtyInput(
                        idx,
                        it,
                        "col-span-1 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm text-right outline-none focus:border-primary/40",
                      )}
                      {priceInput(
                        idx,
                        it,
                        "col-span-2 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm text-right outline-none focus:border-primary/40",
                      )}
                      <div className="col-span-1 text-right text-sm font-medium">
                        {formatCurrency(Number(it.qty || 0) * Number(it.price || 0))}
                      </div>
                      <div className="col-span-1 text-right">
                        {removeLineButton(idx, "p-1 text-muted-foreground hover:text-destructive")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border p-3 space-y-2 bg-muted/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        {nameInput(
                          idx,
                          it,
                          "flex-1 min-w-0 rounded-lg bg-background border border-border px-2 py-1.5 text-sm outline-none focus:border-primary/40",
                        )}
                        {removeLineButton(
                          idx,
                          "p-1.5 shrink-0 text-muted-foreground hover:text-destructive",
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-muted-foreground">
                            Unité
                          </span>
                          {unitInput(
                            idx,
                            it,
                            "w-full rounded-lg bg-background border border-border px-2 py-1.5 text-sm outline-none focus:border-primary/40",
                          )}
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-muted-foreground">
                            Quantité
                          </span>
                          {qtyInput(
                            idx,
                            it,
                            "w-full rounded-lg bg-background border border-border px-2 py-1.5 text-sm text-right outline-none focus:border-primary/40",
                          )}
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 items-end">
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-muted-foreground">
                            Prix unitaire
                          </span>
                          {priceInput(
                            idx,
                            it,
                            "w-full rounded-lg bg-background border border-border px-2 py-1.5 text-sm text-right outline-none focus:border-primary/40",
                          )}
                        </label>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[10px] uppercase text-muted-foreground">
                            Total
                          </span>
                          <div className="rounded-lg bg-muted/50 px-2 py-1.5 text-sm text-right font-semibold truncate">
                            {formatCurrency(Number(it.qty || 0) * Number(it.price || 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {svcDatalist}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Notes</span>
                  {notesField}
                </label>
                {summaryBlock}
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-4 border-t border-border">
              {footerButtons}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

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
            <div className="grid grid-cols-2 gap-4">{partnerField}</div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Lignes</h4>
                {addLineButton("inline-flex items-center gap-1 text-xs text-primary hover:underline")}
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
                    {nameInput(
                      idx,
                      it,
                      "col-span-5 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm outline-none focus:border-primary/40",
                    )}
                    {unitInput(
                      idx,
                      it,
                      "col-span-2 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm outline-none focus:border-primary/40",
                    )}
                    {qtyInput(
                      idx,
                      it,
                      "col-span-1 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm text-right outline-none focus:border-primary/40",
                    )}
                    {priceInput(
                      idx,
                      it,
                      "col-span-2 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm text-right outline-none focus:border-primary/40",
                    )}
                    <div className="col-span-1 text-right text-sm font-medium">
                      {formatCurrency(Number(it.qty || 0) * Number(it.price || 0))}
                    </div>
                    <div className="col-span-1 text-right">
                      {removeLineButton(idx, "p-1 text-muted-foreground hover:text-destructive")}
                    </div>
                  </div>
                ))}
                {svcDatalist}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Notes</span>
                {notesField}
              </label>
              {summaryBlock}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            {footerButtons}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
