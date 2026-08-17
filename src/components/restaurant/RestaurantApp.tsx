import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  Clock3,
  CreditCard,
  FileText,
  ForkKnife,
  ImageOff,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Tags,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";
import { restaurantSupabase } from "@/integrations/restaurant/restaurant-supabase-client";
import { generateSafeId } from "@/lib/uuid";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function logRestaurantLoadError(
  resource: string,
  error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined,
) {
  console.error("[Restaurant] load failed", {
    resource,
    code: error?.code ?? null,
    message: error?.message ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  });
}

function logRestaurantWriteError(
  resource: string,
  error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined,
) {
  console.error("[Restaurant] write failed", {
    resource,
    code: error?.code ?? null,
    message: error?.message ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  });
}

type RestaurantAppProps = {
  email?: string | null;
  restaurantName?: string | null;
  onLogout: () => void;
};

type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  cover_url: string | null;
};

type SettingsRow = {
  restaurant_id: string;
  description: string | null;
  opening_hours: { display?: string } | null;
  default_delivery_fee: number | string | null;
  min_order_amount: number | string | null;
  primary_color: string | null;
  whatsapp_phone: string | null;
  delivery_enabled: boolean | null;
  pickup_enabled: boolean | null;
  dine_in_enabled: boolean | null;
};

type CategoryRow = { id: string; name: string; sort_order: number; is_active: boolean };
type ProductRow = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  is_active: boolean;
  preparation_time_minutes?: number | null;
};
type OptionGroupRow = { id: string; product_id: string; name: string; min_select: number; max_select: number; sort_order: number; is_active: boolean };
type OptionRow = { id: string; group_id: string; name: string; price_delta: number | string; sort_order: number; is_active: boolean };
type PaymentRow = { id: string; method: string; display_name: string; is_enabled: boolean; sort_order: number };
type RestaurantPaymentRow = {
  id: string;
  restaurant_id: string;
  order_id: string | null;
  amount: number | string;
  method: string;
  status: string;
  paid_at: string;
};
type MembershipRow = { restaurant_id: string; role: string; status: string };
type OrderRow = {
  id: string;
  restaurant_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  reception_type: "delivery" | "pickup" | "dine_in" | string;
  delivery_address: string | null;
  delivery_zone: string | null;
  notes: string | null;
  payment_method: string;
  payment_status: string;
  order_status: string;
  subtotal: number | string;
  delivery_fee: number | string;
  total_amount: number | string;
  public_tracking_token: string | null;
  created_at: string;
  updated_at?: string;
};
type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  line_total: number | string;
  selected_options?: Array<{ name: string; price_delta?: number }> | string | null;
  notes?: string | null;
};
type CustomerRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  total_orders?: number;
  total_spent?: number | string;
  last_order_at?: string | null;
};
type DeliveryZoneRow = { id: string; name: string; fee: number | string; min_order_amount: number | string | null; estimated_minutes: number | null; is_active: boolean };
type DeliveryZoneDraft = {
  id: string;
  name: string;
  fee: number | string;
  min_order_amount: number | string | null;
  estimated_minutes: number | null;
  is_active: boolean;
};
type ProductOptionDraft = { id: string; name: string; price_delta: number; sort_order: number; is_active: boolean };
type ProductGroupDraft = { id: string; name: string; min_select: number; max_select: number; sort_order: number; is_active: boolean; options: ProductOptionDraft[] };
type ProductDraft = ProductRow & { option_groups: ProductGroupDraft[] };

type AppView = "dashboard" | "orders" | "menus" | "categories" | "customers" | "stats" | "settings";
type OrderFilter = "all" | "new" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "picked_up" | "cancelled";

const RESTAURANT_SLUG = import.meta.env.VITE_RESTAURANT_SLUG ?? "saveurs-afrique";
const DEFAULT_COVER = "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?q=80&w=1600&auto=format&fit=crop";
const STATUS_FLOW = ["new", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "picked_up"] as const;
const STATUS_NEXT: Record<string, string[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "delivered", "picked_up", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  picked_up: [],
  cancelled: [],
};

function formatMoney(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

function normalizeNonNegativeInt(raw: string) {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

const PRODUCT_IMAGE_BUCKET = "restaurant-assets";
const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PRODUCT_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: "Nouvelle",
    confirmed: "Confirmée",
    preparing: "En préparation",
    ready: "Prête",
    out_for_delivery: "En livraison",
    delivered: "Livrée",
    picked_up: "Retirée",
    cancelled: "Annulée",
  };
  return labels[status] ?? status;
}

function paymentMethodIcon(method: string) {
  if (method === "cash_delivery") return Truck;
  if (method === "cash_on_site") return Store;
  return CreditCard;
}

const PILL_TONE_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-400/10 dark:text-sky-300",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-400/10 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-400/10 dark:text-rose-300",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-400/10 dark:text-violet-300",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/15 dark:bg-indigo-400/10 dark:text-indigo-300",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-600/15 dark:bg-cyan-400/10 dark:text-cyan-300",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/10 dark:text-slate-300",
};

function PillBadge({ tone, children }: { tone: keyof typeof PILL_TONE_CLASSES; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", PILL_TONE_CLASSES[tone])}>
      {children}
    </span>
  );
}

const ORDER_STATUS_TONE: Record<string, keyof typeof PILL_TONE_CLASSES> = {
  new: "sky",
  confirmed: "indigo",
  preparing: "amber",
  ready: "violet",
  out_for_delivery: "cyan",
  delivered: "emerald",
  picked_up: "emerald",
  cancelled: "rose",
};

function StatusBadge({ status }: { status: string }) {
  return <PillBadge tone={ORDER_STATUS_TONE[status] ?? "slate"}>{statusLabel(status)}</PillBadge>;
}

function AvailabilityBadge({ available }: { available: boolean }) {
  return <PillBadge tone={available ? "emerald" : "slate"}>{available ? "Disponible" : "Indisponible"}</PillBadge>;
}

function parseOptions(value: unknown): Array<{ name: string; price_delta?: number }> {
  if (Array.isArray(value)) return value as Array<{ name: string; price_delta?: number }>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as Array<{ name: string; price_delta?: number }>) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function RestaurantApp({ email, restaurantName, onLogout }: RestaurantAppProps) {
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroupRow[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [restaurantPayments, setRestaurantPayments] = useState<RestaurantPaymentRow[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZoneRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<AppView>("dashboard");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [searchOrders, setSearchOrders] = useState("");
  const [searchProducts, setSearchProducts] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>("all");
  const [productAvailabilityFilter, setProductAvailabilityFilter] = useState<"all" | "available" | "unavailable" | "featured">("all");
  const [searchCustomers, setSearchCustomers] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [productEditorDraft, setProductEditorDraft] = useState<ProductDraft | null>(null);
  const [zoneDraft, setZoneDraft] = useState<DeliveryZoneDraft | null>(null);
  const membershipRestaurantIdRef = useRef<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const lookupRestaurantId = restaurantId ?? membershipRestaurantIdRef.current;
      const restaurantQuery = lookupRestaurantId
        ? restaurantSupabase.from("restaurants").select("id,name,slug,address,phone,email,cover_url").eq("id", lookupRestaurantId).maybeSingle()
        : restaurantSupabase.from("restaurants").select("id,name,slug,address,phone,email,cover_url").eq("slug", RESTAURANT_SLUG).maybeSingle();
      const { data: restaurantData, error: restaurantError } = await restaurantQuery;
      if (restaurantError) {
        logRestaurantLoadError("restaurant", restaurantError);
        throw restaurantError;
      }
      if (!restaurantData) throw new Error("Restaurant introuvable.");
      const currentRestaurant = restaurantData as RestaurantRow;
      setRestaurant(currentRestaurant);
      setRestaurantId(currentRestaurant.id);

      const { data: settingsData, error: settingsError } = await restaurantSupabase
        .from("restaurant_settings")
        .select("*")
        .eq("restaurant_id", currentRestaurant.id)
        .maybeSingle();
      if (settingsError) {
        logRestaurantLoadError("settings", settingsError);
        throw settingsError;
      }
      setSettings((settingsData as SettingsRow) ?? null);

      const [catRes, prodRes, groupRes, optRes, payRes, zoneRes, cashRes] = await Promise.all([
        restaurantSupabase.from("restaurant_categories").select("id,name,sort_order,is_active").eq("restaurant_id", currentRestaurant.id).order("sort_order"),
        restaurantSupabase.from("restaurant_products").select("id,category_id,name,description,price,image_url,is_available,is_featured,is_active,preparation_time_minutes").eq("restaurant_id", currentRestaurant.id).eq("is_active", true).order("name"),
        restaurantSupabase.from("restaurant_product_option_groups").select("id,product_id,name,min_select,max_select,sort_order,is_active").eq("restaurant_id", currentRestaurant.id).eq("is_active", true).order("sort_order"),
        restaurantSupabase.from("restaurant_product_options").select("id,group_id,name,price_delta,sort_order,is_active").eq("restaurant_id", currentRestaurant.id).eq("is_active", true).order("sort_order"),
        restaurantSupabase.from("restaurant_payment_methods").select("id,method,display_name,is_enabled,sort_order").eq("restaurant_id", currentRestaurant.id).order("sort_order"),
        restaurantSupabase.from("restaurant_delivery_zones").select("id,name,fee,min_order_amount,estimated_minutes,is_active").eq("restaurant_id", currentRestaurant.id).order("name"),
        restaurantSupabase.from("restaurant_payments").select("id,restaurant_id,order_id,amount,method,status,paid_at").eq("restaurant_id", currentRestaurant.id).eq("status", "paid").order("paid_at", { ascending: false }),
      ]);
      const queryResults = [
        { resource: "categories", result: catRes },
        { resource: "products", result: prodRes },
        { resource: "option_groups", result: groupRes },
        { resource: "product_options", result: optRes },
        { resource: "payment_methods", result: payRes },
        { resource: "restaurant_delivery_zones", result: zoneRes },
        { resource: "restaurant_payments", result: cashRes },
      ] as const;
      for (const { resource, result } of queryResults) {
        if (result.error) {
          logRestaurantLoadError(resource, result.error);
          throw result.error;
        }
      }
      setCategories((catRes.data ?? []) as CategoryRow[]);
      setProducts((prodRes.data ?? []) as ProductRow[]);
      setOptionGroups((groupRes.data ?? []) as OptionGroupRow[]);
      setOptions((optRes.data ?? []) as OptionRow[]);
      setPayments((payRes.data ?? []) as PaymentRow[]);
      setDeliveryZones((zoneRes.data ?? []) as DeliveryZoneRow[]);
      setRestaurantPayments((cashRes.data ?? []) as RestaurantPaymentRow[]);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les données Restaurant.");
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async () => {
    const { data } = await restaurantSupabase.auth.getSession();
    const userId = data.session?.user.id ?? null;
    setSessionUserId(userId);
    if (!userId) return;
    const membership = await restaurantSupabase
      .from("restaurant_memberships")
      .select("restaurant_id,role,status")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!membership.error && membership.data) {
      const membershipRow = membership.data as MembershipRow;
      setAdminRole(membershipRow.role);
      membershipRestaurantIdRef.current = membershipRow.restaurant_id;
    }
  };

  const loadOrders = async () => {
    if (!restaurantId) return;
    const { data, error: ordersError } = await restaurantSupabase
      .from("restaurant_orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (ordersError) {
      logRestaurantLoadError("orders", ordersError);
      setError("Impossible de charger les commandes.");
      return;
    }
    const rows = (data ?? []) as OrderRow[];
    setOrders(rows);
    const ids = rows.map((order) => order.id);
    if (!ids.length) {
      setOrderItems([]);
      return;
    }
    const items = await restaurantSupabase.from("restaurant_order_items").select("*").in("order_id", ids);
    if (items.error) {
      logRestaurantLoadError("order_items", items.error);
      return;
    }
    setOrderItems((items.data ?? []) as OrderItemRow[]);
  };

  const loadCustomers = async () => {
    if (!restaurantId) return;
    const { data, error: customerError } = await restaurantSupabase
      .from("restaurant_customers")
      .select("id,full_name,phone,email,total_orders,total_spent,last_order_at")
      .eq("restaurant_id", restaurantId)
      .order("last_order_at", { ascending: false, nullsFirst: false })
      .limit(300);
    if (customerError) {
      logRestaurantLoadError("customers", customerError);
      setError("Impossible de charger les clients.");
      return;
    }
    setCustomers((data ?? []) as CustomerRow[]);
  };

  useEffect(() => {
    void (async () => {
      await loadSession();
      await loadAll();
    })();
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    void loadOrders();
    void loadCustomers();
    const channel = restaurantSupabase
      .channel(`restaurant-orders-${restaurantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_orders", filter: `restaurant_id=eq.${restaurantId}` }, () => {
        void loadOrders();
        void loadCustomers();
      })
      .subscribe();
    return () => {
      void restaurantSupabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const ordersById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);

  const visibleOrders = useMemo(() => {
    const query = searchOrders.toLowerCase();
    return orders.filter((order) => {
      if (orderFilter !== "all" && order.order_status !== orderFilter) return false;
      if (!query) return true;
      return [order.order_number, order.customer_name, order.customer_phone, order.payment_method, order.reception_type]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [orders, orderFilter, searchOrders]);

  const visibleProducts = useMemo(() => {
    const query = searchProducts.toLowerCase();
    return products.filter((product) => {
      if (productCategoryFilter !== "all" && product.category_id !== productCategoryFilter) return false;
      if (productAvailabilityFilter === "available" && !product.is_available) return false;
      if (productAvailabilityFilter === "unavailable" && product.is_available) return false;
      if (productAvailabilityFilter === "featured" && !product.is_featured) return false;
      if (!query) return true;
      const categoryName = product.category_id ? categoriesById.get(product.category_id)?.name ?? "" : "";
      return [product.name, product.description ?? "", categoryName].join(" ").toLowerCase().includes(query);
    });
  }, [products, categoriesById, searchProducts, productCategoryFilter, productAvailabilityFilter]);

  const productCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      if (!product.category_id) continue;
      counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const visibleCustomers = useMemo(() => {
    const query = searchCustomers.toLowerCase();
    return customers.filter((customer) => [customer.full_name, customer.phone, customer.email ?? ""].join(" ").toLowerCase().includes(query));
  }, [customers, searchCustomers]);

  const currentOrder = selectedOrderId ? ordersById.get(selectedOrderId) ?? null : null;
  const currentCustomer = selectedCustomerId ? customers.find((customer) => customer.id === selectedCustomerId) ?? null : null;
  const currentProduct = selectedProductId
    ? products.find((product) => product.id === selectedProductId) ?? null
    : productEditorDraft;

  const orderItemsForCurrent = currentOrder ? orderItems.filter((item) => item.order_id === currentOrder.id) : [];
  const orderTimeline = currentOrder ? [...STATUS_FLOW, "cancelled"].filter((status) => status === currentOrder.order_status || STATUS_FLOW.includes(status as (typeof STATUS_FLOW)[number]) || status === "cancelled") : [];

  const stats = useMemo(() => {
    const activeOrders = orders.filter((order) => order.order_status !== "cancelled");
    const paidPayments = restaurantPayments.filter((payment) => payment.status === "paid");
    const revenue = paidPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const paidOrdersCount = new Set(paidPayments.map((payment) => payment.order_id).filter(Boolean)).size;
    const average = paidOrdersCount ? revenue / paidOrdersCount : 0;
    const delivery = activeOrders.filter((order) => order.reception_type === "delivery").length;
    const pickup = activeOrders.filter((order) => order.reception_type === "pickup").length;
    const dineIn = activeOrders.filter((order) => order.reception_type === "dine_in").length;
    const paymentBreakdown = paidPayments.reduce<Record<string, number>>((acc, payment) => {
      acc[payment.method] = (acc[payment.method] ?? 0) + 1;
      return acc;
    }, {});
    const productCounts = orderItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.product_name] = (acc[item.product_name] ?? 0) + item.quantity;
      return acc;
    }, {});
    return { revenue, average, delivery, pickup, dineIn, paymentBreakdown, productCounts, count: activeOrders.length, paidCount: paidOrdersCount };
  }, [orders, orderItems, restaurantPayments]);

  const topProducts = Object.entries(stats.productCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const saveProductConfig = async (product: ProductDraft) => {
    if (!restaurantId) return;
    const price = Number(product.price);
    const preparationTimeMinutes = product.preparation_time_minutes === null || product.preparation_time_minutes === undefined
      ? null
      : Math.trunc(Number(product.preparation_time_minutes));
    if (!Number.isFinite(price) || (preparationTimeMinutes !== null && !Number.isFinite(preparationTimeMinutes))) {
      setError("Valeurs numériques invalides pour le produit.");
      return;
    }
    const groups = product.option_groups
      .filter((group) => group.name.trim() !== "")
      .map((group) => {
        const minSelect = Math.trunc(Number(group.min_select));
        const maxSelect = Math.trunc(Number(group.max_select));
        return {
          name: group.name,
          min_select: Number.isFinite(minSelect) ? minSelect : 0,
          max_select: Number.isFinite(maxSelect) ? maxSelect : 1,
          options: group.options
            .filter((option) => option.name.trim() !== "")
            .map((option) => {
              const priceDelta = Number(option.price_delta);
              return { name: option.name, price_delta: Number.isFinite(priceDelta) ? priceDelta : 0 };
            }),
        };
      });
    setSaving(true);
    const { error: rpcError } = await restaurantSupabase.rpc("save_restaurant_product_config", {
      p_restaurant_id: restaurantId,
      p_product: {
        id: product.id || null,
        category_id: product.category_id,
        name: product.name,
        description: product.description ?? "",
        price,
        image_url: product.image_url ?? "",
        is_available: product.is_available,
        is_featured: product.is_featured,
        preparation_time_minutes: preparationTimeMinutes,
      },
      p_groups: groups,
    });
    setSaving(false);
    if (rpcError) {
      logRestaurantWriteError("save_restaurant_product_config", rpcError);
      setError("Enregistrement du produit impossible.");
      return;
    }
    setProductEditorDraft(null);
    await loadAll();
  };

  const updateOrderStatus = async (order: OrderRow, nextStatus: string) => {
    if (!restaurantId) return;
    const allowed = STATUS_NEXT[order.order_status]?.includes(nextStatus) ?? false;
    if (!allowed) return;
    if (order.order_status === nextStatus) return;
    const { error } = await restaurantSupabase
      .from("restaurant_orders")
      .update({ order_status: nextStatus, updated_at: new Date().toISOString() } as never)
      .eq("id", order.id)
      .eq("restaurant_id", restaurantId);
    if (error) {
      setError("Mise à jour du statut impossible.");
      return;
    }
    await loadOrders();
  };

  const togglePayment = async (payment: PaymentRow) => {
    if (!restaurantId) return;
    const { error } = await restaurantSupabase
      .from("restaurant_payment_methods")
      .update({ is_enabled: !payment.is_enabled } as never)
      .eq("id", payment.id)
      .eq("restaurant_id", restaurantId);
    if (error) setError("Mise à jour du moyen de paiement impossible.");
    else await loadAll();
  };

  const saveSettings = async () => {
    if (!restaurantId || !settings) return;
    const { error } = await restaurantSupabase.from("restaurant_settings").upsert({
      restaurant_id: restaurantId,
      description: settings.description,
      opening_hours: settings.opening_hours,
      default_delivery_fee: Number(settings.default_delivery_fee ?? 0),
      min_order_amount: Number(settings.min_order_amount ?? 0),
      primary_color: settings.primary_color,
      whatsapp_phone: settings.whatsapp_phone,
      delivery_enabled: settings.delivery_enabled ?? true,
      pickup_enabled: settings.pickup_enabled ?? true,
      dine_in_enabled: settings.dine_in_enabled ?? true,
    } as never);
    if (error) setError("Enregistrement des paramètres impossible.");
  };

  const updateCategory = async (category: CategoryRow) => {
    if (!restaurantId) return;
    const name = window.prompt("Nom de la catégorie", category.name);
    if (!name) return;
    const { error } = await restaurantSupabase.from("restaurant_categories").update({ name } as never).eq("id", category.id).eq("restaurant_id", restaurantId);
    if (error) setError("Mise à jour de la catégorie impossible.");
    else await loadAll();
  };

  const createCategory = async () => {
    if (!restaurantId) return;
    const name = window.prompt("Nom de la catégorie");
    if (!name) return;
    const { error } = await restaurantSupabase.from("restaurant_categories").insert({ restaurant_id: restaurantId, name, sort_order: categories.length + 1, is_active: true } as never);
    if (error) {
      logRestaurantWriteError("restaurant_categories.insert", error);
      setError("Création de la catégorie impossible.");
    } else {
      await loadAll();
    }
  };

  const createProduct = async () => {
    if (!restaurantId) return;
    setProductEditorDraft({
      id: "",
      category_id: categories[0]?.id ?? null,
      name: "",
      description: "",
      price: 0,
      image_url: "",
      is_available: true,
      is_featured: false,
      is_active: true,
      preparation_time_minutes: 0,
      option_groups: [],
    });
  };

  const createZone = () => {
    setZoneDraft({
      id: "",
      name: "",
      fee: 0,
      min_order_amount: 0,
      estimated_minutes: 30,
      is_active: true,
    });
  };

  const saveZone = async (draft: DeliveryZoneDraft) => {
    if (!restaurantId) return;
    const fee = Number(draft.fee);
    const minOrderAmount = draft.min_order_amount === null || draft.min_order_amount === "" ? null : Number(draft.min_order_amount);
    const estimatedMinutes = draft.estimated_minutes === null ? null : Math.trunc(Number(draft.estimated_minutes));
    if (!Number.isFinite(fee) || (minOrderAmount !== null && !Number.isFinite(minOrderAmount)) || (estimatedMinutes !== null && !Number.isFinite(estimatedMinutes))) {
      setError("Valeurs numériques invalides pour la zone.");
      return;
    }
    const payload = {
      restaurant_id: restaurantId,
      name: draft.name,
      fee,
      min_order_amount: minOrderAmount,
      estimated_minutes: estimatedMinutes,
      is_active: draft.is_active,
    };
    const query = draft.id
      ? restaurantSupabase.from("restaurant_delivery_zones").update(payload as never).eq("id", draft.id).eq("restaurant_id", restaurantId)
      : restaurantSupabase.from("restaurant_delivery_zones").insert(payload as never);
    const { error } = await query;
    if (error) {
      logRestaurantWriteError(draft.id ? "restaurant_delivery_zones.update" : "restaurant_delivery_zones.insert", error);
      setError("Enregistrement de la zone impossible.");
    } else {
      setZoneDraft(null);
      await loadAll();
    }
  };

  const deleteZone = async (zone: DeliveryZoneRow) => {
    if (!restaurantId) return;
    const used = orders.some((order) => order.delivery_zone === zone.name);
    if (used) {
      const { error } = await restaurantSupabase.from("restaurant_delivery_zones").update({ is_active: false } as never).eq("id", zone.id).eq("restaurant_id", restaurantId);
      if (error) setError("Désactivation de la zone impossible.");
    } else {
      const { error } = await restaurantSupabase.from("restaurant_delivery_zones").delete().eq("id", zone.id).eq("restaurant_id", restaurantId);
      if (error) setError("Suppression de la zone impossible.");
    }
    await loadAll();
  };

  const navigation: Array<{ id: AppView; label: string; icon: typeof BarChart3 }> = [
    { id: "dashboard", label: "Tableau de bord", icon: BarChart3 },
    { id: "orders", label: "Commandes", icon: FileText },
    { id: "menus", label: "Menus", icon: ForkKnife },
    { id: "categories", label: "Catégories", icon: Tags },
    { id: "customers", label: "Clients", icon: Users },
    { id: "stats", label: "Statistiques", icon: BarChart3 },
    { id: "settings", label: "Paramètres", icon: Settings },
  ];
  const pageTitle = navigation.find((item) => item.id === view)?.label ?? "Restaurant";

  if (loading) {
    return <ShellLoading restaurantName={restaurantName} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <SidebarNavContent navigation={navigation} view={view} onSelect={setView} restaurant={restaurant} restaurantName={restaurantName} />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="h-[100dvh] w-[82vw] max-w-[300px] overflow-hidden border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNavContent
            navigation={navigation}
            view={view}
            onSelect={(next) => {
              setView(next);
              setMobileNavOpen(false);
            }}
            restaurant={restaurant}
            restaurantName={restaurantName}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-4 py-3.5 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border text-foreground md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Ouvrir la navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="truncate text-lg font-bold tracking-tight text-foreground md:text-2xl">{pageTitle}</h1>
          </div>
          <RestaurantUserMenu email={email} role={adminRole} onLogout={onLogout} />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8">
            {error && <Alert message={error} />}

            {view === "dashboard" && (
              <DashboardView restaurant={restaurant} settings={settings} orders={orders} products={products} stats={stats} onGo={setView} />
            )}

            {view === "orders" && (
              <OrdersView
                orders={visibleOrders}
                search={searchOrders}
                setSearch={setSearchOrders}
                orderFilter={orderFilter}
                setOrderFilter={setOrderFilter}
                onOpen={(id) => setSelectedOrderId(id)}
              />
            )}

            {view === "menus" && (
              <ProductsView
                products={visibleProducts}
                categories={categories}
                categoriesById={categoriesById}
                search={searchProducts}
                setSearch={setSearchProducts}
                categoryFilter={productCategoryFilter}
                setCategoryFilter={setProductCategoryFilter}
                availabilityFilter={productAvailabilityFilter}
                setAvailabilityFilter={setProductAvailabilityFilter}
                onCreate={createProduct}
                onOpen={(id) => setSelectedProductId(id)}
              />
            )}

            {view === "categories" && (
              <CategoriesView categories={categories} productCountByCategory={productCountByCategory} onCreate={createCategory} onEdit={updateCategory} />
            )}

            {view === "customers" && (
              <CustomersView
                customers={visibleCustomers}
                search={searchCustomers}
                setSearch={setSearchCustomers}
                onOpen={(id) => setSelectedCustomerId(id)}
              />
            )}

            {view === "stats" && <StatsView stats={stats} orders={orders} orderItems={orderItems} payments={payments} />}

            {view === "settings" && (
              <SettingsView
                settings={settings}
                setSettings={setSettings}
                payments={payments}
                onTogglePayment={togglePayment}
                deliveryZones={deliveryZones}
                onSave={saveSettings}
                onAddZone={createZone}
                onEditZone={(zone) => setZoneDraft({ ...zone })}
                onDeleteZone={deleteZone}
              />
            )}

            <footer className="mt-10 border-t border-border/70 pt-5 text-center text-xs text-muted-foreground">
              {restaurant?.address ? `${restaurant.address}` : ""}
              {settings?.whatsapp_phone ? ` · WhatsApp ${settings.whatsapp_phone}` : ""}
            </footer>
          </div>
        </main>
      </div>

      {currentOrder && (
        <OrderDetailModal
          order={currentOrder}
          items={orderItemsForCurrent}
          onClose={() => setSelectedOrderId(null)}
          onUpdateStatus={updateOrderStatus}
        />
      )}

      {currentCustomer && (
        <CustomerDetailModal
          customer={currentCustomer}
          orders={orders.filter((order) => order.customer_phone === currentCustomer.phone)}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}

      {currentProduct && (
        <ProductEditorModalV2
          product={currentProduct}
          categories={categories}
          groups={optionGroups.filter((group) => group.product_id === currentProduct.id)}
          options={options.filter((option) => option.group_id && optionGroups.some((group) => group.id === option.group_id && group.product_id === currentProduct.id))}
          restaurantId={restaurantId}
          saving={saving}
          onClose={() => {
            setSelectedProductId(null);
            setProductEditorDraft(null);
          }}
          onSave={saveProductConfig}
        />
      )}

      {zoneDraft && (
        <ZoneEditorModal
          zone={zoneDraft}
          onClose={() => setZoneDraft(null)}
          onSave={saveZone}
          onDelete={zoneDraft.id ? () => deleteZone(zoneDraft) : undefined}
        />
      )}
    </div>
  );
}

export default RestaurantApp;

function ShellLoading({ restaurantName }: { restaurantName?: string | null }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-saovia-primary">Restaurant</p>
        <p className="mt-3 text-muted-foreground">Chargement de {restaurantName ?? "votre espace Restaurant"}...</p>
      </div>
    </main>
  );
}

function Alert({ message }: { message: string }) {
  return <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">{message}</div>;
}

function SidebarNavContent({
  navigation,
  view,
  onSelect,
  restaurant,
  restaurantName,
}: {
  navigation: Array<{ id: AppView; label: string; icon: typeof BarChart3 }>;
  view: AppView;
  onSelect: (view: AppView) => void;
  restaurant: RestaurantRow | null;
  restaurantName?: string | null;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-saovia-primary text-white">
          <Store className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/50">SAOVIA Restaurant</div>
          <div className="truncate text-sm font-bold text-sidebar-foreground">{restaurant?.name ?? restaurantName ?? "Restaurant"}</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground/75 transition-colors hover:text-sidebar-foreground",
                active && "text-white hover:text-white",
              )}
            >
              {active && (
                <motion.div
                  layoutId="restaurant-sidebar-active"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-saovia-primary to-saovia-primary/80 shadow-lg shadow-saovia-primary/30"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <item.icon className="relative h-[18px] w-[18px] shrink-0" />
              <span className="relative truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  manager: "Manager",
};

function RestaurantUserMenu({
  email,
  role,
  onLogout,
}: {
  email?: string | null;
  role?: string | null;
  onLogout: () => void;
}) {
  const initial = (email ?? "R").trim().charAt(0).toUpperCase() || "R";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-saovia-primary-soft text-xs font-semibold text-saovia-primary">{initial}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[160px] truncate sm:inline">{email ?? "Compte"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate text-sm font-semibold">{email ?? "Compte Restaurant"}</div>
          <div className="text-xs font-normal text-muted-foreground">{role ? (ROLE_LABELS[role] ?? role) : "Membre"}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const KPI_TONE_CLASSES: Record<string, { icon: string; text: string }> = {
  primary: { icon: "bg-saovia-primary-soft", text: "text-saovia-primary" },
  emerald: { icon: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  sky: { icon: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400" },
  violet: { icon: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
  amber: { icon: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
};

function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  onClick,
}: {
  label: string;
  value: string;
  icon: typeof BarChart3;
  tone?: keyof typeof KPI_TONE_CLASSES;
  onClick?: () => void;
}) {
  const toneClasses = KPI_TONE_CLASSES[tone];
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "rounded-[20px] border border-border bg-card p-4 text-left shadow-sm transition-shadow sm:rounded-[24px] sm:p-5",
        onClick && "hover:shadow-lg",
      )}
    >
      <div className={cn("grid h-10 w-10 place-items-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl", toneClasses.icon)}>
        <Icon className={cn("h-5 w-5", toneClasses.text)} />
      </div>
      <div className="mt-4 text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
    </Comp>
  );
}

function DashboardView({
  restaurant,
  settings,
  products,
  stats,
  onGo,
}: {
  restaurant: RestaurantRow | null;
  settings: SettingsRow | null;
  products: ProductRow[];
  stats: {
    revenue: number;
    average: number;
    delivery: number;
    pickup: number;
    dineIn: number;
    paymentBreakdown: Record<string, number>;
    productCounts: Record<string, number>;
    count: number;
    paidCount: number;
  };
  onGo: (view: AppView) => void;
}) {
  const activeProductsCount = products.filter((product) => product.is_active).length;
  const cards: Array<{ label: string; value: string; icon: typeof BarChart3; tone: keyof typeof KPI_TONE_CLASSES; go: AppView }> = [
    { label: "Commandes actives", value: String(stats.count), icon: FileText, tone: "sky", go: "orders" },
    { label: "CA encaissé", value: formatMoney(stats.revenue), icon: CreditCard, tone: "emerald", go: "stats" },
    { label: "Panier moyen", value: formatMoney(stats.average), icon: ShieldCheck, tone: "violet", go: "stats" },
    { label: "Produits actifs", value: String(activeProductsCount), icon: ChefHat, tone: "amber", go: "menus" },
  ];
  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-border bg-card">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-saovia-primary">SAOVIA Restaurant</div>
            <h2 className="mt-2 text-2xl font-bold text-foreground">{restaurant?.name ?? "Restaurant"}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">Vue d’ensemble de l’activité : commandes, ventes et catalogue.</p>
          </div>
          <button
            className="inline-flex items-center gap-2 self-start rounded-2xl bg-saovia-primary px-4 py-3 text-sm font-semibold text-white sm:self-auto"
            onClick={() => onGo("orders")}
          >
            Voir les commandes
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {cards.map((card) => (
          <KpiCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} onClick={() => onGo(card.go)} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile title="Livraison" value={String(stats.delivery)} />
        <StatTile title="Retrait" value={String(stats.pickup)} />
        <StatTile title="Sur place" value={String(stats.dineIn)} />
      </div>

      {settings?.description && (
        <div className="flex items-start gap-3 rounded-[24px] bg-saovia-primary-soft px-5 py-4 text-sm text-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-saovia-primary" />
          {settings.description}
        </div>
      )}
    </section>
  );
}

function StatTile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function OrdersView({
  orders,
  search,
  setSearch,
  orderFilter,
  setOrderFilter,
  onOpen,
}: {
  orders: OrderRow[];
  search: string;
  setSearch: (value: string) => void;
  orderFilter: OrderFilter;
  setOrderFilter: (value: OrderFilter) => void;
  onOpen: (id: string) => void;
}) {
  const filters: Array<{ key: OrderFilter; label: string }> = [
    { key: "all", label: "Toutes" },
    { key: "new", label: "Nouvelles" },
    { key: "confirmed", label: "Confirmées" },
    { key: "preparing", label: "Préparation" },
    { key: "ready", label: "Prêtes" },
    { key: "out_for_delivery", label: "Livraison" },
    { key: "delivered", label: "Livrées" },
    { key: "picked_up", label: "Retirées" },
    { key: "cancelled", label: "Annulées" },
  ];
  return (
    <section className="rounded-[28px] border border-border bg-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Commandes</h2>
          <p className="text-sm text-muted-foreground">Numéro, client, type de réception, paiement, statut et heure.</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une commande..." className="w-full rounded-2xl border border-border bg-background py-3 pl-9 pr-3 text-sm" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setOrderFilter(filter.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              orderFilter === filter.key ? "bg-saovia-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-3">
        {orders.length ? orders.map((order) => <OrderRowCard key={order.id} order={order} onOpen={onOpen} />) : <EmptyState title="Aucune commande" text="Aucune commande ne correspond à ces critères." />}
      </div>
    </section>
  );
}

const RECEPTION_TYPE_LABELS: Record<string, string> = {
  delivery: "Livraison",
  pickup: "Retrait",
  dine_in: "Sur place",
};

function OrderRowCard({ order, onOpen }: { order: OrderRow; onOpen: (id: string) => void }) {
  const PaymentIcon = paymentMethodIcon(order.payment_method);
  return (
    <button
      onClick={() => onOpen(order.id)}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{order.order_number}</span>
          <StatusBadge status={order.order_status} />
        </div>
        <div className="mt-1 truncate text-sm text-muted-foreground">{order.customer_name} · {order.customer_phone}</div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground sm:justify-end">
        <span className="inline-flex items-center gap-1.5"><PaymentIcon className="h-4 w-4" />{order.payment_method}</span>
        <span>{RECEPTION_TYPE_LABELS[order.reception_type] ?? order.reception_type}</span>
        <span>{formatDateTime(order.created_at)}</span>
        <span className="text-base font-bold text-foreground">{formatMoney(order.total_amount)}</span>
      </div>
    </button>
  );
}

function ProductCard({ product, categoryName, onOpen }: { product: ProductRow; categoryName: string; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <ImageOff className="h-6 w-6" />
            <span className="text-xs">Aucune image</span>
          </div>
        )}
        {product.is_featured && (
          <div className="absolute left-2 top-2">
            <PillBadge tone="amber">
              <Sparkles className="h-3 w-3" /> Mis en avant
            </PillBadge>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-foreground">{product.name}</h3>
          <AvailabilityBadge available={product.is_available} />
        </div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{categoryName}</div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-bold text-foreground">{formatMoney(product.price)}</span>
          {product.preparation_time_minutes != null && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              {product.preparation_time_minutes} min
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ProductsView({
  products,
  categories,
  categoriesById,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  availabilityFilter,
  setAvailabilityFilter,
  onCreate,
  onOpen,
}: {
  products: ProductRow[];
  categories: CategoryRow[];
  categoriesById: Map<string, CategoryRow>;
  search: string;
  setSearch: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  availabilityFilter: "all" | "available" | "unavailable" | "featured";
  setAvailabilityFilter: (value: "all" | "available" | "unavailable" | "featured") => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
}) {
  const availabilityFilters: Array<{ key: typeof availabilityFilter; label: string }> = [
    { key: "all", label: "Tous" },
    { key: "available", label: "Disponibles" },
    { key: "unavailable", label: "Indisponibles" },
    { key: "featured", label: "Mis en avant" },
  ];
  return (
    <section className="rounded-[28px] border border-border bg-card p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Menus &amp; Produits</h2>
          <p className="text-sm text-muted-foreground">Gérez la carte : catégorie, prix, image, disponibilité et temps de préparation.</p>
        </div>
        <button onClick={onCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-saovia-primary px-4 py-3 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Nouveau produit
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit..." className="w-full rounded-2xl border border-border bg-background py-3 pl-9 pr-3 text-sm" />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-2xl border border-border bg-background px-4 py-3 text-sm lg:w-56"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {availabilityFilters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setAvailabilityFilter(filter.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              availabilityFilter === filter.key ? "bg-saovia-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.length ? (
          products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              categoryName={categoriesById.get(product.category_id ?? "")?.name ?? "Sans catégorie"}
              onOpen={() => onOpen(product.id)}
            />
          ))
        ) : (
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <EmptyState title="Aucun produit" text="Créez un produit pour démarrer le menu." />
          </div>
        )}
      </div>
    </section>
  );
}

function CategoriesView({
  categories,
  productCountByCategory,
  onCreate,
  onEdit,
}: {
  categories: CategoryRow[];
  productCountByCategory: Map<string, number>;
  onCreate: () => void;
  onEdit: (category: CategoryRow) => void;
}) {
  return (
    <section className="rounded-[28px] border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Catégories</h2>
          <p className="text-sm text-muted-foreground">Gestion des catégories actives du catalogue.</p>
        </div>
        <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-2xl bg-saovia-primary px-4 py-3 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Nouvelle catégorie
        </button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.length ? categories.map((category) => {
          const productCount = productCountByCategory.get(category.id) ?? 0;
          return (
            <button key={category.id} onClick={() => onEdit(category)} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40">
              <div className="min-w-0">
                <div className="truncate font-semibold text-foreground">{category.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{productCount} {productCount > 1 ? "produits" : "produit"}</div>
              </div>
              <PillBadge tone={category.is_active ? "emerald" : "slate"}>{category.is_active ? "Active" : "Inactive"}</PillBadge>
            </button>
          );
        }) : <div className="sm:col-span-2 lg:col-span-3"><EmptyState title="Aucune catégorie" text="Créez une première catégorie." /></div>}
      </div>
    </section>
  );
}

function CustomersView({
  customers,
  search,
  setSearch,
  onOpen,
}: {
  customers: CustomerRow[];
  search: string;
  setSearch: (value: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="rounded-[28px] border border-border bg-card p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Clients</h2>
          <p className="text-sm text-muted-foreground">Nom, téléphone, e-mail, nombre de commandes, montant total et dernière commande.</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client..." className="w-full rounded-2xl border border-border bg-background py-3 pl-9 pr-3 text-sm" />
        </div>
      </div>

      {customers.length ? (
        <>
          <div className="mt-5 hidden overflow-hidden rounded-2xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Commandes</TableHead>
                  <TableHead className="text-right">Total dépensé</TableHead>
                  <TableHead className="text-right">Dernière commande</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} onClick={() => onOpen(customer.id)} className="cursor-pointer">
                    <TableCell className="font-semibold text-foreground">{customer.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{customer.total_orders ?? 0}</TableCell>
                    <TableCell className="text-right font-semibold text-foreground">{formatMoney(customer.total_spent ?? 0)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{customer.last_order_at ? formatDateTime(customer.last_order_at) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-5 grid gap-3 md:hidden">
            {customers.map((customer) => (
              <button key={customer.id} onClick={() => onOpen(customer.id)} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground">{customer.full_name}</div>
                  <div className="mt-1 truncate text-sm text-muted-foreground">{customer.phone} · {customer.email ?? "Sans e-mail"}</div>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <div className="font-semibold text-foreground">{formatMoney(customer.total_spent ?? 0)}</div>
                  <div className="text-muted-foreground">{customer.total_orders ?? 0} cmd</div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-5">
          <EmptyState title="Aucun client" text="Les clients apparaîtront à partir des commandes réelles." />
        </div>
      )}
    </section>
  );
}

function StatsView({
  stats,
  orders,
  orderItems,
  payments,
}: {
  stats: {
    revenue: number;
    average: number;
    delivery: number;
    pickup: number;
    dineIn: number;
    paymentBreakdown: Record<string, number>;
    productCounts: Record<string, number>;
    count: number;
    paidCount: number;
  };
  orders: OrderRow[];
  orderItems: OrderItemRow[];
  payments: PaymentRow[];
}) {
  const topProducts = Object.entries(stats.productCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxProductQty = topProducts[0]?.[1] ?? 1;
  const paymentEntries = Object.entries(stats.paymentBreakdown).sort((a, b) => b[1] - a[1]);
  const maxPaymentCount = paymentEntries[0]?.[1] ?? 1;
  return (
    <section className="rounded-[28px] border border-border bg-card p-5">
      <h2 className="text-2xl font-bold text-foreground">Statistiques</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <KpiCard label="CA encaissé" value={formatMoney(stats.revenue)} icon={CreditCard} tone="emerald" />
        <KpiCard label="Commandes" value={String(stats.count)} icon={FileText} tone="sky" />
        <KpiCard label="Panier moyen" value={formatMoney(stats.average)} icon={ShieldCheck} tone="violet" />
        <KpiCard label="Paiements payés" value={String(stats.paidCount)} icon={CheckCircle2} tone="amber" />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <StatTile title="Livraison" value={String(stats.delivery)} />
        <StatTile title="Retrait" value={String(stats.pickup)} />
        <StatTile title="Sur place" value={String(stats.dineIn)} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border p-4">
          <h3 className="font-semibold text-foreground">Produits les plus vendus</h3>
          <div className="mt-3 grid gap-2">
            {topProducts.length ? topProducts.map(([name, qty]) => (
              <BarListRow key={name} label={name} value={String(qty)} ratio={qty / maxProductQty} tone="primary" />
            )) : <EmptyState title="Pas encore de ventes" text="Les produits les plus vendus s’afficheront ici." />}
          </div>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <h3 className="font-semibold text-foreground">Répartition des moyens de paiement</h3>
          <div className="mt-3 grid gap-2">
            {paymentEntries.length ? paymentEntries.map(([method, count]) => (
              <BarListRow key={method} label={method} value={String(count)} ratio={count / maxPaymentCount} tone="sky" />
            )) : <EmptyState title="Aucun paiement" text="La répartition apparaîtra quand des commandes seront payées." />}
          </div>
        </div>
      </div>
      <div className="mt-6 text-xs text-muted-foreground">Les commandes annulées sont exclues des KPI de vente.</div>
    </section>
  );
}

const BAR_TONE_BG: Record<string, string> = {
  primary: "bg-saovia-primary",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
};

function BarListRow({ label, value, ratio, tone }: { label: string; value: string; ratio: number; tone: keyof typeof BAR_TONE_BG }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="truncate text-foreground">{label}</span>
        <span className="shrink-0 font-semibold text-foreground">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", BAR_TONE_BG[tone])} style={{ width: `${Math.max(4, Math.min(100, ratio * 100))}%` }} />
      </div>
    </div>
  );
}

function SettingsView({
  settings,
  setSettings,
  payments,
  onTogglePayment,
  deliveryZones,
  onSave,
  onAddZone,
  onEditZone,
  onDeleteZone,
}: {
  settings: SettingsRow | null;
  setSettings: (value: SettingsRow) => void;
  payments: PaymentRow[];
  onTogglePayment: (payment: PaymentRow) => void;
  deliveryZones: DeliveryZoneRow[];
  onSave: () => void;
  onAddZone: () => void;
  onEditZone: (zone: DeliveryZoneRow) => void;
  onDeleteZone: (zone: DeliveryZoneRow) => void;
}) {
  if (!settings) return <EmptyState title="Paramètres indisponibles" text="Aucun enregistrement restaurant_settings n’a été chargé." />;
  const receptionModes: Array<[keyof SettingsRow, string]> = [
    ["delivery_enabled", "Livraison"],
    ["pickup_enabled", "Retrait"],
    ["dine_in_enabled", "Sur place"],
  ];
  return (
    <section className="rounded-[28px] border border-border bg-card p-5">
      <h2 className="text-2xl font-bold text-foreground">Paramètres</h2>
      <div className="mt-5 space-y-5">
        <SettingsSection title="Général" description="Description, horaires et identité visuelle.">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Description"><input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={settings.description ?? ""} onChange={(e) => setSettings({ ...settings, description: e.target.value })} /></Field>
            <Field label="Horaires"><input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={settings.opening_hours?.display ?? ""} onChange={(e) => setSettings({ ...settings, opening_hours: { ...(settings.opening_hours ?? {}), display: e.target.value } })} /></Field>
            <Field label="Téléphone WhatsApp"><input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={settings.whatsapp_phone ?? ""} onChange={(e) => setSettings({ ...settings, whatsapp_phone: e.target.value })} /></Field>
            <Field label="Couleur principale"><input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={settings.primary_color ?? ""} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} /></Field>
          </div>
        </SettingsSection>

        <SettingsSection title="Livraison & retrait" description="Frais, commande minimum et modes de réception disponibles.">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Frais de livraison"><input type="number" className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={Number(settings.default_delivery_fee ?? 0)} onChange={(e) => setSettings({ ...settings, default_delivery_fee: Number(e.target.value) })} /></Field>
            <Field label="Commande minimum"><input type="number" className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={Number(settings.min_order_amount ?? 0)} onChange={(e) => setSettings({ ...settings, min_order_amount: Number(e.target.value) })} /></Field>
          </div>
          <div className="mt-4">
            <Field label="Modes de réception">
              <div className="flex flex-wrap gap-2 text-sm">
                {receptionModes.map(([key, label]) => (
                  <button
                    key={key}
                    className={cn(
                      "rounded-full px-3 py-2 font-semibold transition-colors",
                      settings[key] ? "bg-saovia-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70",
                    )}
                    onClick={() => setSettings({ ...settings, [key]: !settings[key] } as SettingsRow)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </SettingsSection>

        <div className="flex flex-wrap justify-end gap-2">
          <button className="rounded-2xl bg-saovia-primary px-5 py-3 text-sm font-semibold text-white" onClick={onSave}>Enregistrer</button>
        </div>

        <SettingsSection title="Moyens de paiement">
          <div className="grid gap-2 sm:grid-cols-2">
            {payments.map((payment) => (
              <button key={payment.id} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-left transition-colors hover:bg-muted/40" onClick={() => onTogglePayment(payment)}>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground">{payment.display_name}</div>
                  <div className="text-sm text-muted-foreground">{payment.method}</div>
                </div>
                <PillBadge tone={payment.is_enabled ? "emerald" : "slate"}>{payment.is_enabled ? "Activé" : "Désactivé"}</PillBadge>
              </button>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Zones de livraison"
          action={
            <button className="inline-flex items-center gap-2 rounded-2xl bg-saovia-primary px-4 py-2.5 text-sm font-semibold text-white" onClick={onAddZone}>
              <Plus className="h-4 w-4" /> Ajouter une zone
            </button>
          }
        >
          <div className="grid gap-2">
            {deliveryZones.length ? deliveryZones.map((zone) => (
              <div key={zone.id} className="flex flex-col gap-3 rounded-2xl border border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{zone.name}</span>
                    <PillBadge tone={zone.is_active ? "emerald" : "slate"}>{zone.is_active ? "Active" : "Inactive"}</PillBadge>
                  </div>
                  <div className="mt-1 text-muted-foreground">{formatMoney(zone.fee)} · min {formatMoney(zone.min_order_amount ?? 0)} · {zone.estimated_minutes ?? 0} min</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="rounded-xl border border-border px-3 py-2 text-xs font-semibold" onClick={() => onEditZone(zone)}>Modifier</button>
                  <button className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 dark:border-rose-400/30" onClick={() => onDeleteZone(zone)}>Supprimer</button>
                </div>
              </div>
            )) : <EmptyState title="Aucune zone" text="Ajoutez une zone de livraison pour commencer." />}
          </div>
        </SettingsSection>
      </div>
    </section>
  );
}

function SettingsSection({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function OrderDetailModal({
  order,
  items,
  onClose,
  onUpdateStatus,
}: {
  order: OrderRow;
  items: OrderItemRow[];
  onClose: () => void;
  onUpdateStatus: (order: OrderRow, nextStatus: string) => void;
}) {
  return (
    <Modal
      title={order.order_number}
      onClose={onClose}
      footer={
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Changer le statut</div>
          <div className="flex flex-wrap gap-2">
            {["confirmed", "preparing", "ready", "out_for_delivery", "delivered", "picked_up", "cancelled"].map((status) => {
              const allowed = STATUS_NEXT[order.order_status]?.includes(status) ?? false;
              return (
                <button
                  key={status}
                  disabled={!allowed}
                  onClick={() => onUpdateStatus(order, status)}
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm font-semibold transition-colors",
                    allowed ? "bg-saovia-primary text-white" : "cursor-not-allowed bg-muted text-muted-foreground/50",
                  )}
                >
                  {statusLabel(status)}
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      <div className="mb-4 flex items-center gap-2">
        <StatusBadge status={order.order_status} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Info label="Client" value={order.customer_name} />
        <Info label="Téléphone" value={order.customer_phone} />
        <Info label="E-mail" value={order.customer_email ?? "-"} />
        <Info label="Réception" value={RECEPTION_TYPE_LABELS[order.reception_type] ?? order.reception_type} />
        <Info label="Adresse" value={order.delivery_address ?? "-"} />
        <Info label="Zone" value={order.delivery_zone ?? "-"} />
        <Info label="Notes" value={order.notes ?? "-"} />
        <Info label="Heure" value={formatDateTime(order.created_at)} />
      </div>
      <div className="mt-5">
        <h3 className="font-semibold text-foreground">Lignes</h3>
        <div className="mt-3 grid gap-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{item.product_name}</span>
                <span className="text-foreground">{item.quantity} x {formatMoney(Number(item.line_total) / Math.max(1, item.quantity))}</span>
              </div>
              {parseOptions(item.selected_options).length > 0 && (
                <div className="mt-1 text-muted-foreground">{parseOptions(item.selected_options).map((option) => `${option.name}${option.price_delta ? ` (+${formatMoney(option.price_delta)})` : ""}`).join(", ")}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function CustomerDetailModal({ customer, orders, onClose }: { customer: CustomerRow; orders: OrderRow[]; onClose: () => void }) {
  return (
    <Modal title={customer.full_name} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <Info label="Téléphone" value={customer.phone} />
        <Info label="E-mail" value={customer.email ?? "-"} />
        <Info label="Commandes" value={String(customer.total_orders ?? orders.length)} />
        <Info label="Total" value={formatMoney(customer.total_spent ?? orders.reduce((sum, order) => sum + Number(order.total_amount), 0))} />
        <Info label="Dernière commande" value={customer.last_order_at ? formatDateTime(customer.last_order_at) : "-"} />
      </div>
      <div className="mt-5 grid gap-2">
        {orders.map((order) => (
          <div key={order.id} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm">
            <span className="font-medium text-foreground">{order.order_number}</span>
            <span className="text-muted-foreground">{formatMoney(order.total_amount)} · {formatDateTime(order.created_at)}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ProductEditorModal({
  product,
  categories,
  groups,
  options,
  onClose,
  onSave,
}: {
  product: ProductRow;
  categories: CategoryRow[];
  groups: OptionGroupRow[];
  options: OptionRow[];
  onClose: () => void;
  onSave: (product: ProductRow) => void;
}) {
  return (
    <Modal title={`Produit: ${product.name}`} onClose={onClose}>
      <p className="text-sm text-slate-500">Le bouton d’enregistrement réutilise `save_restaurant_product_config` pour le produit, ses groupes et ses options.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Info label="Catégorie" value={categories.find((category) => category.id === product.category_id)?.name ?? "Sans catégorie"} />
        <Info label="Prix" value={formatMoney(product.price)} />
        <Info label="Description" value={product.description ?? "-"} />
        <Info label="Disponible" value={product.is_available ? "Oui" : "Non"} />
      </div>
      <div className="mt-5">
        <h3 className="font-semibold text-slate-950">Groupes d’options</h3>
        <div className="mt-3 grid gap-2">
          {groups.length ? groups.map((group) => (
            <div key={group.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
              <div className="font-semibold text-slate-950">{group.name}</div>
              <div className="text-slate-500">min {group.min_select} · max {group.max_select}</div>
              <div className="mt-2 text-slate-500">{options.filter((option) => option.group_id === group.id).map((option) => option.name).join(", ")}</div>
            </div>
          )) : <EmptyState title="Aucun groupe" text="Ce produit n’a pas encore de groupes d’options." />}
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <button className="rounded-2xl bg-saovia-primary px-4 py-3 text-sm font-semibold text-white" onClick={() => onSave(product)}>Enregistrer via RPC</button>
      </div>
    </Modal>
  );
}

function ProductEditorModalV2({
  product,
  categories,
  groups,
  options,
  restaurantId,
  saving,
  onClose,
  onSave,
}: {
  product: ProductRow;
  categories: CategoryRow[];
  groups: OptionGroupRow[];
  options: OptionRow[];
  restaurantId: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: (product: ProductDraft) => void;
}) {
  const [draft, setDraft] = useState<ProductDraft>({
    ...product,
    option_groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      min_select: group.min_select,
      max_select: group.max_select,
      sort_order: group.sort_order,
      is_active: group.is_active,
      options: options
        .filter((option) => option.group_id === group.id)
        .map((option) => ({
          id: option.id,
          name: option.name,
          price_delta: Number(option.price_delta),
          sort_order: option.sort_order,
          is_active: option.is_active,
        })),
    })),
  });
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft({
      ...product,
      option_groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        min_select: group.min_select,
        max_select: group.max_select,
        sort_order: group.sort_order,
        is_active: group.is_active,
        options: options
          .filter((option) => option.group_id === group.id)
          .map((option) => ({
            id: option.id,
            name: option.name,
            price_delta: Number(option.price_delta),
            sort_order: option.sort_order,
            is_active: option.is_active,
          })),
      })),
    });
  }, [product, groups, options]);

  const save = () => onSave({ ...draft, option_groups: draft.option_groups });
  const isNew = !draft.id;

  const handleImageSelect = async (file: File | undefined) => {
    if (!file) return;
    if (!restaurantId) {
      setImageError("Restaurant introuvable.");
      return;
    }
    const extension = PRODUCT_IMAGE_EXTENSIONS[file.type];
    if (!extension) {
      setImageError("Format non supporté. Utilisez JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      setImageError("Image trop volumineuse (5 Mo maximum).");
      return;
    }
    setImageError(null);
    setUploadingImage(true);
    try {
      const path = `${restaurantId}/products/${generateSafeId()}.${extension}`;
      const { error: uploadError } = await restaurantSupabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = restaurantSupabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
      setDraft((current) => ({ ...current, image_url: data.publicUrl }));
    } catch (error) {
      logRestaurantWriteError("restaurant-assets.upload", { message: error instanceof Error ? error.message : String(error) });
      setImageError("Échec de l'envoi de l'image. Réessayez.");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <Modal
      title={`Produit: ${draft.name || "Nouveau produit"}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <button
            disabled={saving}
            className="rounded-2xl bg-saovia-primary px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={save}
          >
            {saving ? "Enregistrement…" : isNew ? "Enregistrer" : "Enregistrer les modifications"}
          </button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom"><input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label="Catégorie">
          <select className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={draft.category_id ?? ""} onChange={(e) => setDraft({ ...draft, category_id: e.target.value || null })}>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </Field>
        <Field label="Prix">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full bg-transparent text-sm outline-none"
              value={String(draft.price)}
              onChange={(e) => setDraft({ ...draft, price: normalizeNonNegativeInt(e.target.value) })}
            />
            <span className="shrink-0 text-sm text-muted-foreground">FCFA</span>
          </div>
        </Field>
        <Field label="Temps de préparation">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full bg-transparent text-sm outline-none"
              value={String(draft.preparation_time_minutes ?? 0)}
              onChange={(e) => setDraft({ ...draft, preparation_time_minutes: normalizeNonNegativeInt(e.target.value) })}
            />
            <span className="shrink-0 text-sm text-muted-foreground">min</span>
          </div>
        </Field>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-sm font-semibold text-foreground/80">Image du produit</div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-start">
          {draft.image_url ? (
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
              <img src={draft.image_url} alt="Aperçu du produit" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setDraft({ ...draft, image_url: "" })}
                className="absolute right-1 top-1 rounded-lg bg-card/90 p-1.5 text-rose-600 shadow"
                aria-label="Supprimer l’image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border text-center text-xs text-muted-foreground">
              <ImageOff className="h-5 w-5" />
              Aucune image
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={uploadingImage}
              onClick={() => imageInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadingImage ? "Envoi…" : draft.image_url ? "Remplacer l’image" : "Choisir une image"}
            </button>
            <span className="text-xs text-muted-foreground">JPG, PNG ou WEBP — 5 Mo max.</span>
            {imageError && <span className="text-xs font-semibold text-rose-600">{imageError}</span>}
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(e) => {
              void handleImageSelect(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="mt-4">
        <Field label="Disponibilité">
          <div className="flex flex-wrap gap-2">
            <ToggleButton active={draft.is_available} label="Disponible" onClick={() => setDraft({ ...draft, is_available: !draft.is_available })} />
            <ToggleButton active={draft.is_featured} label="Mis en avant" onClick={() => setDraft({ ...draft, is_featured: !draft.is_featured })} />
          </div>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Description">
          <textarea className="min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </Field>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Groupes d’options</h3>
        <button className="rounded-2xl border border-border px-3 py-2 text-sm font-semibold text-foreground" onClick={() => setDraft((current) => ({ ...current, option_groups: [...current.option_groups, { id: `tmp-${Date.now()}`, name: "", min_select: 0, max_select: 1, sort_order: current.option_groups.length + 1, is_active: true, options: [] }] }))}>
          Ajouter un groupe
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        {draft.option_groups.length ? draft.option_groups.map((group) => (
          <div key={group.id} className="rounded-2xl border border-border p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={group.name} onChange={(e) => setDraft((current) => ({ ...current, option_groups: current.option_groups.map((item) => item.id === group.id ? { ...item, name: e.target.value } : item) }))} placeholder="Nom du groupe" />
              <input type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={group.min_select} onChange={(e) => setDraft((current) => ({ ...current, option_groups: current.option_groups.map((item) => item.id === group.id ? { ...item, min_select: Number(e.target.value) } : item) }))} />
              <input type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={group.max_select} onChange={(e) => setDraft((current) => ({ ...current, option_groups: current.option_groups.map((item) => item.id === group.id ? { ...item, max_select: Number(e.target.value) } : item) }))} />
              <button className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600" onClick={() => setDraft((current) => ({ ...current, option_groups: current.option_groups.filter((item) => item.id !== group.id) }))}>Supprimer groupe</button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">Options</span>
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold" onClick={() => setDraft((current) => ({ ...current, option_groups: current.option_groups.map((item) => item.id === group.id ? { ...item, options: [...item.options, { id: `tmp-${Date.now()}`, name: "", price_delta: 0, sort_order: item.options.length + 1, is_active: true }] } : item) }))}>Ajouter une option</button>
            </div>
            <div className="mt-3 grid gap-2">
              {group.options.map((option) => (
                <div key={option.id} className="grid gap-2 md:grid-cols-[1fr_120px_120px_auto]">
                  <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={option.name} onChange={(e) => setDraft((current) => ({ ...current, option_groups: current.option_groups.map((item) => item.id === group.id ? { ...item, options: item.options.map((opt) => opt.id === option.id ? { ...opt, name: e.target.value } : opt) } : item) }))} />
                  <input type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={option.price_delta} onChange={(e) => setDraft((current) => ({ ...current, option_groups: current.option_groups.map((item) => item.id === group.id ? { ...item, options: item.options.map((opt) => opt.id === option.id ? { ...opt, price_delta: Number(e.target.value) } : opt) } : item) }))} />
                  <input type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={option.sort_order} onChange={(e) => setDraft((current) => ({ ...current, option_groups: current.option_groups.map((item) => item.id === group.id ? { ...item, options: item.options.map((opt) => opt.id === option.id ? { ...opt, sort_order: Number(e.target.value) } : opt) } : item) }))} />
                  <button className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => setDraft((current) => ({ ...current, option_groups: current.option_groups.map((item) => item.id === group.id ? { ...item, options: item.options.filter((opt) => opt.id !== option.id) } : item) }))}>Supprimer</button>
                </div>
              ))}
            </div>
          </div>
        )) : <EmptyState title="Aucun groupe" text="Ajoutez au moins un groupe d’options." />}
      </div>
    </Modal>
  );
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full px-3 py-2 text-sm font-semibold transition-colors",
        active ? "bg-saovia-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ZoneEditorModal({
  zone,
  onClose,
  onSave,
  onDelete,
}: {
  zone: DeliveryZoneDraft;
  onClose: () => void;
  onSave: (zone: DeliveryZoneDraft) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState(zone);
  useEffect(() => setDraft(zone), [zone]);
  return (
    <Modal
      title={draft.id ? `Zone: ${draft.name}` : "Nouvelle zone"}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between">
          <div>{onDelete && draft.id ? <button className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-400/30" onClick={onDelete}>Supprimer</button> : null}</div>
          <button className="rounded-2xl bg-saovia-primary px-5 py-3 text-sm font-semibold text-white" onClick={() => onSave(draft)}>Enregistrer</button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom"><input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label="Frais"><input type="number" className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={Number(draft.fee)} onChange={(e) => setDraft({ ...draft, fee: Number(e.target.value) })} /></Field>
        <Field label="Minimum commande"><input type="number" className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={draft.min_order_amount === null ? 0 : Number(draft.min_order_amount)} onChange={(e) => setDraft({ ...draft, min_order_amount: Number(e.target.value) })} /></Field>
        <Field label="Délai estimé"><input type="number" className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={draft.estimated_minutes ?? 0} onChange={(e) => setDraft({ ...draft, estimated_minutes: Number(e.target.value) })} /></Field>
        <Field label="Statut"><ToggleButton active={draft.is_active} label={draft.is_active ? "Active" : "Inactive"} onClick={() => setDraft({ ...draft, is_active: !draft.is_active })} /></Field>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-[28px] bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="rounded-2xl border border-border p-2 text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 flex-1 overflow-auto">{children}</div>
        {footer && <div className="mt-4 border-t border-border pt-4">{footer}</div>}
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      <div className="font-semibold text-foreground">{title}</div>
      <div className="mt-1">{text}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-foreground/80">{label}</div>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold text-foreground">{value}</div>
    </div>
  );
}
