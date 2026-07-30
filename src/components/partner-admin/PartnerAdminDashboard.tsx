import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Command,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
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
  createPartnerTenant,
  createPartnerTrial,
  type PartnerDashboard,
  type PartnerTenant,
} from "@/lib/partner-admin.server";
import { PLATFORM_BRANDING } from "@/config/branding";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { formatCurrency } from "@/lib/mms/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const BLUE = "#1546a0";
const GOLD = "#c99b3b";
const SKY = "#5b8def";
const PALE = "#dce8ff";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null, withTime = false) {
  if (!value) return "Non définie";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non définie";
  return (withTime ? dateTimeFormatter : dateFormatter).format(date);
}

function statusLabel(status?: string) {
  if (status === "active") return "Active";
  if (status === "trial") return "Essai";
  if (status === "pending") return "En attente";
  if (status === "converted") return "Actif";
  if (status === "expired") return "Expirée";
  if (status === "suspended") return "Suspendue";
  return status || "Sans licence";
}

function statusClasses(status?: string) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "trial") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "expired") return "border-red-200 bg-red-50 text-red-700";
  if (status === "suspended") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

function expiryFor(tenant: PartnerTenant) {
  return tenant.subscription?.status === "trial"
    ? tenant.subscription.trialEndsAt
    : (tenant.subscription?.endsAt ?? null);
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "clients", label: "Clients", icon: Building2 },
  { id: "essais", label: "Essais", icon: Clock3 },
  { id: "licences", label: "Licences", icon: KeyRound },
  { id: "modules", label: "Modules", icon: Boxes },
  { id: "activites", label: "Activités", icon: Activity },
  { id: "profil", label: "Profil", icon: CircleUserRound },
] as const;

export function PartnerAdminDashboardView({
  data,
  onSignOut,
}: {
  data: PartnerDashboard;
  onSignOut: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [tenantMode, setTenantMode] = useState<"paid" | "trial">("paid");
  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [trialActivityProfile, setTrialActivityProfile] = useState("");
  const [trialManager, setTrialManager] = useState("");
  const [trialPhone, setTrialPhone] = useState("");
  const [trialCity, setTrialCity] = useState("");
  const [trialQuery, setTrialQuery] = useState("");
  const [trialStatus, setTrialStatus] = useState("all");
  const [submittingTenant, setSubmittingTenant] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
    } catch {
      setSigningOut(false);
    }
  };

  const submitTenant = async () => {
    if (!tenantDialogOpen) return;
    setSubmittingTenant(true);
    try {
      const payload = {
        companyName: tenantName,
        activityProfileCode: trialActivityProfile,
        managerName: trialManager,
        phone: trialPhone,
        email: tenantEmail,
        city: trialCity,
      };
      const result = tenantMode === "paid"
        ? await createPartnerTenant({ data: payload })
        : await createPartnerTrial({ data: payload });
      if (result.emailSent) {
        toast.success(`${tenantMode === "paid" ? "Tenant" : "Essai"} créé. L’invitation a été envoyée par email.`);
      } else {
        toast.success(`${tenantMode === "paid" ? "Tenant" : "Essai"} créé. Mot de passe temporaire : ${result.temporaryPassword}`, {
          duration: 20000,
        });
      }
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Création impossible.");
    } finally {
      setSubmittingTenant(false);
    }
  };

  const metrics = useMemo(() => {
    const activeLicenses = data.tenants.filter((tenant) =>
      ["active", "trial"].includes(tenant.subscription?.status ?? ""),
    ).length;
    const enabledModules = data.tenants.reduce(
      (sum, tenant) => sum + tenant.modules.filter((module) => module.enabled).length,
      0,
    );
    const inThirtyDays = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const expiringSoon = data.tenants.filter((tenant) => {
      const value = expiryFor(tenant);
      if (!value) return false;
      const time = new Date(value).getTime();
      return time >= Date.now() && time <= inThirtyDays;
    }).length;
    return { activeLicenses, enabledModules, expiringSoon };
  }, [data.tenants]);

  const statusData = useMemo(() => {
    const counts = new Map<string, number>();
    data.tenants.forEach((tenant) => {
      const label = statusLabel(tenant.subscription?.status);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return [...counts].map(([name, value]) => ({ name, value }));
  }, [data.tenants]);

  const moduleData = useMemo(() => {
    const counts = new Map<string, number>();
    data.tenants.forEach((tenant) =>
      tenant.modules.forEach((module) => {
        if (module.enabled) counts.set(module.name, (counts.get(module.name) ?? 0) + 1);
      }),
    );
    return [...counts]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [data.tenants]);

  const filteredTenants = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return data.tenants.filter((tenant) => {
      const matchesQuery =
        !normalized ||
        tenant.name.toLocaleLowerCase("fr").includes(normalized) ||
        tenant.slug.toLocaleLowerCase("fr").includes(normalized);
      const matchesStatus =
        statusFilter === "all" || (tenant.subscription?.status ?? "none") === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [data.tenants, query, statusFilter]);

  const filteredTrials = useMemo(() => {
    const normalized = trialQuery.trim().toLocaleLowerCase("fr");
    return data.trials.filter((trial) => {
      const matchesQuery =
        !normalized ||
        trial.tenantName.toLocaleLowerCase("fr").includes(normalized) ||
        trial.email.toLocaleLowerCase("fr").includes(normalized) ||
        (trial.managerName ?? "").toLocaleLowerCase("fr").includes(normalized);
      return matchesQuery && (trialStatus === "all" || trial.status === trialStatus);
    });
  }, [data.trials, trialQuery, trialStatus]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-[#14213d]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col overflow-hidden bg-[#08285f] text-white shadow-2xl lg:flex">
        <SidebarContent
          data={data}
          onNavigate={scrollTo}
          onSignOut={handleSignOut}
          signingOut={signingOut}
        />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            aria-label="Fermer le menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            className="relative flex h-full w-72 flex-col overflow-hidden bg-[#08285f] text-white shadow-2xl"
          >
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-4 top-5 z-10 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              data={data}
              onNavigate={scrollTo}
              onSignOut={handleSignOut}
              signingOut={signingOut}
            />
          </motion.aside>
        </div>
      )}

      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-[76px] items-center gap-3 px-4 sm:px-6 xl:px-8">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une entreprise…"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
            <BrandLogo context="mobile" className="lg:hidden" />
            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => scrollTo("activites")}
                className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-blue-200 hover:text-blue-700"
                aria-label="Voir les notifications"
              >
                <Bell className="h-5 w-5" />
                {data.history.length > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#c99b3b] ring-2 ring-white" />
                )}
              </button>
              <div className="h-8 w-px bg-slate-200" />
              <button
                onClick={() => scrollTo("profil")}
                className="flex items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-slate-50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#1546a0] to-[#08285f] text-sm font-bold text-white shadow-lg shadow-blue-900/15">
                  {initials(data.partner.name)}
                </span>
                <span className="hidden sm:block">
                  <span className="block text-sm font-semibold">{data.partner.name}</span>
                  <span className="block text-xs text-slate-500">Partenaire {PLATFORM_BRANDING.shortName}</span>
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                aria-busy={signingOut}
                className="h-10 shrink-0 gap-2 rounded-xl px-2.5 text-[#1546a0] hover:bg-blue-50 hover:text-[#08285f] sm:px-3"
              >
                <LogOut className={`h-4 w-4 ${signingOut ? "animate-pulse" : ""}`} />
                <span className="text-xs font-semibold sm:text-sm">
                  {signingOut ? "Déconnexion…" : "Déconnexion"}
                </span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-8 px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
          <section id="dashboard" className="scroll-mt-24">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#08285f] via-[#0d3b83] to-[#1546a0] p-6 text-white shadow-xl shadow-blue-950/10 sm:p-8"
            >
              <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[50px] border-white/5" />
              <div className="absolute bottom-0 right-1/4 h-24 w-24 rounded-full bg-[#d4af61]/10 blur-xl" />
              <div className="relative max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-50">
                  <Sparkles className="h-3.5 w-3.5 text-[#e5c476]" />
                  ESPACE PARTENAIRE
                </span>
                <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                  Bonjour, {data.partner.name}
                </h1>
                <p className="mt-2 text-sm leading-6 text-blue-100 sm:text-base">
                  Pilotez votre portefeuille clients et suivez les licences {PLATFORM_BRANDING.shortName} depuis un espace
                  unifié.
                </p>
              </div>
            </motion.div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Kpi icon={Clock3} label="Essais créés" value={data.totals.trialsCreated} tone="gold" />
              <Kpi icon={CheckCircle2} label="Essais actifs" value={data.totals.activeTrials} tone="blue" />
              <Kpi icon={Building2} label="Essais convertis" value={data.totals.convertedTrials} tone="gold" />
              <Kpi icon={Activity} label="Taux de conversion" value={`${data.totals.conversionRate.toFixed(1)} %`} tone="blue" />
              <Kpi icon={WalletCards} label="Commissions générées" value={formatCurrency(data.totals.commissionsGenerated)} tone="gold" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi icon={WalletCards} label="Solde de crédits" value={data.partner.creditBalance} tone="blue" />
              <Kpi icon={Building2} label="Tenants encore créables" value={data.partner.creditBalance} tone="gold" />
              <Kpi icon={Activity} label="Crédits consommés" value={data.totals.consumed} tone="blue" />
              <Kpi icon={CheckCircle2} label="Total crédits achetés" value={data.totals.credited} tone="gold" />
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <Panel title="Offre actuelle" subtitle="Abonnement partenaire réel">
              <div className="mt-5 space-y-3 text-sm">
                <p className="text-xl font-bold">{data.subscription?.offer.name ?? "Aucune offre active"}</p>
                <p className="text-slate-500">Pack : {data.subscription?.offer.packName ?? "—"}</p>
                <p className="text-slate-500">Expiration : {formatDate(data.subscription?.expiresAt ?? null)}</p>
              </div>
            </Panel>
            <Panel className="xl:col-span-2" title="Créer une entreprise" subtitle="Démarrez un essai selon la configuration de la plateforme">
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => { setTenantMode("paid"); setTenantDialogOpen(true); }} disabled={!data.subscription || data.partner.creditBalance === 0}>
                  <Building2 /> Créer un tenant
                </Button>
                <Button onClick={() => { setTenantMode("trial"); setTenantDialogOpen(true); }} disabled={!data.subscription}>
                  <Clock3 /> Créer un essai gratuit
                </Button>
              </div>
              {data.partner.creditBalance === 0 && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Votre solde est épuisé. Achetez un nouveau pack de crédits pour créer un tenant.
                </p>
              )}
            </Panel>
          </section>

          <section id="licences" className="grid scroll-mt-24 gap-5 xl:grid-cols-5">
            <Panel className="xl:col-span-2" title="Répartition des licences" subtitle="État actuel du portefeuille">
              {statusData.length ? (
                <div className="flex h-64 items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={86}
                        paddingAngle={4}
                        stroke="none"
                      >
                        {statusData.map((item, index) => (
                          <Cell key={item.name} fill={[BLUE, GOLD, SKY, PALE, "#94a3b8"][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-32 space-y-2.5">
                    {statusData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex items-center gap-2 text-slate-500">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: [BLUE, GOLD, SKY, PALE, "#94a3b8"][index % 5] }}
                          />
                          {item.name}
                        </span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Empty label="Aucune licence disponible" />
              )}
            </Panel>

            <Panel
              id="modules"
              className="scroll-mt-24 xl:col-span-3"
              title="Adoption des modules"
              subtitle="Nombre d’entreprises par module activé"
            >
              {moduleData.length ? (
                <div className="h-64 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moduleData} margin={{ left: -22, right: 4 }}>
                      <CartesianGrid vertical={false} stroke="#e8edf5" strokeDasharray="4 4" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Tooltip cursor={{ fill: "#f4f7fb" }} contentStyle={tooltipStyle} />
                      <Bar dataKey="value" name="Entreprises" fill={BLUE} radius={[8, 8, 2, 2]} maxBarSize={42} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty label="Aucun module activé" />
              )}
            </Panel>
          </section>

          <section id="essais" className="scroll-mt-24 space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow="ACQUISITION"
                title="Essais ERP"
                description="Suivez uniquement les essais créés par votre espace partenaire."
                count={data.trials.length}
              />
              <Button onClick={() => { setTenantMode("trial"); setTenantDialogOpen(true); }}>
                <Clock3 /> Créer un essai
              </Button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={trialQuery}
                onChange={(event) => setTrialQuery(event.target.value)}
                placeholder="Entreprise, responsable ou email…"
                className="sm:max-w-sm"
              />
              <select
                value={trialStatus}
                onChange={(event) => setTrialStatus(event.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Essai</option>
                <option value="converted">Actif</option>
                <option value="expired">Expiré</option>
                <option value="pending">En attente</option>
              </select>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Entreprise</th>
                      <th className="px-5 py-4">Responsable</th>
                      <th className="px-5 py-4">Statut</th>
                      <th className="px-5 py-4">Création</th>
                      <th className="px-5 py-4">Expiration</th>
                      <th className="px-5 py-4">Accès</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTrials.map((trial) => (
                      <tr key={trial.id} className="hover:bg-blue-50/30">
                        <td className="px-5 py-4">
                          <strong className="block">{trial.tenantName}</strong>
                          <span className="text-xs text-slate-500">{trial.sector ?? "Secteur non renseigné"} · {trial.city ?? "—"}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="block">{trial.managerName ?? "—"}</span>
                          <span className="text-xs text-slate-500">{trial.email}</span>
                        </td>
                        <td className="px-5 py-4"><StatusBadge status={trial.status === "converted" ? "active" : trial.status === "active" ? "trial" : trial.status} /></td>
                        <td className="px-5 py-4 text-slate-500">{formatDate(trial.createdAt)}</td>
                        <td className="px-5 py-4 text-slate-500">{formatDate(trial.expiresAt)}</td>
                        <td className="px-5 py-4">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!trial.loginUrl}
                            onClick={() => trial.loginUrl && window.open(trial.loginUrl, "_blank", "noopener,noreferrer")}
                          >
                            Ouvrir le tenant
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!filteredTrials.length && <Empty label="Aucun essai pour ces critères." />}
            </div>
          </section>

          <section id="clients" className="scroll-mt-24 space-y-5">
            <SectionHeading
              eyebrow="PORTEFEUILLE"
              title="Entreprises clientes"
              description="Vue synthétique des entreprises qui vous sont attribuées."
              count={data.tenants.length}
            />
            {data.tenants.length ? (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {data.tenants.map((tenant, index) => (
                  <CompanyCard key={tenant.id} tenant={tenant} index={index} />
                ))}
              </div>
            ) : (
              <Empty label="Aucune entreprise ne vous est actuellement attribuée." bordered />
            )}
          </section>

          <section className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow="GESTION"
                title="Vue détaillée"
                description="Recherchez et filtrez les entreprises du portefeuille."
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative min-w-64">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Rechercher…"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  />
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Active</option>
                  <option value="trial">Essai</option>
                  <option value="expired">Expirée</option>
                  <option value="suspended">Suspendue</option>
                  <option value="none">Sans licence</option>
                </select>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Entreprise</th>
                      <th className="px-5 py-4">Statut</th>
                      <th className="px-5 py-4">Licence</th>
                      <th className="px-5 py-4">Pack</th>
                      <th className="px-5 py-4">Modules</th>
                      <th className="px-5 py-4">Attribuée le</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="transition hover:bg-blue-50/30">
                        <td className="px-5 py-4 font-medium text-slate-700">
                          {tenant.pack?.name ?? "Aucun"}
                        </td>
                        <td className="px-5 py-4">
                          <CompanyIdentity tenant={tenant} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={tenant.subscription?.status} />
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          <span className="font-medium text-slate-800">
                            {tenant.subscription?.billingCycle ?? "Non définie"}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-400">
                            {formatDate(expiryFor(tenant))}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <strong className="text-slate-800">
                            {tenant.modules.filter((module) => module.enabled).length}
                          </strong>
                          <span className="text-slate-400"> / {tenant.modules.length}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">{formatDate(tenant.assignedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredTenants.length === 0 && (
                <div className="border-t border-slate-100 py-12 text-center text-sm text-slate-500">
                  Aucun résultat pour ces critères.
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <Panel title="Historique des paiements" subtitle="Paiements validés côté serveur">
              <div className="mt-5 space-y-3">
                {data.payments.slice(0, 10).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-4 rounded-xl border p-3 text-sm">
                    <div className="min-w-0"><p className="truncate font-semibold">{payment.reference}</p><p className="text-xs text-slate-500">{formatDate(payment.createdAt, true)}</p></div>
                    <strong>{formatCurrency(payment.amount, payment.currency)}</strong>
                  </div>
                ))}
                {!data.payments.length && <p className="text-sm text-slate-500">Aucun paiement validé.</p>}
              </div>
            </Panel>
            <Panel title="Historique des crédits" subtitle="Crédits et débits du portefeuille">
              <div className="mt-5 space-y-3">
                {data.creditTransactions.slice(0, 10).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-4 rounded-xl border p-3 text-sm">
                    <div className="min-w-0"><p className="truncate font-semibold">{transaction.reason}</p><p className="text-xs text-slate-500">{formatDate(transaction.createdAt, true)} · Solde {transaction.balanceAfter}</p></div>
                    <strong className={transaction.credits > 0 ? "text-emerald-600" : "text-red-600"}>{transaction.credits > 0 ? "+" : ""}{transaction.credits}</strong>
                  </div>
                ))}
                {!data.creditTransactions.length && <p className="text-sm text-slate-500">Aucune transaction de crédit.</p>}
              </div>
            </Panel>
          </section>

          <section id="activites" className="grid scroll-mt-24 gap-5 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              title="Activités récentes"
              subtitle="Derniers événements enregistrés dans votre espace"
            >
              {data.history.length ? (
                <div className="mt-5">
                  {data.history.slice(0, 8).map((event, index) => (
                    <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {index < Math.min(data.history.length, 8) - 1 && (
                        <span className="absolute left-[17px] top-9 h-[calc(100%-22px)] w-px bg-slate-200" />
                      )}
                      <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-4 border-white bg-blue-50 text-[#1546a0] ring-1 ring-blue-100">
                        <CalendarClock className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                          <p className="text-sm font-semibold text-slate-800">
                            {event.action === "portal.view"
                              ? "Consultation du portail partenaire"
                              : event.action}
                          </p>
                          <time className="shrink-0 text-xs text-slate-400">
                            {formatDate(event.createdAt, true)}
                          </time>
                        </div>
                        {event.tenantId && (
                          <p className="mt-1 truncate text-xs text-slate-500">
                            Tenant · {event.tenantId}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty label="Aucune activité enregistrée" />
              )}
            </Panel>

            <Panel id="profil" className="scroll-mt-24" title="Profil partenaire" subtitle="Informations de votre espace">
              <div className="mt-6 flex flex-col items-center text-center">
                <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-[#1546a0] to-[#08285f] text-2xl font-bold text-white shadow-xl shadow-blue-900/20">
                  {initials(data.partner.name)}
                </div>
                <h3 className="mt-4 text-lg font-bold">{data.partner.name}</h3>
                <p className="mt-1 text-sm text-slate-500">Code · {data.partner.code}</p>
                <div className="mt-6 w-full rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-left">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-[#1546a0]" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Accès sécurisé</p>
                      <p className="text-xs text-slate-500">Portefeuille en lecture seule</p>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </section>
        </main>
      </div>
      <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tenantMode === "paid" ? "Créer un tenant" : "Créer un essai gratuit"}</DialogTitle>
            <DialogDescription>{tenantMode === "paid" ? "Un crédit sera débité uniquement après une création réussie." : "Aucun crédit ne sera débité au démarrage."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Entreprise</Label>
              <Input id="tenant-name" value={tenantName} onChange={(event) => setTenantName(event.target.value)} />
            </div>
            <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="trial-activity-profile">Profil d’activité</Label>
                    <select
                      id="trial-activity-profile"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={trialActivityProfile}
                      onChange={(event) => setTrialActivityProfile(event.target.value)}
                    >
                      <option value="">Sélectionner un profil</option>
                      {data.activityProfiles.map((profile) => (
                        <option key={profile.code} value={profile.code}>{profile.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trial-manager">Nom du responsable</Label>
                    <Input id="trial-manager" value={trialManager} onChange={(event) => setTrialManager(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trial-phone">Téléphone</Label>
                    <Input id="trial-phone" type="tel" value={trialPhone} onChange={(event) => setTrialPhone(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trial-city">Ville</Label>
                    <Input id="trial-city" value={trialCity} onChange={(event) => setTrialCity(event.target.value)} />
                  </div>
                </div>
                <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
                  Les modules seront activés automatiquement selon le profil d’activité et l’offre partenaire.
                </p>
            </>
            <div className="space-y-2">
              <Label htmlFor="tenant-email">Email client</Label>
              <Input id="tenant-email" type="email" value={tenantEmail} onChange={(event) => setTenantEmail(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTenantDialogOpen(false)}>Annuler</Button>
            <Button
              disabled={
                submittingTenant ||
                !tenantName.trim() ||
                !tenantEmail.trim() ||
                !trialActivityProfile || !trialManager.trim() || !trialPhone.trim() || !trialCity.trim()
              }
              onClick={() => void submitTenant()}
            >
              {submittingTenant ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidebarContent({
  data,
  onNavigate,
  onSignOut,
  signingOut,
}: {
  data: PartnerDashboard;
  onNavigate: (id: string) => void;
  onSignOut: () => Promise<void>;
  signingOut: boolean;
}) {
  return (
    <>
      <div className="relative flex h-[110px] shrink-0 flex-col items-center justify-center overflow-hidden border-b border-[rgba(212,175,55,0.25)] px-5">
        <div className="absolute left-1/2 top-0 h-28 w-40 -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="relative flex w-full min-w-0 flex-col items-center">
          <BrandLogo context="partner" />
          <p className="mt-1 text-center text-[10px] font-semibold uppercase leading-none tracking-[0.28em] text-[#e3c26f]">
            Partner Portal
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-1.5 px-3 pb-6 pt-5">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-200/50">
          Navigation
        </p>
        {navItems.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
              index === 0
                ? "bg-white text-[#0c3475] shadow-lg shadow-blue-950/20"
                : "text-blue-100/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon className={`h-[18px] w-[18px] ${index === 0 ? "text-[#c99b3b]" : ""}`} />
            {label}
            <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 transition group-hover:opacity-60" />
          </button>
        ))}
      </nav>
      <div className="p-4">
        <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#c99b3b] text-xs font-bold text-white">
              {initials(data.partner.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{data.partner.name}</p>
              <p className="truncate text-[10px] text-blue-200/60">{data.partner.code}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onSignOut()}
          disabled={signingOut}
          aria-busy={signingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-blue-100/65 transition hover:bg-red-400/10 hover:text-red-100 disabled:cursor-wait disabled:opacity-60"
        >
          <LogOut className={`h-4 w-4 ${signingOut ? "animate-pulse" : ""}`} />
          {signingOut ? "Déconnexion…" : "Déconnexion"}
        </button>
      </div>
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Building2;
  label: string;
  value: number | string;
  hint?: string;
  tone: "blue" | "gold";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg hover:shadow-blue-950/5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
        </div>
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${
            tone === "blue" ? "bg-blue-50 text-[#1546a0]" : "bg-amber-50 text-[#b4872d]"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </motion.div>
  );
}

function Panel({
  id,
  title,
  subtitle,
  className = "",
  children,
}: {
  id?: string;
  title: string;
  subtitle: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <div>
        <h2 className="font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow: string;
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#b4872d]">{eyebrow}</p>
      <div className="mt-1 flex items-center gap-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#1546a0]">{count}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function CompanyCard({
  tenant,
  index,
}: {
  tenant: PartnerTenant;
  index: number;
}) {
  const enabled = tenant.modules.filter((module) => module.enabled);
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      whileHover={{ y: -4 }}
      className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-xl hover:shadow-blue-950/7"
    >
      <div className="h-1 bg-gradient-to-r from-[#1546a0] via-[#5b8def] to-[#c99b3b]" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <CompanyIdentity tenant={tenant} large />
          <StatusBadge status={tenant.subscription?.status} />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3">
          <CardStat label="Licence" value={tenant.subscription?.billingCycle ?? "—"} />
          <CardStat label="Pack" value={tenant.pack?.name ?? "Aucun"} />
          <CardStat label="Modules" value={`${enabled.length}/${tenant.modules.length}`} />
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Modules actifs</span>
            <span className="text-[10px] text-slate-400">{enabled.length} activé(s)</span>
          </div>
          <div className="flex min-h-7 flex-wrap gap-1.5">
            {enabled.slice(0, 4).map((module) => (
              <span key={module.id} className="rounded-lg border border-blue-100 bg-blue-50/70 px-2 py-1 text-[10px] font-medium text-[#1546a0]">
                {module.name}
              </span>
            ))}
            {enabled.length > 4 && (
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
                +{enabled.length - 4}
              </span>
            )}
            {!enabled.length && <span className="text-xs text-slate-400">Aucun module activé</span>}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
          <span className="text-slate-400">Échéance</span>
          <span className="font-semibold text-slate-700">{formatDate(expiryFor(tenant))}</span>
        </div>
        {!["active", "trial"].includes(tenant.subscription?.status ?? "") && (
          <p className="mt-4 text-center text-xs text-slate-500">
            Activation payante réservée à l’administration de la plateforme.
          </p>
        )}
      </div>
    </motion.article>
  );
}

function CompanyIdentity({ tenant, large = false }: { tenant: PartnerTenant; large?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={`${large ? "h-12 w-12 rounded-2xl" : "h-10 w-10 rounded-xl"} grid shrink-0 place-items-center overflow-hidden border border-slate-200 bg-white shadow-sm`}>
        {tenant.logoUrl ? (
          <img src={tenant.logoUrl} alt="" className="h-full w-full object-contain p-1.5" />
        ) : (
          <span className="text-xs font-bold text-[#1546a0]">{initials(tenant.name)}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{tenant.name}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">/{tenant.slug}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClasses(status)}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-center">
      <p className="truncate text-xs font-bold text-slate-800">{value}</p>
      <p className="mt-0.5 truncate text-[9px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function Empty({ label, bordered = false }: { label: string; bordered?: boolean }) {
  return (
    <div className={`grid min-h-48 place-items-center rounded-2xl text-center text-sm text-slate-400 ${bordered ? "border border-dashed border-slate-300 bg-white" : ""}`}>
      <div>
        <Command className="mx-auto mb-3 h-7 w-7 text-slate-300" />
        {label}
      </div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  fontSize: 12,
};
