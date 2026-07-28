import { Fragment, useMemo, useRef, useState } from "react";
import { useActionPermission } from "@/hooks/use-action-permission";
import { usePermissions } from "@/hooks/use-permissions";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { makeNumber, formatCurrency, formatNumber } from "@/lib/mms/format";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  MessageCircle,
  CreditCard,
  Wallet,
  Smartphone,
  Banknote,
  X,
  Check,
  Receipt as ReceiptIcon,
  Image as ImageIcon,
  Menu,
  Sparkles,
} from "lucide-react";
import { Sidebar } from "@/components/mms/Sidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "@/components/mms/SidebarContent";
import { SalesHistoryModal } from "@/components/mms/SalesHistoryModal";
import { LineItemsDialog } from "@/components/mms/LineItemsDialog";
import { History } from "lucide-react";
import { useTenant } from "@/providers/TenantProvider";
import { useCatalogItems } from "@/hooks/use-catalog-items";

// ---------------- Types & catalogue ----------------
type Category = string;
type Service = {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  unit: string;
  category: Category;
  type: "product" | "service";
  photoUrl: string | null;
  stock: number | null;
};

type CartItem = Service & { qty: number };
type PayMethod = "Espèces" | "Wave" | "Orange Money" | "Carte";
type CatalogTab = Service["type"];

// ---------------- POS Page ----------------
export function PosPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<CatalogTab>("product");
  const [category, setCategory] = useState<Category | "Tous">("Tous");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [client, setClient] = useState("");
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<PayMethod>("Espèces");
  const [checkout, setCheckout] = useState<null | Ticket>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const { profile, tenant, loading: tenantLoading } = useTenant();

  const {
    data: dbServices,
    loading: catalogLoading,
    error: catalogError,
    reload: reloadCatalog,
  } = useCatalogItems({ activeOnly: true });

  const { settings, logoUrl } = useCompanySettings(
    tenantLoading ? null : (profile?.tenant_id ?? null),
  );
  const tenantIdentity = useMemo(
    () => ({
      name:
        settings?.company_name?.trim() ||
        (typeof tenant?.name === "string" ? tenant.name.trim() : ""),
      tradeName: settings?.trade_name?.trim() ?? "",
      logoUrl: logoUrl ?? null,
      phone: settings?.phone?.trim() ?? "",
      whatsapp: settings?.whatsapp?.trim() ?? "",
      email: settings?.email?.trim() ?? "",
      address: [settings?.address?.trim(), settings?.city?.trim()].filter(Boolean).join(", "),
      website: settings?.website?.trim() ?? "",
      taxNumber: settings?.tax_number?.trim() ?? "",
      rccm: settings?.rccm?.trim() ?? "",
    }),
    [logoUrl, settings, tenant],
  );
  const canProcessSale = useActionPermission("ventes.create");
  const permissionsQuery = usePermissions();
  const canManageSales = permissionsQuery.data?.role === "Administrateur";

  const photoPaths = useMemo(
    () => dbServices.flatMap((service) => (service.photo_url ? [service.photo_url] : [])),
    [dbServices],
  );
  const { data: catalogPhotoUrls = {} } = useQuery({
    queryKey: ["catalog-images", photoPaths],
    enabled: photoPaths.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("catalog-images")
        .createSignedUrls(photoPaths, 60 * 60);
      if (error) throw error;
      return Object.fromEntries(
        (data ?? []).map((entry) => [entry.path, entry.signedUrl]).filter((entry) => entry[1]),
      ) as Record<string, string>;
    },
    staleTime: 50 * 60 * 1000,
    retry: false,
  });

  const catalog: Service[] = useMemo(() => {
    return dbServices.map((service) => ({
      id: service.id,
      name: service.name,
      price: Number(service.price),
      costPrice: Number(service.cost_price),
      unit: service.unit ?? "unité",
      category: service.category,
      type: service.type === "product" ? "product" : "service",
      photoUrl: service.photo_url ? (catalogPhotoUrls[service.photo_url] ?? null) : null,
      stock: service.stock === null ? null : Number(service.stock),
    }));
  }, [catalogPhotoUrls, dbServices]);

  const categories = useMemo(
    () => [
      "Tous",
      ...Array.from(
        new Set(catalog.filter((item) => item.type === activeTab).map((item) => item.category)),
      ).sort(),
    ],
    [activeTab, catalog],
  );

  const filtered = useMemo(() => {
    return catalog.filter((s) => {
      const matchType = s.type === activeTab;
      const matchCat = category === "Tous" || s.category === category;
      const matchQ = s.name.toLowerCase().includes(query.toLowerCase());
      return matchType && matchCat && matchQ;
    });
  }, [activeTab, query, category, catalog]);

  const selectTab = (tab: CatalogTab) => {
    setActiveTab(tab);
    setCategory("Tous");
  };

  const subTotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);
  const total = Math.max(0, subTotal - discount);

  const addToCart = (s: Service) => {
    if (s.type === "product" && s.stock !== null && s.stock < 1) {
      toast.error("Cet article est en rupture de stock.");
      return;
    }
    setCart((c) => {
      const found = c.find((i) => i.id === s.id);
      if (found) {
        if (s.type === "product" && s.stock !== null && found.qty >= s.stock) {
          toast.error("Stock disponible atteint.");
          return c;
        }
        return c.map((i) => (i.id === s.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...c, { ...s, qty: 1 }];
    });
  };
  const setQty = (id: string, qty: number) => {
    if (qty <= 0) return setCart((c) => c.filter((i) => i.id !== id));
    setCart((c) =>
      c.map((i) => {
        if (i.id !== id) return i;
        if (i.type === "product" && i.stock !== null && qty > i.stock) {
          toast.error("Stock disponible atteint.");
          return { ...i, qty: i.stock };
        }
        return { ...i, qty };
      }),
    );
  };
  const clearCart = () => {
    setCart([]);
    setClient("");
    setDiscount(0);
  };

  const validate = async () => {
    if (cart.length === 0) return;
    if (!profile?.tenant_id) {
      toast.error("Impossible de créer la vente : aucun tenant courant n'est disponible.");
      return;
    }
    setSaving(true);
    const number = "T-" + Math.floor(Math.random() * 900000 + 100000);
    const dbNumber = makeNumber("VTE");
    try {
      const { data: venteRow, error: e1 } = await supabase
        .from("ventes")
        .insert({
          number: dbNumber,
          client_name: client || "Client comptoir",
          subtotal: subTotal,
          discount,
          total,
          payment_method: payment,
          cashier: "Bamba",
          tenant_id: profile.tenant_id,
        })
        .select("id")
        .single();
      if (e1 || !venteRow) throw e1 ?? new Error("Insertion échouée");
      const rows = cart.map((i) => ({
        vente_id: venteRow.id,
        service_id: /^[0-9a-f-]{36}$/i.test(i.id) ? i.id : null,
        name: i.name,
        unit: i.unit,
        qty: i.qty,
        price: i.price,
        item_type: i.type,
        cost_price: i.type === "product" ? i.costPrice : 0,
        selling_price: i.price,
        line_total: i.qty * i.price,
      }));
      const { error: e2 } = await supabase.from("vente_items").insert(rows);
      if (e2) throw e2;
      queryClient.invalidateQueries({ queryKey: ["ventes", "history"] });
      void reloadCatalog();
      toast.success(`Vente enregistrée (${dbNumber})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur d'enregistrement";
      toast.error(msg);
      setSaving(false);
      return;
    }
    const ticket: Ticket = {
      number: dbNumber || number,
      date: new Date(),
      items: cart,
      subTotal,
      discount,
      total,
      payment,
      client: client || "Client comptoir",
      cashier: "Bamba",
    };
    setCheckout(ticket);
    setSaving(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-background text-foreground">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col md:flex-row min-h-0 min-w-0">
        {/* Catalogue */}
        <section className="flex-1 flex flex-col min-h-0 min-w-0 border-b md:border-b-0 md:border-r border-border pb-[40vh] md:pb-0">
          <header className="px-4 md:px-6 pt-4 md:pt-6 pb-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3 md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[300px] p-0 bg-sidebar text-sidebar-foreground"
                >
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <div className="flex flex-col h-full p-4 gap-2">
                    <div className="flex items-center gap-2 px-2 py-4">
                      <div className="grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg shadow-primary/30">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold tracking-tight">
                          {settings?.company_name ?? "Mon Entreprise"}
                        </div>
                      </div>
                    </div>
                    <SidebarContent onItemClick={() => setMobileMenuOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Point de vente</h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Produits et services de votre catalogue
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-[10px] md:text-xs text-muted-foreground">
                  {new Date().toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-7 md:h-8 text-[10px] md:text-xs"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="h-3.5 w-3.5" /> Historique
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 mb-3">
              {[
                { value: "product" as const, label: "Produits" },
                { value: "service" as const, label: "Services" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => selectTab(tab.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.value
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  activeTab === "product"
                    ? "Rechercher un produit..."
                    : "Rechercher un service..."
                }
                className="w-full rounded-xl md:rounded-2xl bg-muted/60 border border-border pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/40 transition"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 md:gap-2 mt-3">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-medium transition-colors ${
                    category === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 md:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
              {filtered.map((s) => {
                const outOfStock = s.type === "product" && s.stock !== null && s.stock < 1;
                return (
                  <motion.button
                    key={s.id}
                    whileHover={outOfStock ? undefined : { y: -2 }}
                    whileTap={outOfStock ? undefined : { scale: 0.98 }}
                    onClick={() => addToCart(s)}
                    disabled={outOfStock}
                    className="group overflow-hidden text-left rounded-xl md:rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <div className="aspect-[4/3] w-full bg-muted">
                      {s.photoUrl ? (
                        <img src={s.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-muted-foreground">
                          <ImageIcon className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 md:p-4">
                      <div className="font-medium text-xs md:text-sm leading-tight">{s.name}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">{s.category}</div>
                      <div className="mt-1 md:mt-2 flex items-baseline justify-between gap-2">
                        <span className="text-primary font-semibold text-xs md:text-sm">
                          {formatCurrency(s.price)}
                        </span>
                        <span className="text-[9px] md:text-[10px] uppercase tracking-wide text-muted-foreground">
                          / {s.unit}
                        </span>
                      </div>
                      {s.type === "product" && s.stock !== null && (
                        <div className="mt-2 text-[10px] text-muted-foreground">
                          {outOfStock ? "Rupture de stock" : `Stock : ${formatNumber(s.stock)}`}
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
              {!catalogLoading && !catalogError && filtered.length === 0 && (
                <div className="col-span-full text-center py-10 md:py-16 text-muted-foreground text-sm">
                  {activeTab === "product"
                    ? "Aucun produit disponible"
                    : "Aucun service disponible"}
                </div>
              )}
              {catalogLoading && (
                <div className="col-span-full text-center py-10 md:py-16 text-muted-foreground text-sm">
                  Chargement du catalogue...
                </div>
              )}
              {!catalogLoading && catalogError && (
                <div className="col-span-full rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-6 text-center text-sm text-destructive">
                  {catalogError}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Panier */}
        <aside className="fixed bottom-0 left-0 w-full z-40 h-[45vh] md:relative md:bottom-auto md:left-auto md:w-[380px] md:h-auto shrink-0 flex flex-col bg-card border-t md:border-t-0 md:border-l border-border">
          <div className="px-4 md:px-5 pt-4 md:pt-6 pb-3 md:pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm md:text-base">Ticket en cours</h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Vider
                </button>
              )}
            </div>
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Nom du client (facultatif)"
              className="mt-2 md:mt-3 w-full rounded-lg md:rounded-xl bg-muted/60 border border-border px-3 py-1.5 md:py-2 text-xs md:text-sm outline-none focus:border-primary/40"
            />
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 md:px-5 py-2 md:py-3">
            {cart.length === 0 ? (
              <div className="h-full grid place-items-center text-center text-muted-foreground text-xs md:text-sm p-4 md:p-6">
                <div>
                  <ReceiptIcon className="h-8 w-8 md:h-10 md:w-10 mx-auto mb-2 md:mb-3 opacity-40" />
                  Sélectionnez des produits ou services
                  <br />
                  pour démarrer la vente
                </div>
              </div>
            ) : (
              <ul className="space-y-1.5 md:space-y-2">
                <AnimatePresence initial={false}>
                  {cart.map((i) => (
                    <motion.li
                      key={i.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="rounded-lg md:rounded-xl border border-border bg-background p-2 md:p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs md:text-sm font-medium truncate">{i.name}</div>
                          <div className="text-[10px] md:text-xs text-muted-foreground">
                            {formatCurrency(i.price)} / {i.unit}
                          </div>
                        </div>
                        <button
                          onClick={() => setQty(i.id, 0)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-1.5 md:mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-border">
                          <button
                            onClick={() => setQty(i.id, i.qty - 1)}
                            className="h-7 w-7 md:h-8 md:w-8 grid place-items-center hover:bg-muted"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            value={i.qty}
                            onChange={(e) =>
                              setQty(i.id, Math.max(0, parseInt(e.target.value) || 0))
                            }
                            className="w-8 md:w-10 text-center bg-transparent outline-none text-xs md:text-sm"
                          />
                          <button
                            onClick={() => setQty(i.id, i.qty + 1)}
                            className="h-7 w-7 md:h-8 md:w-8 grid place-items-center hover:bg-muted"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-xs md:text-sm font-semibold text-primary">
                          {formatCurrency(i.qty * i.price)}
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          <div className="border-t border-border px-4 md:px-5 py-3 md:py-4 space-y-2 md:space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span className="font-medium">{formatCurrency(subTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Remise</span>
              <input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
                className="w-20 md:w-24 text-right rounded-lg bg-muted/60 border border-border px-2 py-1 text-xs md:text-sm outline-none focus:border-primary/40"
              />
            </div>
            <div className="flex items-center justify-between pt-1.5 md:pt-2 border-t border-border">
              <span className="text-xs md:text-sm font-medium">Total</span>
              <span className="text-lg md:text-xl font-bold text-primary">
                {formatCurrency(total)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 pt-0.5 md:pt-1">
              {[
                { m: "Espèces" as const, icon: Banknote },
                { m: "Wave" as const, icon: Smartphone },
                { m: "Orange Money" as const, icon: Wallet },
                { m: "Carte" as const, icon: CreditCard },
              ].map(({ m, icon: Icon }) => (
                <button
                  key={m}
                  onClick={() => setPayment(m)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-[9px] md:text-[11px] transition ${
                    payment === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3 md:h-4 md:w-4" />
                  {m}
                </button>
              ))}
            </div>

            <button
              disabled={cart.length === 0 || saving || !canProcessSale}
              onClick={validate}
              className="w-full mt-1.5 md:mt-2 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-white font-semibold shadow-lg shadow-primary/30 disabled:opacity-40 disabled:shadow-none hover:scale-[1.01] transition text-sm md:text-base"
            >
              {saving ? "Enregistrement..." : `Encaisser ${formatCurrency(total)}`}
            </button>
          </div>
        </aside>
      </main>

      <AnimatePresence>
        {checkout && (
          <ReceiptModal
            ticket={checkout}
            identity={tenantIdentity}
            onClose={() => {
              setCheckout(null);
              clearCart();
            }}
          />
        )}
      </AnimatePresence>
      <SalesHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onEdit={(id) => {
          if (!canManageSales) {
            toast.error("Accès refusé");
            return;
          }
          setSaleToEdit(id);
        }}
      />
      {!!saleToEdit && canManageSales && (
        <LineItemsDialog
          headerTable="ventes"
          itemsTable="vente_items"
          fkColumn="vente_id"
          partnerTable="clients"
          partnerLabel="Client"
          numberPrefix="V"
          singular="Vente"
          initialId={saleToEdit}
          onClose={() => {
            setSaleToEdit(null);
            queryClient.invalidateQueries({ queryKey: ["ventes", "history"] });
          }}
        />
      )}
    </div>
  );
}

// ---------------- Ticket / Receipt ----------------
type Ticket = {
  number: string;
  date: Date;
  items: CartItem[];
  subTotal: number;
  discount: number;
  total: number;
  payment: PayMethod;
  client: string;
  cashier: string;
};

function ReceiptModal({
  ticket,
  identity,
  onClose,
}: {
  ticket: Ticket;
  identity: {
    name: string;
    tradeName: string;
    logoUrl: string | null;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    website: string;
    taxNumber: string;
    rccm: string;
  };
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const html = printRef.current?.innerHTML;
    if (!html) return;
    const w = window.open("", "_blank", "width=380,height=640");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Ticket ${ticket.number}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color:#000; margin:0; padding:0; }
        .ticket { width: 100%; max-width: 80mm; }
        .center { text-align:center; }
        .row { display:flex; justify-content:space-between; }
        .sep { border-top:1px dashed #000; margin:6px 0; }
        h1 { font-size:14px; margin:2px 0; }
        table { width:100%; border-collapse:collapse; }
        td { padding:2px 0; vertical-align:top; }
        .qty { width:22px; }
        .amt { text-align:right; white-space:nowrap; }
        .total { font-size:14px; font-weight:bold; }
      </style></head><body onload="window.print();setTimeout(()=>window.close(),300)">
      <div class="ticket">${html}</div></body></html>`);
    w.document.close();
  };

  const handleWhatsApp = () => {
    const contactLines = [
      identity.name,
      identity.address,
      identity.phone ? `Tél. ${identity.phone}` : "",
      identity.email,
      identity.logoUrl ? `Logo: ${identity.logoUrl}` : "",
    ].filter(Boolean);
    const itemLines = ticket.items.map(
      (item) => `${item.qty} x ${item.name} — ${formatNumber(item.qty * item.price)} FCFA`,
    );
    const message = [
      ...contactLines,
      "",
      `Ticket ${ticket.number}`,
      `Date: ${ticket.date.toLocaleString("fr-FR")}`,
      `Client: ${ticket.client}`,
      "",
      ...itemLines,
      "",
      `TOTAL: ${formatNumber(ticket.total)} FCFA`,
      `Paiement: ${ticket.payment}`,
      "",
      `Merci de votre visite${identity.name ? ` chez ${identity.name}` : ""} !`,
    ].join("\n");
    const recipient = identity.whatsapp.replace(/\D/g, "");
    window.open(
      `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-green-500/10 text-green-600 grid place-items-center">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">Vente encaissée</div>
              <div className="text-xs text-muted-foreground">Ticket {ticket.number}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin p-5 bg-muted/30">
          <div
            ref={printRef}
            className="mx-auto bg-white text-black font-mono text-[12px] leading-snug p-4 shadow-md"
            style={{ width: 300 }}
          >
            <div className="center">
              {identity.logoUrl && (
                <img
                  src={identity.logoUrl}
                  alt={identity.name ? `Logo ${identity.name}` : "Logo"}
                  style={{ maxWidth: "60px", margin: "0 auto 5px" }}
                />
              )}
              {identity.name && (
                <h1 style={{ fontSize: 14, margin: "2px 0", fontWeight: 700 }}>
                  {identity.name}
                </h1>
              )}
              {identity.tradeName && <div>{identity.tradeName}</div>}
              {identity.address && <div>{identity.address}</div>}
              {identity.phone && <div>Tél. {identity.phone}</div>}
              {(identity.email || identity.website) && (
                <div>{[identity.email, identity.website].filter(Boolean).join(" · ")}</div>
              )}
              {(identity.taxNumber || identity.rccm) && (
                <div>
                  {[
                    identity.taxNumber ? `NINEA: ${identity.taxNumber}` : "",
                    identity.rccm ? `RC: ${identity.rccm}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}
            </div>
            <div className="sep" style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
            <div className="row" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Ticket:</span>
              <span>{ticket.number}</span>
            </div>
            <div className="row" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Date:</span>
              <span>{ticket.date.toLocaleString("fr-FR")}</span>
            </div>
            <div className="row" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Caissier:</span>
              <span>{ticket.cashier}</span>
            </div>
            <div className="row" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Client:</span>
              <span>{ticket.client}</span>
            </div>
            <div className="sep" style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {ticket.items.map((i) => (
                  <Fragment key={i.id}>
                    <tr>
                      <td style={{ padding: "2px 0" }} colSpan={2}>
                        {i.name}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: 8 }}>
                        {i.qty} x {formatNumber(i.price)}
                      </td>
                      <td style={{ textAlign: "right" }}>{formatNumber(i.qty * i.price)}</td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
            <div className="sep" style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
            <div className="row" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Sous-total</span>
              <span>{formatNumber(ticket.subTotal)}</span>
            </div>
            {ticket.discount > 0 && (
              <div className="row" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Remise</span>
                <span>-{formatNumber(ticket.discount)}</span>
              </div>
            )}
            <div
              className="row total"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: 14,
                marginTop: 4,
              }}
            >
              <span>TOTAL FCFA</span>
              <span>{formatNumber(ticket.total)}</span>
            </div>
            <div
              className="row"
              style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}
            >
              <span>Paiement</span>
              <span>{ticket.payment}</span>
            </div>
            <div className="sep" style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
            <div className="center" style={{ textAlign: "center" }}>
              Merci de votre visite !<br />
              {identity.name && (
                <>
                  À bientôt chez {identity.name}
                  <br />
                </>
              )}
              <span style={{ fontSize: 10 }}>Ticket non remboursable</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-4 border-t border-border">
          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            <Printer className="h-4 w-4" /> Imprimer le ticket
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-green-500 text-white hover:opacity-90 transition"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
          <button
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-muted hover:bg-accent transition"
          >
            Nouvelle vente
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
