import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useActionPermission } from "@/hooks/use-action-permission";
import { usePermissions } from "@/hooks/use-permissions";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { makeNumber, formatCurrency, formatNumber, formatDateTime } from "@/lib/mms/format";
import {
  buildWhatsAppReceiptMessage,
  buildWhatsAppShareUrl,
  containsSensitiveData,
} from "@/lib/mms/whatsapp-receipt";
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
  Package,
  Wrench,
} from "lucide-react";
import { Sidebar } from "@/components/mms/Sidebar";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "@/components/mms/SidebarContent";
import { SidebarCompanyHeader } from "@/components/mms/SidebarCompanyHeader";
import { SalesHistoryModal } from "@/components/mms/SalesHistoryModal";
import { LineItemsDialog } from "@/components/mms/LineItemsDialog";
import { History } from "lucide-react";
import { useTenant } from "@/providers/TenantProvider";
import { useCatalogItemsSearch } from "@/hooks/use-catalog-items";
import { useDebouncedValue } from "@/hooks/use-paginated-table";
import { useCatalogCategories } from "@/hooks/use-catalog-categories";
import { PLATFORM_BRANDING } from "@/config/branding";
import { useCatalogSettings } from "@/hooks/use-catalog-settings";
import { catalogTypeEnabled } from "@/lib/catalog-settings";

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
  const [mobileTicketOpen, setMobileTicketOpen] = useState(false);
  const queryClient = useQueryClient();
  const { profile, tenant, loading: tenantLoading } = useTenant();
  const catalogSettingsQuery = useCatalogSettings();
  const catalogSettings = catalogSettingsQuery.data;

  // Debounced so typing doesn't fire a server search per keystroke — the
  // search itself queries the tenant's entire catalog server-side (not just
  // whatever page is already loaded), so a product outside the first page(s)
  // is exactly as findable as one on the first screen.
  const debouncedQuery = useDebouncedValue(query, 300);
  const {
    data: dbServices,
    loading: catalogLoading,
    error: catalogError,
    fetchNextPage: fetchNextCatalogPage,
    hasNextPage: hasNextCatalogPage,
    isFetchingNextPage: isFetchingNextCatalogPage,
    reload: reloadCatalog,
  } = useCatalogItemsSearch({
    type: activeTab,
    category: category === "Tous" ? null : category,
    search: debouncedQuery,
    activeOnly: true,
  });
  const catalogCategoriesQuery = useCatalogCategories({
    activeOnly: true,
    type: activeTab,
  });

  useEffect(() => {
    if (!catalogSettings) return;
    const fallbackTab =
      catalogSettings.catalog_mode === "products"
        ? "product"
        : catalogSettings.catalog_mode === "services"
          ? "service"
          : activeTab;
    if (!catalogTypeEnabled(catalogSettings, activeTab)) {
      setActiveTab(fallbackTab);
      setCategory("Tous");
    }
    setCart((current) => {
      const allowed = current.filter((item) => catalogTypeEnabled(catalogSettings, item.type));
      if (allowed.length !== current.length) toast.info("Le panier a été adapté au nouveau mode catalogue.");
      return allowed;
    });
  }, [activeTab, catalogSettings]);

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
      ...(catalogCategoriesQuery.data ?? []).map((item) => item.name),
    ],
    [catalogCategoriesQuery.data],
  );

  // type/category/search are now applied server-side (see
  // useCatalogItemsSearch) — `catalog` already only contains matching rows
  // for whichever page(s) have loaded so far.
  const filtered = catalog;

  const handleCatalogScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasNextCatalogPage || isFetchingNextCatalogPage) return;
    const el = event.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) {
      void fetchNextCatalogPage();
    }
  };

  const selectTab = (tab: CatalogTab) => {
    setActiveTab(tab);
    setCategory("Tous");
  };

  const subTotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);
  const total = Math.max(0, subTotal - discount);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const addToCart = (s: Service) => {
    if (!catalogTypeEnabled(catalogSettings, s.type)) {
      toast.error("Ce type d’article est désactivé pour ce tenant.");
      return;
    }
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

  const cashierName = profile?.full_name || profile?.email || "Utilisateur";

  const validate = async () => {
    if (cart.length === 0) return;
    if (!profile?.tenant_id) {
      toast.error("Impossible de créer la vente : aucun tenant courant n'est disponible.");
      return;
    }
    if (cart.some((item) => !catalogTypeEnabled(catalogSettings, item.type))) {
      toast.error("Le panier contient un type désactivé. Rechargez le catalogue.");
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
          cashier: cashierName,
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
      cashier: cashierName,
    };
    setMobileTicketOpen(false);
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
        <section className="flex-1 flex flex-col min-h-0 min-w-0 border-b md:border-b-0 md:border-r border-border pb-36 md:pb-0">
          <header className="px-4 md:px-6 pt-4 md:pt-6 pb-4 border-b border-border">
            <div className="mb-3 flex items-center md:hidden">
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
                  <div className="flex h-full flex-col gap-2">
                    <SidebarCompanyHeader
                      logoUrl={logoUrl}
                    />
                    <div className="flex-1 px-4">
                      <SidebarContent onItemClick={() => setMobileMenuOpen(false)} />
                    </div>
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
            <div
              className="grid grid-cols-2 gap-2 mb-3"
              role="group"
              aria-label="Type d'article"
            >
              {[
                { value: "product" as const, label: "Produits", icon: Package },
                { value: "service" as const, label: "Services", icon: Wrench },
              ].filter((tab) => catalogTypeEnabled(catalogSettings, tab.value)).map((tab) => {
                const isActive = activeTab === tab.value;
                const TabIcon = tab.icon;

                return (
                  <Button
                    key={tab.value}
                    type="button"
                    variant="outline"
                    aria-pressed={isActive}
                    onClick={() => selectTab(tab.value)}
                    className={`h-10 w-full rounded-lg px-3 text-sm font-semibold transition-all duration-200 md:h-11 md:px-4 ${
                      isActive
                        ? "border-0 bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:text-primary-foreground"
                        : "border-border bg-background text-foreground shadow-none hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <TabIcon className="h-4 w-4" aria-hidden="true" />
                    {tab.label}
                  </Button>
                );
              })}
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

          <div
            className="flex-1 overflow-y-auto scrollbar-thin p-3 md:p-6"
            onScroll={handleCatalogScroll}
          >
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
                      {catalogSettings?.catalog_mode === "mixed" && (
                        <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                          {s.type === "product" ? "Produit" : "Service"}
                        </span>
                      )}
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
              {!catalogLoading && isFetchingNextCatalogPage && (
                <div className="col-span-full py-4 text-center text-xs text-muted-foreground">
                  Chargement de produits supplémentaires...
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Panier */}
        <aside className="hidden md:relative md:w-[380px] md:h-auto shrink-0 md:flex flex-col bg-card md:border-l border-border">
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        <button
          type="button"
          disabled={cart.length === 0}
          onClick={() => setMobileTicketOpen(true)}
          className="mb-2 flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left disabled:opacity-50"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ReceiptIcon className="h-4 w-4 text-primary" />
            Voir le ticket
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {itemCount} {itemCount > 1 ? "articles" : "article"} • {formatCurrency(total)}
          </span>
        </button>
        <button
          type="button"
          disabled={cart.length === 0 || saving || !canProcessSale}
          onClick={() => setMobileTicketOpen(true)}
          className="w-full rounded-xl bg-gradient-to-br from-primary to-primary-glow py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition disabled:opacity-40 disabled:shadow-none"
        >
          Encaisser {formatCurrency(total)}
        </button>
      </div>

      <Sheet open={mobileTicketOpen} onOpenChange={setMobileTicketOpen}>
        <SheetContent
          side="bottom"
          className="flex h-[90dvh] flex-col gap-0 rounded-t-3xl p-0 md:hidden"
        >
          <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-muted-foreground/30" />
          <div className="border-b border-border px-4 pb-4 pt-3">
            <SheetTitle>Ticket en cours</SheetTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {itemCount} {itemCount > 1 ? "articles" : "article"} • {formatCurrency(total)}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-muted-foreground">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.name}</p>
                          <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                            {item.type === "product" ? "Produit" : "Service"}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Supprimer ${item.name}`}
                          onClick={() => setQty(item.id, 0)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatCurrency(item.price)} / {item.unit}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-border">
                      <button
                        type="button"
                        aria-label={`Diminuer la quantité de ${item.name}`}
                        onClick={() => setQty(item.id, item.qty - 1)}
                        className="grid h-8 w-8 place-items-center hover:bg-muted"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm font-medium">{item.qty}</span>
                      <button
                        type="button"
                        aria-label={`Augmenter la quantité de ${item.name}`}
                        onClick={() => setQty(item.id, item.qty + 1)}
                        className="grid h-8 w-8 place-items-center hover:bg-muted"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Sous-total</p>
                      <p className="text-sm font-bold text-primary">
                        {formatCurrency(item.qty * item.price)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="mobile-ticket-client" className="mb-1.5 block text-xs font-medium">
                  Client
                </label>
                <input
                  id="mobile-ticket-client"
                  value={client}
                  onChange={(event) => setClient(event.target.value)}
                  placeholder="Nom du client (facultatif)"
                  className="w-full rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                />
              </div>

              <div className="space-y-2 rounded-2xl bg-muted/40 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-medium">{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="mobile-ticket-discount" className="text-muted-foreground">
                    Remise
                  </label>
                  <input
                    id="mobile-ticket-discount"
                    type="number"
                    min={0}
                    value={discount || ""}
                    onChange={(event) =>
                      setDiscount(Math.max(0, parseInt(event.target.value) || 0))
                    }
                    placeholder="0"
                    className="w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm outline-none focus:border-primary/40"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium">Mode de paiement</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { m: "Espèces" as const, icon: Banknote },
                    { m: "Wave" as const, icon: Smartphone },
                    { m: "Orange Money" as const, icon: Wallet },
                    { m: "Carte" as const, icon: CreditCard },
                  ].map(({ m, icon: Icon }) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPayment(m)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                        payment === m
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <SheetClose asChild>
              <button
                type="button"
                className="rounded-xl border border-border px-3 py-3 text-sm font-semibold"
              >
                Continuer les achats
              </button>
            </SheetClose>
            <button
              type="button"
              disabled={cart.length === 0 || saving || !canProcessSale}
              onClick={validate}
              className="rounded-xl bg-gradient-to-br from-primary to-primary-glow px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 disabled:opacity-40"
            >
              {saving ? "Enregistrement..." : "Confirmer et encaisser"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

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
    const message = buildWhatsAppReceiptMessage({
      companyName: identity.name,
      ticketNumber: ticket.number,
      date: formatDateTime(ticket.date),
      customerName: ticket.client,
      cashierName: ticket.cashier,
      items: ticket.items.map((item) => ({
        name: item.name,
        quantity: item.qty,
        total: item.qty * item.price,
      })),
      total: ticket.total,
      paymentMethod: ticket.payment,
    });

    if (containsSensitiveData(message)) {
      toast.error("Partage WhatsApp bloqué : le message contient des données sensibles.");
      return;
    }

    const url = buildWhatsAppShareUrl(message, identity.whatsapp);
    window.open(url, "_blank", "noopener,noreferrer");
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
              <span>TOTAL</span>
              <span>{formatCurrency(ticket.total)}</span>
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
