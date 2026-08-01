import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  ClipboardCopy,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileBarChart,
  Gauge,
  Handshake,
  Layers3,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Mail,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  manageTenantModule,
  assignModulePack,
  removeModulePack,
  saveModulePack,
  manageTenantAiSubscription,
  manageTenantSubscription,
  manageTenantLifecycle,
  adjustPartnerCredits,
  purchasePartnerCreditPack,
  removePartnerOffer,
  savePartnerCreditPack,
  savePartnerOffer,
  validatePartnerPayment,
  createInvitedTenant,
  resendSuperAdminTenantInvitation,
  activatePendingTrial,
  type AiSubscriptionStatus,
  type SubscriptionBillingCycle,
  type SuperAdminDashboard,
  type SuperAdminAiPlan,
  type SuperAdminTenant,
  type SuperAdminModulePack,
  type SuperAdminPartnerOffer,
  type SuperAdminCreditPack,
  type TenantDeletionJob,
} from "@/lib/super-admin.server";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORM_BRANDING } from "@/config/branding";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { DEFAULT_CURRENCY, formatCurrency } from "@/lib/mms/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const numberFormatter = new Intl.NumberFormat("fr-FR");

const emptyDashboard: SuperAdminDashboard = {
  kpis: { tenants: 0, activeTenants: 0, users: 0, sales: 0, revenue: 0 },
  subscriptions: { active: 0, trials: 0, expired: 0, recurringRevenue: 0 },
  registrations: [],
  aiPlans: [],
  modules: [],
  modulePacks: [],
  tenants: [],
  deletionJobs: [],
  partnerCommerce: {
    offers: [],
    partners: [],
    subscriptions: [],
    payments: [],
    credits: [],
    creditPacks: [],
    creditPurchases: [],
    trials: [],
  },
};

function normalizeDashboardData(
  value: SuperAdminDashboard | null | undefined,
): SuperAdminDashboard {
  if (!value || typeof value !== "object") return emptyDashboard;

  const kpis = value.kpis ?? emptyDashboard.kpis;
  const subscriptions = value.subscriptions ?? emptyDashboard.subscriptions;
  const commerce = value.partnerCommerce ?? emptyDashboard.partnerCommerce;
  const safeNumber = (candidate: unknown) =>
    typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0;
  const safeArray = <T,>(candidate: T[] | null | undefined): T[] =>
    Array.isArray(candidate) ? candidate.filter(Boolean) : [];

  return {
    kpis: {
      tenants: safeNumber(kpis.tenants),
      activeTenants: safeNumber(kpis.activeTenants),
      users: safeNumber(kpis.users),
      sales: safeNumber(kpis.sales),
      revenue: safeNumber(kpis.revenue),
    },
    subscriptions: {
      active: safeNumber(subscriptions.active),
      trials: safeNumber(subscriptions.trials),
      expired: safeNumber(subscriptions.expired),
      recurringRevenue: safeNumber(subscriptions.recurringRevenue),
    },
    registrations: safeArray(value.registrations),
    aiPlans: safeArray(value.aiPlans),
    modules: safeArray(value.modules),
    modulePacks: safeArray(value.modulePacks).map((pack) => ({
      ...pack,
      moduleIds: safeArray(pack?.moduleIds),
    })),
    tenants: safeArray(value.tenants).map((tenant) => ({
      ...tenant,
      id: tenant?.id ?? "",
      name: tenant?.name ?? "Tenant sans nom",
      status: tenant?.status ?? "suspended",
      loginUrl: tenant?.loginUrl ?? "#",
      users: safeNumber(tenant?.users),
      sales: safeNumber(tenant?.sales),
      clients: safeNumber(tenant?.clients),
      revenue: safeNumber(tenant?.revenue),
      monthlyRevenue: safeNumber(tenant?.monthlyRevenue),
      subscriptionAmount: safeNumber(tenant?.subscriptionAmount),
      modules: safeArray(tenant?.modules),
      aiUsageHistory: safeArray(tenant?.aiUsageHistory),
    })),
    deletionJobs: safeArray(value.deletionJobs),
    partnerCommerce: {
      offers: safeArray(commerce.offers),
      partners: safeArray(commerce.partners),
      subscriptions: safeArray(commerce.subscriptions),
      payments: safeArray(commerce.payments),
      credits: safeArray(commerce.credits),
      creditPacks: safeArray(commerce.creditPacks),
      creditPurchases: safeArray(commerce.creditPurchases),
      trials: safeArray(commerce.trials),
    },
  };
}

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function isActive(status: string) {
  return ["trial", "active"].includes(status.trim().toLowerCase());
}

const statusLabels: Record<string, string> = {
  trial: "Essai",
  active: "Active",
  expired: "Expirée",
  suspended: "Suspendue",
};

const cycleLabels: Record<SubscriptionBillingCycle, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  yearly: "Annuel",
};

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/super-admin#dashboard" },
  { label: "Tenants", icon: Building2, href: "/super-admin#tenants" },
  { label: "Packs de modules", icon: Layers3, href: "/super-admin#packs-modules" },
  { label: "Offres partenaires", icon: CreditCard, href: "/super-admin#offres-partenaires" },
  { label: "Partenaires", icon: Handshake, href: "/super-admin/partners" },
  { label: PLATFORM_BRANDING.products.ai, icon: Bot, href: "/super-admin/ia-platform" },
  { label: "Utilisateurs", icon: Users, href: "/super-admin/users" },
  { label: "Licences", icon: KeyRound, href: "#licences" },
  { label: "Activité", icon: Activity, href: "#activite" },
  { label: "Rapports", icon: FileBarChart, href: "#rapports" },
  { label: "Paramètres", icon: Settings, href: "#parametres" },
  { label: "Journal", icon: ReceiptText, href: "#journal" },
] as const;

function SidebarContent({ mobile = false, onCreateTenant }: { mobile?: boolean; onCreateTenant: () => void }) {
  const { pathname, hash } = useLocation();
  const isDashboardRoute = pathname === "/super-admin" || pathname === "/super-admin/";

  return (
    <div className="flex h-full flex-col bg-[#0a0a0b] text-white">
      <div className="flex h-24 shrink-0 items-center border-b border-white/10 px-5">
        <BrandLogo context="superAdmin" />
        <span className="sr-only">Platform admin</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Navigation">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Espace plateforme
        </p>
        {navItems.map(({ label, icon: Icon, href }) => {
          const sectionId = href.startsWith("/super-admin#")
            ? href.slice("/super-admin#".length)
            : null;
          const isActive = sectionId
            ? isDashboardRoute && (hash === sectionId || (!hash && sectionId === "dashboard"))
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <a
              key={label}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                isActive
                  ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-[18px]" />
              <span>{label}</span>
              {isActive && <ChevronRight className="ml-auto size-4" />}
            </a>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-3">
        <Button
          className="h-10 w-full justify-start rounded-lg bg-white text-black shadow-[0_8px_30px_rgba(255,255,255,.08)] hover:bg-zinc-200"
          onClick={onCreateTenant}
        >
          <Plus className="size-4" />
          Créer un tenant
        </Button>
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[.03] p-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Super Admin</p>
            <p className="truncate text-xs text-slate-400">Compte plateforme</p>
          </div>
          {!mobile && <span className="ml-auto size-2 rounded-full bg-emerald-400" />}
        </div>
      </div>
    </div>
  );
}

type KpiCardProps = {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  note: string;
};

function KpiCard({ title, value, icon: Icon, tone, note }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2 }}
    >
      <Card className="group relative overflow-hidden rounded-xl border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{note}</p>
          </div>
          <div
            className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", tone)}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("rounded-xl border-border/70 bg-card p-5 shadow-sm", className)}>
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}

function PartnerOffersSection({
  commerce,
  packs,
}: {
  commerce: SuperAdminDashboard["partnerCommerce"];
  packs: SuperAdminModulePack[];
}) {
  const [editing, setEditing] = useState<SuperAdminPartnerOffer | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [credits, setCredits] = useState("1");
  const [duration, setDuration] = useState("30");
  const [packId, setPackId] = useState("");
  const [maxTrials, setMaxTrials] = useState("0");
  const [trialDays, setTrialDays] = useState("0");
  const [offerActive, setOfferActive] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [creditPackOpen, setCreditPackOpen] = useState(false);
  const [creditPurchaseOpen, setCreditPurchaseOpen] = useState(false);
  const [editingCreditPack, setEditingCreditPack] = useState<SuperAdminCreditPack | null>(null);
  const [creditPackName, setCreditPackName] = useState("");
  const [creditPackPrice, setCreditPackPrice] = useState("0");
  const [creditPackCount, setCreditPackCount] = useState("1");
  const [creditPackActive, setCreditPackActive] = useState(true);
  const [selectedCreditPackId, setSelectedCreditPackId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [adjustment, setAdjustment] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const openOffer = (offer?: SuperAdminPartnerOffer) => {
    setEditing(offer ?? null);
    setName(offer?.name ?? "");
    setPrice(String(offer?.price ?? 0));
    setCredits(String(offer?.includedTenantCredits ?? 1));
    setDuration(String(offer?.durationDays ?? 30));
    setPackId(offer?.modulePackId ?? packs[0]?.id ?? "");
    setMaxTrials(String(offer?.maxTrials ?? 0));
    setTrialDays(String(offer?.trialDays ?? 0));
    setOfferActive(offer?.isActive ?? true);
    setOfferOpen(true);
  };

  const saveOffer = async () => {
    setSubmitting(true);
    try {
      await savePartnerOffer({ data: {
        id: editing?.id ?? null, name, price: Number(price),
        includedTenantCredits: Number(credits), durationDays: Number(duration),
        modulePackId: packId, maxTrials: Number(maxTrials), trialDays: Number(trialDays),
        isActive: offerActive,
      } });
      toast.success("Offre enregistrée.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally { setSubmitting(false); }
  };

  const validatePayment = async () => {
    setSubmitting(true);
    try {
      await validatePartnerPayment({ data: {
        partnerId, offerId: selectedOfferId, amount: Number(amount),
        currency: "XOF", reference, reason,
      } });
      toast.success("Paiement validé et crédits attribués.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Validation impossible.");
    } finally { setSubmitting(false); }
  };

  const adjustCredits = async () => {
    setSubmitting(true);
    try {
      await adjustPartnerCredits({ data: {
        partnerId, credits: Number(adjustment), reason, reference,
      } });
      toast.success("Solde ajusté.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ajustement impossible.");
    } finally { setSubmitting(false); }
  };

  const openCreditPack = (pack?: SuperAdminCreditPack) => {
    setEditingCreditPack(pack ?? null);
    setCreditPackName(pack?.name ?? "");
    setCreditPackPrice(String(pack?.price ?? 0));
    setCreditPackCount(String(pack?.creditCount ?? 1));
    setCreditPackActive(pack?.isActive ?? true);
    setCreditPackOpen(true);
  };

  const saveCreditPack = async () => {
    setSubmitting(true);
    try {
      await savePartnerCreditPack({ data: {
        id: editingCreditPack?.id ?? null, name: creditPackName,
        price: Number(creditPackPrice), creditCount: Number(creditPackCount),
        isActive: creditPackActive,
      } });
      toast.success("Pack de crédits enregistré.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally { setSubmitting(false); }
  };

  const purchaseCreditPack = async () => {
    setSubmitting(true);
    try {
      await purchasePartnerCreditPack({ data: {
        partnerId, packId: selectedCreditPackId, reference, reason,
      } });
      toast.success("Crédits attribués au partenaire.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Attribution impossible.");
    } finally { setSubmitting(false); }
  };

  return (
    <section id="offres-partenaires" className="scroll-mt-24 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-xl font-bold">Offres partenaires</h2><p className="text-sm text-muted-foreground">Abonnements, paiements et ledger de crédits réels.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAdjustOpen(true)}>Ajuster les crédits</Button>
          <Button variant="outline" onClick={() => setCreditPurchaseOpen(true)}>Attribuer un pack</Button>
          <Button variant="outline" onClick={() => openCreditPack()}>Nouveau pack de crédits</Button>
          <Button variant="outline" onClick={() => setPaymentOpen(true)}>Valider un paiement</Button>
          <Button onClick={() => openOffer()}><Plus /> Nouvelle offre</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {commerce.offers.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            Aucune offre partenaire enregistrée.
          </Card>
        ) : commerce.offers.map((offer) => (
          <Card key={offer.id} className="p-5">
            <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{offer.name}</h3><Badge variant={offer.isActive ? "default" : "secondary"}>{offer.isActive ? "Active" : "Inactive"}</Badge></div>
            <p className="mt-3 text-2xl font-bold">{formatCurrency(offer.price)}</p>
            <p className="mt-2 text-sm text-muted-foreground">{offer.includedTenantCredits} crédits · {offer.durationDays} jours · {offer.maxTrials} essais de {offer.trialDays} jours</p>
            <div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={() => openOffer(offer)}>Modifier</Button><Button size="sm" variant="ghost" onClick={async () => { try { await removePartnerOffer({ data: { offerId: offer.id } }); window.location.reload(); } catch (error) { toast.error(error instanceof Error ? error.message : "Suppression impossible."); } }}><Trash2 className="text-destructive" /></Button></div>
          </Card>
        ))}
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">Packs de crédits d’inscription</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {commerce.creditPacks.map((pack) => (
            <Card key={pack.id} className="p-5">
              <div className="flex items-start justify-between gap-3"><h4 className="font-semibold">{pack.name}</h4><Badge variant={pack.isActive ? "default" : "secondary"}>{pack.isActive ? "Actif" : "Inactif"}</Badge></div>
              <p className="mt-3 text-2xl font-bold">{pack.creditCount} crédits</p>
              <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(pack.price)}</p>
              <Button className="mt-4" size="sm" variant="outline" onClick={() => openCreditPack(pack)}>Modifier</Button>
            </Card>
          ))}
          {!commerce.creditPacks.length && <Card className="p-5 text-sm text-muted-foreground">Aucun pack de crédits.</Card>}
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden xl:col-span-2"><div className="border-b p-4 font-semibold">Achats et attributions de packs ({commerce.creditPurchases.length})</div><div className="max-h-80 overflow-auto"><Table><TableHeader><TableRow><TableHead>Partenaire</TableHead><TableHead>Pack</TableHead><TableHead>Crédits</TableHead><TableHead>Montant</TableHead><TableHead>Référence</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>{commerce.creditPurchases.map((purchase) => <TableRow key={purchase.id}><TableCell>{commerce.partners.find((partner) => partner.id === purchase.partner_id)?.name ?? purchase.partner_id}</TableCell><TableCell>{commerce.creditPacks.find((pack) => pack.id === purchase.credit_pack_id)?.name ?? "Pack"}</TableCell><TableCell className="font-semibold text-emerald-600">+{purchase.credits}</TableCell><TableCell>{formatCurrency(Number(purchase.amount))}</TableCell><TableCell>{purchase.reference}</TableCell><TableCell>{formatDate(purchase.created_at, true)}</TableCell></TableRow>)}</TableBody></Table></div></Card>
        <Card className="overflow-hidden"><div className="border-b p-4 font-semibold">Paiements ({commerce.payments.length})</div><div className="max-h-80 overflow-auto"><Table><TableHeader><TableRow><TableHead>Partenaire</TableHead><TableHead>Référence</TableHead><TableHead>Montant</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>{commerce.payments.map((payment) => <TableRow key={payment.id}><TableCell>{commerce.partners.find((partner) => partner.id === payment.partner_id)?.name ?? payment.partner_id}</TableCell><TableCell>{payment.external_reference}</TableCell><TableCell>{formatCurrency(Number(payment.amount))}</TableCell><TableCell>{formatDate(payment.created_at, true)}</TableCell></TableRow>)}</TableBody></Table></div></Card>
        <Card className="overflow-hidden"><div className="border-b p-4 font-semibold">Crédits et débits ({commerce.credits.length})</div><div className="max-h-80 overflow-auto"><Table><TableHeader><TableRow><TableHead>Partenaire</TableHead><TableHead>Variation</TableHead><TableHead>Motif</TableHead><TableHead>Solde</TableHead></TableRow></TableHeader><TableBody>{commerce.credits.map((item) => <TableRow key={item.id}><TableCell>{commerce.partners.find((partner) => partner.id === item.partner_id)?.name ?? item.partner_id}</TableCell><TableCell className={item.credits > 0 ? "text-emerald-600" : "text-destructive"}>{item.credits > 0 ? "+" : ""}{item.credits}</TableCell><TableCell>{item.reason}</TableCell><TableCell>{item.balance_after}</TableCell></TableRow>)}</TableBody></Table></div></Card>
        <Card className="overflow-hidden xl:col-span-2"><div className="border-b p-4 font-semibold">Essais et activations ({commerce.trials.length})</div><div className="max-h-80 overflow-auto"><Table><TableHeader><TableRow><TableHead>Partenaire</TableHead><TableHead>Email</TableHead><TableHead>Statut</TableHead><TableHead>Début</TableHead><TableHead>Expiration</TableHead></TableRow></TableHeader><TableBody>{commerce.trials.map((trial) => <TableRow key={trial.id}><TableCell>{commerce.partners.find((partner) => partner.id === trial.partner_id)?.name ?? trial.partner_id}</TableCell><TableCell>{trial.client_email}</TableCell><TableCell>{trial.status}</TableCell><TableCell>{formatDate(trial.starts_at)}</TableCell><TableCell>{formatDate(trial.expires_at)}</TableCell></TableRow>)}</TableBody></Table></div></Card>
      </div>

      <Dialog open={offerOpen} onOpenChange={setOfferOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? "Modifier l’offre" : "Créer une offre"}</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Nom</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div><div className="space-y-2"><Label>Prix XOF</Label><Input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} /></div><div className="space-y-2"><Label>Crédits inclus</Label><Input type="number" min="0" value={credits} onChange={(event) => setCredits(event.target.value)} /></div><div className="space-y-2"><Label>Durée (jours)</Label><Input type="number" min="1" value={duration} onChange={(event) => setDuration(event.target.value)} /></div><div className="space-y-2"><Label>Pack</Label><Select value={packId} onValueChange={setPackId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{packs.map((pack) => <SelectItem key={pack.id} value={pack.id}>{pack.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Essais maximum</Label><Input type="number" min="0" value={maxTrials} onChange={(event) => setMaxTrials(event.target.value)} /></div><div className="space-y-2"><Label>Durée essai (jours)</Label><Input type="number" min="0" value={trialDays} onChange={(event) => setTrialDays(event.target.value)} /></div><div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2"><Label>Offre active</Label><Switch checked={offerActive} onCheckedChange={setOfferActive} /></div></div><DialogFooter><Button variant="outline" onClick={() => setOfferOpen(false)}>Annuler</Button><Button disabled={submitting || !name || !packId} onClick={() => void saveOffer()}>Enregistrer</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}><DialogContent><DialogHeader><DialogTitle>Valider un paiement</DialogTitle><DialogDescription>La référence rend cette validation idempotente.</DialogDescription></DialogHeader><div className="space-y-4"><Select value={partnerId} onValueChange={setPartnerId}><SelectTrigger><SelectValue placeholder="Partenaire" /></SelectTrigger><SelectContent>{commerce.partners.map((partner) => <SelectItem key={partner.id} value={partner.id}>{partner.name}</SelectItem>)}</SelectContent></Select><Select value={selectedOfferId} onValueChange={(value) => { setSelectedOfferId(value); setAmount(String(commerce.offers.find((offer) => offer.id === value)?.price ?? "")); }}><SelectTrigger><SelectValue placeholder="Offre" /></SelectTrigger><SelectContent>{commerce.offers.filter((offer) => offer.isActive).map((offer) => <SelectItem key={offer.id} value={offer.id}>{offer.name}</SelectItem>)}</SelectContent></Select><Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Montant" /><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Référence externe unique" /><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Note (optionnelle)" /></div><DialogFooter><Button variant="outline" onClick={() => setPaymentOpen(false)}>Annuler</Button><Button disabled={submitting || !partnerId || !selectedOfferId || !reference} onClick={() => void validatePayment()}>Valider</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}><DialogContent><DialogHeader><DialogTitle>Ajustement manuel</DialogTitle><DialogDescription>Utilisez une valeur positive pour créditer, négative pour débiter.</DialogDescription></DialogHeader><div className="space-y-4"><Select value={partnerId} onValueChange={setPartnerId}><SelectTrigger><SelectValue placeholder="Partenaire" /></SelectTrigger><SelectContent>{commerce.partners.map((partner) => <SelectItem key={partner.id} value={partner.id}>{partner.name} · {partner.creditBalance} crédits</SelectItem>)}</SelectContent></Select><Input type="number" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} placeholder="Variation de crédits" /><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motif obligatoire" /><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Référence (optionnelle)" /></div><DialogFooter><Button variant="outline" onClick={() => setAdjustOpen(false)}>Annuler</Button><Button disabled={submitting || !partnerId || !reason.trim() || Number(adjustment) === 0} onClick={() => void adjustCredits()}>Appliquer</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={creditPackOpen} onOpenChange={setCreditPackOpen}><DialogContent><DialogHeader><DialogTitle>{editingCreditPack ? "Modifier le pack" : "Créer un pack de crédits"}</DialogTitle><DialogDescription>Un crédit permet la création d’un tenant.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Nom</Label><Input value={creditPackName} onChange={(event) => setCreditPackName(event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Prix XOF</Label><Input type="number" min="0" value={creditPackPrice} onChange={(event) => setCreditPackPrice(event.target.value)} /></div><div className="space-y-2"><Label>Nombre de crédits</Label><Input type="number" min="1" value={creditPackCount} onChange={(event) => setCreditPackCount(event.target.value)} /></div></div><div className="flex items-center justify-between rounded-lg border p-3"><Label>Pack actif</Label><Switch checked={creditPackActive} onCheckedChange={setCreditPackActive} /></div></div><DialogFooter><Button variant="outline" onClick={() => setCreditPackOpen(false)}>Annuler</Button><Button disabled={submitting || !creditPackName.trim() || Number(creditPackCount) < 1} onClick={() => void saveCreditPack()}>Enregistrer</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={creditPurchaseOpen} onOpenChange={setCreditPurchaseOpen}><DialogContent><DialogHeader><DialogTitle>Acheter / attribuer des crédits</DialogTitle><DialogDescription>L’attribution crédite immédiatement et atomiquement le portefeuille du Partner.</DialogDescription></DialogHeader><div className="space-y-4"><Select value={partnerId} onValueChange={setPartnerId}><SelectTrigger><SelectValue placeholder="Partenaire" /></SelectTrigger><SelectContent>{commerce.partners.map((partner) => <SelectItem key={partner.id} value={partner.id}>{partner.name} · solde {partner.creditBalance}</SelectItem>)}</SelectContent></Select><Select value={selectedCreditPackId} onValueChange={setSelectedCreditPackId}><SelectTrigger><SelectValue placeholder="Pack de crédits" /></SelectTrigger><SelectContent>{commerce.creditPacks.filter((pack) => pack.isActive).map((pack) => <SelectItem key={pack.id} value={pack.id}>{pack.name} · {pack.creditCount} crédits · {formatCurrency(pack.price)}</SelectItem>)}</SelectContent></Select><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Référence unique" /><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Note (optionnelle)" /></div><DialogFooter><Button variant="outline" onClick={() => setCreditPurchaseOpen(false)}>Annuler</Button><Button disabled={submitting || !partnerId || !selectedCreditPackId || !reference.trim()} onClick={() => void purchaseCreditPack()}>Attribuer</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}

function ModulePacksSection({
  packs,
  modules,
}: {
  packs: SuperAdminModulePack[];
  modules: SuperAdminDashboard["modules"];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<SuperAdminModulePack | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [moduleIds, setModuleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const openEditor = (pack?: SuperAdminModulePack) => {
    setEditing(pack ?? null);
    setName(pack?.name ?? "");
    setCode(pack?.code ?? "");
    setDescription(pack?.description ?? "");
    setActive(pack?.is_active ?? true);
    setModuleIds(pack?.moduleIds ?? []);
    setDialogOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await saveModulePack({
        data: {
          id: editing?.id ?? null,
          name,
          code,
          description: description || null,
          isActive: active,
          moduleIds,
        },
      });
      toast.success(editing ? "Pack mis à jour." : "Pack créé.");
      setDialogOpen(false);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer le pack.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (pack: SuperAdminModulePack) => {
    if (!window.confirm(`Supprimer le pack « ${pack.name} » ?`)) return;
    try {
      await removeModulePack({ data: { packId: pack.id } });
      toast.success("Pack supprimé.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer le pack.");
    }
  };

  return (
    <section id="packs-modules" className="scroll-mt-24 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Packs de modules</h2>
          <p className="text-sm text-muted-foreground">
            Regroupez les modules {PLATFORM_BRANDING.shortName} et attribuez-les depuis la fiche d’un tenant.
          </p>
        </div>
        <Button onClick={() => openEditor()}><Plus /> Nouveau pack</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {packs.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground md:col-span-2 xl:col-span-4">
            Aucun pack de modules enregistré.
          </Card>
        ) : packs.map((pack) => (
          <Card key={pack.id} className="flex flex-col rounded-xl border-border/70 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950">
                <Layers3 className="size-5" />
              </div>
              <Badge variant={pack.is_active ? "default" : "secondary"}>
                {pack.is_active ? "Actif" : "Inactif"}
              </Badge>
            </div>
            <h3 className="mt-4 font-semibold">{pack.name}</h3>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{pack.code}</p>
            <p className="mt-3 min-h-10 text-sm text-muted-foreground">
              {pack.description ?? "Aucune description"}
            </p>
            <p className="mt-3 text-xs font-medium">
              {pack.moduleIds.length} module{pack.moduleIds.length > 1 ? "s" : ""}
            </p>
            <div className="mt-4 flex gap-2 border-t pt-4">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditor(pack)}>
                <Pencil /> Modifier
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void remove(pack)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] min-w-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 px-4 pb-4 pt-6 sm:px-6">
            <DialogTitle>{editing ? "Modifier le pack" : "Créer un pack"}</DialogTitle>
            <DialogDescription>
              La composition sera enregistrée de façon atomique avec le pack.
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-w-0 flex-1 gap-4 overflow-x-hidden overflow-y-auto px-4 py-2 sm:grid-cols-2 sm:px-6">
            <div className="space-y-2">
              <Label htmlFor="pack-name">Nom</Label>
              <Input id="pack-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-code">Code</Label>
              <Input id="pack-code" value={code} onChange={(event) => setCode(event.target.value.toLowerCase())} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pack-description">Description</Label>
              <Textarea id="pack-description" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <Label htmlFor="pack-active">Pack actif</Label>
              <Switch id="pack-active" checked={active} onCheckedChange={setActive} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Modules inclus</Label>
              <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
                {modules.map((module) => (
                  <label key={module.id} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted">
                    <Checkbox
                      checked={moduleIds.includes(module.id)}
                      onCheckedChange={(checked) =>
                        setModuleIds((current) =>
                          checked ? [...current, module.id] : current.filter((id) => id !== module.id),
                        )
                      }
                    />
                    <span>
                      <span className="block text-sm font-medium">{module.name}</span>
                      <span className="block text-xs text-muted-foreground">{module.code}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 shrink-0 gap-2 border-t bg-background px-4 py-4 sm:px-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button disabled={submitting || !name.trim() || !code.trim()} onClick={() => void submit()}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TenantTable({
  tenants,
  deletionJobs,
  aiPlans,
  modulePacks,
  query,
  onQueryChange,
}: {
  tenants: SuperAdminTenant[];
  deletionJobs: TenantDeletionJob[];
  aiPlans: SuperAdminAiPlan[];
  modulePacks: SuperAdminModulePack[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const [selectedTenant, setSelectedTenant] = useState<SuperAdminTenant | null>(null);
  const [moduleTenant, setModuleTenant] = useState<SuperAdminTenant | null>(null);
  const [aiTenant, setAiTenant] = useState<SuperAdminTenant | null>(null);
  const [deletionTenant, setDeletionTenant] = useState<SuperAdminTenant | null>(null);
  const [activationTenant, setActivationTenant] = useState<SuperAdminTenant | null>(null);
  const [confirmationSlug, setConfirmationSlug] = useState("");
  const [deletionReason, setDeletionReason] = useState("");
  const [secondConfirmation, setSecondConfirmation] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const router = useRouter();
  const activeDeletionByTenant = useMemo(
    () => new Map(
      deletionJobs
        .filter((job) => job.status !== "completed")
        .map((job) => [job.tenantId, job]),
    ),
    [deletionJobs],
  );
  const deletionStatusLabels: Record<TenantDeletionJob["status"], string> = {
    pending: "En attente",
    running: "En cours",
    partial: "Partiel",
    failed: "Échoué",
    completed: "Terminé",
  };
  const launchDeletion = async () => {
    if (!deletionTenant || confirmationSlug !== deletionTenant.name || !secondConfirmation) return;
    setDeletionBusy(true);
    try {
      const result = await manageTenantLifecycle({
        data: {
          tenantId: deletionTenant.id,
          action: "soft_delete",
          reason: deletionReason,
          exactName: confirmationSlug,
          secondConfirmation: "CONFIRMER LA SUPPRESSION",
        },
      });
      const count = Object.values(result.dependencies).reduce((sum, value) => sum + value, 0);
      toast.success(`Tenant supprimé logiquement. ${count} dépendance(s) conservée(s).`);
      setDeletionTenant(null);
      setConfirmationSlug("");
      setDeletionReason("");
      setSecondConfirmation(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La suppression a échoué.");
    } finally {
      setDeletionBusy(false);
      await router.invalidate();
    }
  };
  const retryDeletion = async (_job: TenantDeletionJob) => {
    toast.error("La purge physique est désactivée dans ce parcours.");
  };
  const changeLifecycle = async (
    tenant: SuperAdminTenant,
    action: "suspend" | "reactivate" | "restore",
  ) => {
    setDeletionBusy(true);
    try {
      await manageTenantLifecycle({
        data: {
          tenantId: tenant.id,
          action,
          reason: `${action} décidé depuis le Super Admin`,
        },
      });
      toast.success(action === "suspend" ? "Tenant suspendu." : action === "restore" ? "Tenant restauré." : "Tenant réactivé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La nouvelle tentative a échoué.");
    } finally {
      setDeletionBusy(false);
      await router.invalidate();
    }
  };
  const copyLoginUrl = async (tenant: SuperAdminTenant) => {
    const url = new URL(tenant.loginUrl, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien de connexion copié.");
    } catch {
      toast.error("Impossible de copier le lien de connexion.");
    }
  };
  const resendInvitation = async (tenant: SuperAdminTenant) => {
    try {
      await resendSuperAdminTenantInvitation({ data: { tenantId: tenant.id } });
      toast.success("Invitation renvoyée.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de renvoyer l’invitation.");
    }
  };
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return tenants;
    return tenants.filter((tenant) =>
      [tenant.name, tenant.status, tenant.plan ?? "", tenant.pack?.name ?? "", tenant.id].some((value) =>
        value.toLocaleLowerCase("fr").includes(normalized),
      ),
    );
  }, [query, tenants]);

  return (
    <Card
      id="tenants"
      className="scroll-mt-24 overflow-hidden rounded-xl border-border/70 bg-card shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">Tenants</h2>
          <p className="mt-1 text-xs text-slate-400">
            {numberFormatter.format(filtered.length)} résultat{filtered.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Rechercher un tenant..."
            aria-label="Rechercher un tenant"
            className="h-9 rounded-lg border-border bg-muted/40 pl-9 dark:bg-muted/60"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
            <Building2 className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Aucun tenant trouvé</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Modifiez votre recherche pour afficher des résultats.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[1180px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Tenant</TableHead>
                <TableHead>Partner créateur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Offre</TableHead>
                <TableHead>Création</TableHead>
                <TableHead className="text-right">Utilisateurs</TableHead>
                <TableHead className="text-right">Ventes</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="text-right">CA mensuel</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Pack modules</TableHead>
                <TableHead>Fin abonnement</TableHead>
                <TableHead>Activité</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tenant) => (
                <TableRow
                  key={tenant.id}
                  className="border-border/60 transition-colors hover:bg-muted/30"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-blue-500/15 font-semibold text-violet-600 dark:text-violet-300">
                        {tenant.name.charAt(0).toLocaleUpperCase("fr")}
                      </div>
                      <div>
                        <p className="max-w-48 truncate font-medium text-foreground">
                          {tenant.name}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">
                          {tenant.id.slice(0, 8)}
                        </p>
                        <a
                          href={tenant.loginUrl}
                          className="block max-w-56 truncate text-xs text-blue-600 hover:underline"
                        >
                          {tenant.loginUrl}
                        </a>
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {{ sent: "Invitation envoyée", pending: "En attente d’activation", activated: "Compte activé", expired: "Invitation expirée", unavailable: "Statut indisponible" }[tenant.invitationStatus]}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {tenant.partner ? (
                      <div>
                        <p className="font-medium">{tenant.partner.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.partner.code}</p>
                      </div>
                    ) : <span className="text-muted-foreground">Direct</span>}
                  </TableCell>
                  <TableCell>
                    {tenant.deletedAt ? (
                      <Badge variant="destructive">Supprimé</Badge>
                    ) : activeDeletionByTenant.has(tenant.id) ? (
                      <Badge variant="destructive">
                        {deletionStatusLabels[activeDeletionByTenant.get(tenant.id)!.status]}
                      </Badge>
                    ) : <Badge
                      className={cn(
                        "rounded-full border-0 px-2.5 font-medium",
                        isActive(tenant.status)
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      <span
                        className={cn(
                          "mr-1.5 size-1.5 rounded-full",
                          isActive(tenant.status) ? "bg-emerald-500" : "bg-slate-400",
                        )}
                      />
                      {statusLabels[tenant.status] ?? tenant.status}
                    </Badge>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{tenant.users}</TableCell>
                  <TableCell className="text-right tabular-nums">{tenant.sales}</TableCell>
                  <TableCell className="text-right tabular-nums">{tenant.clients}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(tenant.monthlyRevenue)}
                  </TableCell>
                  <TableCell>{tenant.plan ? cycleLabels[tenant.plan] : "—"}</TableCell>
                  <TableCell>
                    {tenant.pack ? (
                      <Badge variant="secondary" className="whitespace-nowrap">
                        <Layers3 className="mr-1 size-3" />
                        {tenant.pack.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Aucun</span>
                    )}
                  </TableCell>
                  <TableCell>{tenant.partnerOffer?.name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(tenant.createdAt)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div>{formatDate(tenant.subscriptionEnd)}</div>
                    {tenant.daysRemaining !== null && (
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {tenant.daysRemaining} jour{tenant.daysRemaining > 1 ? "s" : ""} restant
                        {tenant.daysRemaining > 1 ? "s" : ""}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-slate-500">
                    {formatDate(tenant.lastActivityAt, true)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground"
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 rounded-lg">
                        <DropdownMenuLabel>Actions du tenant</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {tenant.onboardingStatus === "pending_configuration" && <DropdownMenuItem onClick={() => setActivationTenant(tenant)}><ShieldCheck />Configurer et activer l’essai</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => void copyLoginUrl(tenant)}>
                          <ClipboardCopy />
                          Copier le lien de connexion
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!tenant.adminEmail || tenant.invitationStatus === "activated"} onClick={() => void resendInvitation(tenant)}>
                          <Mail />
                          Renvoyer l’invitation
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!tenant.subscriptionId}
                          onClick={() => setSelectedTenant(tenant)}
                        >
                          <KeyRound />
                          Gérer la licence
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setModuleTenant(tenant)}>
                          <Gauge />
                          Gérer les modules
                        </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAiTenant(tenant)}>
                            <Bot />
                            Abonnement Assistant IA
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a
                              href={`/settings/catalogue?tenantId=${encodeURIComponent(tenant.id)}`}
                            >
                              <Settings />
                              Configurer le catalogue
                            </a>
                          </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {tenant.deletedAt ? (
                          <DropdownMenuItem onClick={() => void changeLifecycle(tenant, "restore")}>
                            <Activity />
                            Restaurer
                          </DropdownMenuItem>
                        ) : tenant.suspendedAt || tenant.status === "suspended" ? (
                          <DropdownMenuItem onClick={() => void changeLifecycle(tenant, "reactivate")}>
                            <Activity />
                            Réactiver
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => void changeLifecycle(tenant, "suspend")}>
                            <Activity />
                            Suspendre
                          </DropdownMenuItem>
                        )}
                        {activeDeletionByTenant.has(tenant.id) ? (
                          <DropdownMenuItem
                            disabled={
                              deletionBusy ||
                              !["failed", "partial"].includes(
                                activeDeletionByTenant.get(tenant.id)!.status,
                              )
                            }
                            onClick={() => void retryDeletion(activeDeletionByTenant.get(tenant.id)!)}
                          >
                            <Activity />
                            Réessayer la suppression
                          </DropdownMenuItem>
                        ) : !tenant.deletedAt && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setConfirmationSlug("");
                              setDeletionReason("");
                              setSecondConfirmation(false);
                              setDeletionTenant(tenant);
                            }}
                          >
                            <Trash2 />
                            Supprimer logiquement
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {deletionJobs.length > 0 && (
        <div className="border-t border-border/70 p-5">
          <h3 className="text-sm font-semibold">Suivi des suppressions</h3>
          <div className="mt-3 space-y-2">
            {deletionJobs.slice(0, 10).map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{job.tenantName} ({job.tenantSlug})</p>
                  <p className="text-xs text-muted-foreground">
                    Étape : {job.currentStep} · tentative {job.attemptCount}
                  </p>
                  {job.lastError?.message && (
                    <p className="mt-1 line-clamp-2 text-xs text-destructive">
                      {job.lastError.message}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={job.status === "completed" ? "secondary" : job.status === "running" ? "default" : "destructive"}>
                    {deletionStatusLabels[job.status]}
                  </Badge>
                  {["failed", "partial"].includes(job.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deletionBusy}
                      onClick={() => void retryDeletion(job)}
                    >
                      Réessayer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Dialog
        open={Boolean(deletionTenant)}
        onOpenChange={(open) => {
          if (!open && !deletionBusy) {
            setDeletionTenant(null);
            setConfirmationSlug("");
          }
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Supprimer logiquement ce tenant ?</DialogTitle>
            <DialogDescription>
              Le tenant sera désactivé et masqué des listes actives. Ses profils, rôles,
              abonnements, crédits, transactions, ventes, devis, fichiers et données métier
              seront audités puis conservés pour permettre une restauration. Saisissez exactement{" "}
              <strong className="font-mono text-foreground">{deletionTenant?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmationSlug}
            onChange={(event) => setConfirmationSlug(event.target.value)}
            placeholder="Nom exact du tenant"
            autoComplete="off"
            disabled={deletionBusy}
          />
          <Textarea
            value={deletionReason}
            onChange={(event) => setDeletionReason(event.target.value)}
            placeholder="Motif obligatoire"
            disabled={deletionBusy}
          />
          <label className="flex items-start gap-3 rounded-lg border border-destructive/30 p-3 text-sm">
            <Checkbox
              checked={secondConfirmation}
              onCheckedChange={(checked) => setSecondConfirmation(checked === true)}
              disabled={deletionBusy}
            />
            <span>Je confirme une seconde fois la suppression logique de ce tenant.</span>
          </label>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deletionBusy}
              onClick={() => setDeletionTenant(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={
                deletionBusy ||
                !deletionTenant ||
                confirmationSlug !== deletionTenant.name ||
                deletionReason.trim().length < 3 ||
                !secondConfirmation
              }
              onClick={() => void launchDeletion()}
            >
              {deletionBusy ? "Suppression en cours…" : "Confirmer la suppression logique"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SubscriptionDialog
        tenant={selectedTenant}
        open={Boolean(selectedTenant)}
        onOpenChange={(open) => {
          if (!open) setSelectedTenant(null);
        }}
      />
      <TenantModulesDialog
        tenant={moduleTenant}
        packs={modulePacks}
        open={Boolean(moduleTenant)}
        onOpenChange={(open) => {
          if (!open) setModuleTenant(null);
        }}
      />
      <AiSubscriptionDialog
        tenant={aiTenant}
        plans={aiPlans}
        open={Boolean(aiTenant)}
        onOpenChange={(open) => {
          if (!open) setAiTenant(null);
        }}
      />
      <PendingActivationDialog tenant={activationTenant} packs={modulePacks} open={Boolean(activationTenant)} onOpenChange={(open) => { if (!open) setActivationTenant(null); }} />
    </Card>
  );
}

type AiSubscriptionAction = "activate" | "suspend" | "renew" | "extend" | "cancel" | "update";

function AiSubscriptionDialog({
  tenant,
  plans,
  open,
  onOpenChange,
}: {
  tenant: SuperAdminTenant | null;
  plans: SuperAdminAiPlan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const subscription = tenant?.aiSubscription;
  const [action, setAction] = useState<AiSubscriptionAction>("activate");
  const [activationStatus, setActivationStatus] = useState<Extract<AiSubscriptionStatus, "active" | "trial">>("active");
  const [planCode, setPlanCode] = useState("");
  const [quota, setQuota] = useState("");
  const [days, setDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setAction(subscription ? "update" : "activate");
    setActivationStatus(subscription?.status === "trial" ? "trial" : "active");
    setPlanCode(subscription?.planCode ?? plans[0]?.code ?? "");
    setQuota(subscription ? String(subscription.monthlyRequestLimit) : "");
    setDays("30");
  }, [tenant, subscription, plans]);

  const submit = async () => {
    if (!tenant) return;
    const parsedQuota = Number(quota);
    const parsedDays = Number(days);
    if (!planCode || !Number.isInteger(parsedQuota) || parsedQuota < 1) {
      toast.error("Sélectionnez un plan et indiquez un quota mensuel positif.");
      return;
    }
    if (
      ["activate", "renew", "extend"].includes(action) &&
      (!Number.isInteger(parsedDays) || parsedDays < 1)
    ) {
      toast.error("La durée doit être un nombre entier positif.");
      return;
    }
    setSubmitting(true);
    try {
      await manageTenantAiSubscription({
        data: {
          tenantId: tenant.id,
          action,
          planCode,
          monthlyRequestLimit: parsedQuota,
          ...(action === "activate" ? { activationStatus } : {}),
          ...(["activate", "renew", "extend"].includes(action) ? { days: parsedDays } : {}),
        },
      });
      toast.success("Abonnement Assistant IA mis à jour.");
      onOpenChange(false);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Abonnement Assistant IA</DialogTitle>
          <DialogDescription>
            Abonnement premium indépendant de la licence ERP de {tenant?.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
          <div>Statut : <strong>{subscription?.status ?? "Aucun abonnement"}</strong></div>
          <div>Plan : <strong>{subscription?.planCode ?? "—"}</strong></div>
          <div>
            Consommation : <strong>{subscription ? `${subscription.requestsUsed} / ${subscription.monthlyRequestLimit}` : "—"}</strong>
          </div>
          <div>Expiration : <strong>{formatDate(subscription?.expiresAt ?? null)}</strong></div>
          <div className="sm:col-span-2">
            Période : <strong>{subscription ? `${formatDate(subscription.currentPeriodStart)} → ${formatDate(subscription.currentPeriodEnd)}` : "—"}</strong>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ai-action">Action</Label>
            <select id="ai-action" value={action} onChange={(event) => setAction(event.target.value as AiSubscriptionAction)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="activate">Activer</option>
              <option value="update">Modifier plan/quota</option>
              <option value="renew">Renouveler</option>
              <option value="extend">Prolonger</option>
              <option value="suspend">Suspendre</option>
              <option value="cancel">Résilier</option>
            </select>
          </div>
          {action === "activate" && (
            <div className="space-y-2">
              <Label htmlFor="ai-status">Type d’activation</Label>
              <select id="ai-status" value={activationStatus} onChange={(event) => setActivationStatus(event.target.value as "active" | "trial")} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="active">Actif</option>
                <option value="trial">Essai</option>
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="ai-plan">Plan</Label>
            <select id="ai-plan" value={planCode} onChange={(event) => {
              const code = event.target.value;
              setPlanCode(code);
              const plan = plans.find((item) => item.code === code);
              if (!subscription && plan?.monthlyRequestLimit) setQuota(String(plan.monthlyRequestLimit));
            }} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Sélectionner</option>
              {plans.map((plan) => (
                <option key={plan.code} value={plan.code}>{plan.name}{plan.enabled ? "" : " (désactivé)"}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-quota">Quota mensuel</Label>
            <Input id="ai-quota" type="number" min={1} value={quota} onChange={(event) => setQuota(event.target.value)} />
          </div>
          {["activate", "renew", "extend"].includes(action) && (
            <div className="space-y-2">
              <Label htmlFor="ai-days">Durée en jours</Label>
              <Input id="ai-days" type="number" min={1} value={days} onChange={(event) => setDays(event.target.value)} />
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Historique d’utilisation</h3>
          <div className="max-h-52 overflow-auto rounded-lg border">
            {tenant?.aiUsageHistory.length ? (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Tool</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Tokens</TableHead></TableRow></TableHeader>
                <TableBody>
                  {tenant.aiUsageHistory.map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell className="whitespace-nowrap text-xs">{formatDate(usage.createdAt, true)}</TableCell>
                      <TableCell>{usage.toolName ?? usage.requestType}</TableCell>
                      <TableCell>{usage.status}</TableCell>
                      <TableCell className="text-right">{usage.totalTokens ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <p className="p-4 text-sm text-muted-foreground">Aucun appel IA enregistré.</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Enregistrement…" : "Confirmer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TenantModulesDialog({
  tenant,
  packs,
  open,
  onOpenChange,
}: {
  tenant: SuperAdminTenant | null;
  packs: SuperAdminModulePack[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pendingModule, setPendingModule] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setSelectedPackId(tenant?.pack?.id ?? "");
  }, [tenant]);

  const applyPack = async () => {
    if (!tenant || !selectedPackId) return;
    setAssigning(true);
    try {
      await assignModulePack({ data: { tenantId: tenant.id, packId: selectedPackId } });
      toast.success("Pack attribué et modules synchronisés.");
      onOpenChange(false);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’attribuer le pack.");
    } finally {
      setAssigning(false);
    }
  };

  const toggleModule = async (moduleId: string, enabled: boolean) => {
    if (!tenant) return;
    setPendingModule(moduleId);
    try {
      await manageTenantModule({
        data: { tenantId: tenant.id, moduleId, enabled },
      });
      toast.success(enabled ? "Module activé." : "Module désactivé.");
      onOpenChange(false);
      await router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de mettre à jour le module.",
      );
    } finally {
      setPendingModule(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modules du tenant</DialogTitle>
          <DialogDescription>
            Activez uniquement les fonctions accessibles à {tenant?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <Label>Pack actuel</Label>
          <div className="mt-2 flex gap-2">
            <Select value={selectedPackId} onValueChange={setSelectedPackId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner un pack" />
              </SelectTrigger>
              <SelectContent>
                {packs.filter((pack) => pack.is_active).map((pack) => (
                  <SelectItem key={pack.id} value={pack.id}>{pack.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => void applyPack()}
              disabled={!selectedPackId || assigning || selectedPackId === tenant?.pack?.id}
            >
              {assigning ? "Attribution…" : "Attribuer"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            L’attribution synchronise les modules avec le pack. Les interrupteurs ci-dessous
            permettent ensuite d’ajouter ou retirer des exceptions pour ce tenant.
          </p>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto py-2">
          {!tenant?.modules.length ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Aucun module disponible pour ce tenant.
            </p>
          ) : tenant.modules.map((module) => (
            <div
              key={module.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <Label htmlFor={`module-${module.id}`}>{module.name}</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {module.description ?? module.code}
                </p>
              </div>
              <Switch
                id={`module-${module.id}`}
                checked={module.enabled}
                disabled={pendingModule !== null}
                onCheckedChange={(enabled) => toggleModule(module.id, enabled)}
                aria-label={`${module.enabled ? "Désactiver" : "Activer"} ${module.name}`}
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type SubscriptionAction = "activate" | "extend" | "suspend" | "renew";

function SubscriptionDialog({
  tenant,
  open,
  onOpenChange,
}: {
  tenant: SuperAdminTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [action, setAction] = useState<SubscriptionAction>("activate");
  const [amount, setAmount] = useState("0");
  const [days, setDays] = useState("30");
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>("monthly");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setAction(tenant.subscriptionStatus === "active" ? "renew" : "activate");
    setAmount(String(tenant.subscriptionAmount));
    setBillingCycle(tenant.plan ?? "monthly");
    setDays(tenant.plan === "yearly" ? "365" : tenant.plan === "quarterly" ? "90" : "30");
  }, [tenant]);

  const submit = async () => {
    if (!tenant) return;
    const parsedDays = Number(days);
    const parsedAmount = Number(amount);
    if (action !== "suspend" && (!Number.isInteger(parsedDays) || parsedDays < 1)) {
      toast.error("La durée doit être un nombre entier positif.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      toast.error("Le montant doit être positif ou nul.");
      return;
    }
    setSubmitting(true);
    try {
      await manageTenantSubscription({
        data: {
          tenantId: tenant.id,
          action,
          ...(action === "suspend" ? {} : { days: parsedDays, amount: parsedAmount, billingCycle }),
        },
      });
      toast.success("Licence mise à jour.");
      onOpenChange(false);
      await router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de mettre à jour la licence.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gérer la licence</DialogTitle>
          <DialogDescription>
            {tenant?.name} · {statusLabels[tenant?.subscriptionStatus ?? ""] ?? "Sans statut"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="subscription-action">Action</Label>
            <select
              id="subscription-action"
              value={action}
              onChange={(event) => setAction(event.target.value as SubscriptionAction)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="activate">Activer</option>
              <option value="extend">Prolonger</option>
              <option value="suspend">Suspendre</option>
              <option value="renew">Renouveler</option>
            </select>
          </div>
          {action !== "suspend" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="subscription-days">Durée (jours)</Label>
                  <Input
                    id="subscription-days"
                    type="number"
                    min={1}
                    max={3650}
                    value={days}
                    onChange={(event) => setDays(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscription-amount">Montant ({DEFAULT_CURRENCY})</Label>
                  <Input
                    id="subscription-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription-cycle">Cycle de facturation</Label>
                <select
                  id="subscription-cycle"
                  value={billingCycle}
                  onChange={(event) =>
                    setBillingCycle(event.target.value as SubscriptionBillingCycle)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="monthly">Mensuel</option>
                  <option value="quarterly">Trimestriel</option>
                  <option value="yearly">Annuel</option>
                </select>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            {submitting ? "Enregistrement…" : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionSummary({ data }: { data: SuperAdminDashboard["subscriptions"] }) {
  const items = [
    {
      label: "Licences actives",
      value: numberFormatter.format(data.active),
      icon: KeyRound,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Essais",
      value: numberFormatter.format(data.trials),
      icon: CalendarClock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Expirés",
      value: numberFormatter.format(data.expired),
      icon: Activity,
      color: "text-rose-600 bg-rose-50",
    },
    {
      label: "Revenus récurrents",
      value: formatCurrency(data.recurringRevenue),
      icon: CreditCard,
      color: "text-blue-600 bg-blue-50",
    },
  ];

  return (
    <section id="licences" className="scroll-mt-24">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-950">Résumé des abonnements</h2>
        <p className="mt-1 text-xs text-slate-400">Indicateurs issus des abonnements enregistrés</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="rounded-xl border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={cn("flex size-10 items-center justify-center rounded-xl", color)}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 truncate text-xl font-semibold text-foreground">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CreateTenantDialog({ open, onOpenChange, modules }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: SuperAdminDashboard["modules"];
}) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>("monthly");
  const [durationDays, setDurationDays] = useState("30");
  const [moduleIds, setModuleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await createInvitedTenant({ data: {
        companyName,
        adminEmail,
        billingCycle,
        durationDays: Number(durationDays),
        moduleIds,
      } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Tenant créé et invitation envoyée.");
      onOpenChange(false);
      setCompanyName(""); setAdminEmail(""); setModuleIds([]);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer le tenant.");
    } finally {
      setSubmitting(false);
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Créer un tenant par invitation</DialogTitle>
        <DialogDescription>Le client recevra un lien pour définir lui-même son mot de passe.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2"><Label htmlFor="tenant-company">Entreprise</Label><Input id="tenant-company" value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="tenant-email">E-mail administrateur</Label><Input id="tenant-email" type="email" autoComplete="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Offre</Label><Select value={billingCycle} onValueChange={(value) => setBillingCycle(value as SubscriptionBillingCycle)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Mensuelle</SelectItem><SelectItem value="quarterly">Trimestrielle</SelectItem><SelectItem value="yearly">Annuelle</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="tenant-duration">Durée (jours)</Label><Input id="tenant-duration" type="number" min="1" max="3650" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Modules</Label><div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">{modules.filter((module) => module.is_active).map((module) => <label key={module.id} className="flex items-center gap-2 text-sm"><Checkbox checked={moduleIds.includes(module.id)} onCheckedChange={(checked) => setModuleIds((current) => checked ? [...current, module.id] : current.filter((id) => id !== module.id))} />{module.name}</label>)}</div></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button><Button onClick={() => void submit()} disabled={submitting || companyName.trim().length < 2 || !adminEmail.includes("@") || Number(durationDays) < 1}>{submitting ? "Création…" : "Créer et inviter"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function PendingActivationDialog({ tenant, packs, open, onOpenChange }: { tenant: SuperAdminTenant | null; packs: SuperAdminModulePack[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter(); const [packId,setPackId]=useState<string>(""); const [moduleIds,setModuleIds]=useState<string[]>([]); const [cycle,setCycle]=useState<SubscriptionBillingCycle>("monthly"); const [days,setDays]=useState("3"); const [amount,setAmount]=useState("0"); const [busy,setBusy]=useState(false);
  useEffect(()=>{if(!tenant)return;const suggested=packs.find(p=>p.code===tenant.suggestedPackCode);setPackId(suggested?.id??"");setModuleIds(suggested?.moduleIds??[]);},[tenant,packs]);
  const choosePack=(id:string)=>{setPackId(id);setModuleIds(packs.find(p=>p.id===id)?.moduleIds??[])};
  const submit=async()=>{if(!tenant)return;setBusy(true);try{await activatePendingTrial({data:{tenantId:tenant.id,packId:packId||null,moduleIds,billingCycle:cycle,durationDays:Number(days),amount:Number(amount)}});toast.success("Essai activé.");onOpenChange(false);await router.invalidate();}catch(e){toast.error(e instanceof Error?e.message:"Activation impossible.")}finally{setBusy(false)}};
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Configurer et activer {tenant?.name}</DialogTitle><DialogDescription>Activité : {tenant?.activity??"Non renseignée"}. L’essai commence à la validation.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Pack suggéré</Label><Select value={packId} onValueChange={choosePack}><SelectTrigger><SelectValue placeholder="Choisir un pack"/></SelectTrigger><SelectContent>{packs.filter(p=>p.is_active).map(p=><SelectItem key={p.id} value={p.id}>{p.name}{p.code===tenant?.suggestedPackCode?" — suggéré":""}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Modules</Label>{tenant?.modules.map(m=><label key={m.id} className="flex items-center gap-2 text-sm"><Checkbox checked={moduleIds.includes(m.id)} onCheckedChange={checked=>setModuleIds(v=>checked?[...v,m.id]:v.filter(id=>id!==m.id))}/>{m.name}</label>)}</div><div className="grid grid-cols-3 gap-3"><div><Label>Offre</Label><Select value={cycle} onValueChange={v=>setCycle(v as SubscriptionBillingCycle)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="monthly">Mensuelle</SelectItem><SelectItem value="quarterly">Trimestrielle</SelectItem><SelectItem value="yearly">Annuelle</SelectItem></SelectContent></Select></div><div><Label>Durée (jours)</Label><Input type="number" min="1" value={days} onChange={e=>setDays(e.target.value)}/></div><div><Label>Montant</Label><Input type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)}/></div></div></div><DialogFooter><Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button><Button disabled={busy||moduleIds.length===0||Number(days)<1} onClick={()=>void submit()}>{busy?"Activation…":"Valider et démarrer"}</Button></DialogFooter></DialogContent></Dialog>;
}

export function SuperAdminDashboardView({
  data,
  onSignOut,
}: {
  data: SuperAdminDashboard;
  onSignOut: () => Promise<void>;
}) {
  const [tenantQuery, setTenantQuery] = useState("");
  const [createTenantOpen, setCreateTenantOpen] = useState(false);
  const dashboard = useMemo(() => normalizeDashboardData(data), [data]);
  const tenantDistribution = [
    { name: "Actifs", value: dashboard.kpis.activeTenants, color: "#2563EB" },
    {
      name: "Autres",
      value: Math.max(0, dashboard.kpis.tenants - dashboard.kpis.activeTenants),
      color: "#CBD5E1",
    },
  ];
  const salesByTenant = [...dashboard.tenants]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map((tenant) => ({ name: tenant.name, value: tenant.revenue }));

  return (
    <div className="min-h-screen bg-muted/30 text-foreground dark:bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] lg:block">
        <SidebarContent onCreateTenant={() => setCreateTenantOpen(true)} />
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
          <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0 rounded-xl lg:hidden">
                    <Menu className="size-5" />
                    <span className="sr-only">Ouvrir le menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] border-0 p-0 [&>button]:text-white">
                  <SheetTitle className="sr-only">Navigation Super Admin</SheetTitle>
                  <SidebarContent mobile onCreateTenant={() => setCreateTenantOpen(true)} />
                </SheetContent>
              </Sheet>
              <BrandLogo context="mobile" className="sm:hidden" />
              <div className="hidden min-w-0 sm:block">
                <h1 className="truncate text-base font-semibold tracking-tight">Vue d’ensemble</h1>
                <p className="truncate text-xs text-muted-foreground">Pilotage de la plateforme</p>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-end gap-2">
              <div className="relative hidden w-full max-w-sm md:block">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={tenantQuery}
                  onChange={(event) => setTenantQuery(event.target.value)}
                  onFocus={() => (window.location.hash = "tenants")}
                  placeholder="Rechercher un tenant..."
                  aria-label="Rechercher dans les tenants"
                  className="h-9 rounded-lg border-border bg-muted/40 pl-9 shadow-none"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-lg text-muted-foreground"
                disabled
                title="Aucune notification configurée"
              >
                <Bell className="size-5" />
                <span className="sr-only">Notifications</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 gap-2 rounded-lg px-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-xs font-semibold text-white">
                      SA
                    </span>
                    <span className="hidden text-left md:block">
                      <span className="block text-xs font-medium">Super Admin</span>
                      <span className="block text-[10px] text-muted-foreground">Plateforme</span>
                    </span>
                    <ChevronDown className="hidden size-3.5 text-muted-foreground md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-lg">
                  <DropdownMenuLabel>Compte plateforme</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void onSignOut()}>
                    <LogOut /> Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main id="dashboard" className="space-y-7 p-4 sm:p-6 xl:p-8">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              title="Total tenants"
              value={numberFormatter.format(dashboard.kpis.tenants)}
              icon={Building2}
              tone="bg-blue-50 text-blue-600"
              note="Comptes enregistrés"
            />
            <KpiCard
              title="Tenants actifs"
              value={numberFormatter.format(dashboard.kpis.activeTenants)}
              icon={Gauge}
              tone="bg-emerald-50 text-emerald-600"
              note="Statut actif"
            />
            <KpiCard
              title="Utilisateurs"
              value={numberFormatter.format(dashboard.kpis.users)}
              icon={Users}
              tone="bg-violet-50 text-violet-600"
              note="Profils rattachés"
            />
            <KpiCard
              title="Ventes totales"
              value={numberFormatter.format(dashboard.kpis.sales)}
              icon={BarChart3}
              tone="bg-amber-50 text-amber-600"
              note="Transactions enregistrées"
            />
            <KpiCard
              title="CA total"
              value={formatCurrency(dashboard.kpis.revenue)}
              icon={CircleDollarSign}
              tone="bg-cyan-50 text-cyan-600"
              note="Toutes ventes confondues"
            />
          </section>

          <section id="rapports" className="grid scroll-mt-24 gap-4 xl:grid-cols-12">
            <ChartCard
              title="Évolution des inscriptions"
              subtitle="Nouveaux tenants sur les 6 derniers mois"
              className="xl:col-span-6"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dashboard.registrations}
                    margin={{ top: 5, right: 4, bottom: 0, left: -24 }}
                  >
                    <defs>
                      <linearGradient id="registrations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94A3B8", fontSize: 11 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94A3B8", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => [numberFormatter.format(Number(value)), "Tenants"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="tenants"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fill="url(#registrations)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Répartition des tenants"
              subtitle="Tenants actifs et autres statuts"
              className="xl:col-span-3"
            >
              <div className="relative h-64">
                {dashboard.kpis.tenants === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Aucun résultat
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tenantDistribution}
                          dataKey="value"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {tenantDistribution.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => numberFormatter.format(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold">{dashboard.kpis.tenants}</span>
                      <span className="text-[11px] text-slate-400">Tenants</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-center gap-5 text-xs text-slate-500">
                {tenantDistribution.map((item) => (
                  <span key={item.name} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                ))}
              </div>
            </ChartCard>

            <ChartCard
              title="Ventes par tenant"
              subtitle="CA cumulé des principaux tenants"
              className="xl:col-span-3"
            >
              <div className="h-64">
                {salesByTenant.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Aucun résultat
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesByTenant}
                      layout="vertical"
                      margin={{ left: -20, right: 8 }}
                    >
                      <CartesianGrid horizontal={false} stroke="#E2E8F0" strokeDasharray="4 4" />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={82}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748B", fontSize: 10 }}
                      />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="value" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </section>

          <ModulePacksSection packs={dashboard.modulePacks} modules={dashboard.modules} />
          <PartnerOffersSection
            commerce={dashboard.partnerCommerce}
            packs={dashboard.modulePacks}
          />
          <TenantTable
            tenants={dashboard.tenants}
            deletionJobs={dashboard.deletionJobs}
            aiPlans={dashboard.aiPlans}
            modulePacks={dashboard.modulePacks}
            query={tenantQuery}
            onQueryChange={setTenantQuery}
          />
          <SubscriptionSummary data={dashboard.subscriptions} />
        </main>
        <CreateTenantDialog open={createTenantOpen} onOpenChange={setCreateTenantOpen} modules={dashboard.modules} />
      </div>
    </div>
  );
}

export function SuperAdminDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30 lg:pl-[248px] dark:bg-background">
      <div className="fixed inset-y-0 left-0 hidden w-[248px] bg-[#0a0a0b] lg:block" />
      <div className="h-[72px] border-b border-border bg-background" />
      <main className="space-y-7 p-4 sm:p-6 xl:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-12">
          <Skeleton className="h-80 rounded-xl xl:col-span-6" />
          <Skeleton className="h-80 rounded-xl xl:col-span-3" />
          <Skeleton className="h-80 rounded-xl xl:col-span-3" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </main>
    </div>
  );
}
