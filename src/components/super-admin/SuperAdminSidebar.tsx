import { useState } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import {
  Activity,
  Bot,
  Building2,
  ChevronRight,
  CreditCard,
  Handshake,
  KeyRound,
  Layers3,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  LineChart,
  Plus,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORM_BRANDING } from "@/config/branding";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { createTenantBySuperAdmin, type SuperAdminModulePack } from "@/lib/super-admin.server";
import { cycleLabels } from "@/components/super-admin/shared";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/super-admin#dashboard" },
  { label: "Tenants", icon: Building2, href: "/super-admin#tenants" },
  { label: "Packs de modules", icon: Layers3, href: "/super-admin#packs-modules" },
  { label: "Modules", icon: LayoutGrid, href: "/super-admin#modules" },
  { label: "Offres partenaires", icon: CreditCard, href: "/super-admin#offres-partenaires" },
  { label: "Partenaires", icon: Handshake, href: "/super-admin/partners" },
  { label: "Utilisateurs", icon: Users, href: "/super-admin/users" },
  { label: "Support", icon: LifeBuoy, href: "/super-admin/support" },
  { label: PLATFORM_BRANDING.products.ai, icon: Bot, href: "/super-admin/ia-platform" },
  { label: "Analytics", icon: LineChart, href: "/super-admin/analytics" },
  { label: "Licences", icon: KeyRound, href: "/super-admin#licences" },
  { label: "Activité", icon: Activity, href: "/super-admin#activite" },
  { label: "Paramètres", icon: Settings, href: "/super-admin#parametres" },
] as const;

type PlatformType = "ERP" | "HOTEL";
type BillingCycle = "monthly" | "quarterly" | "yearly";

const cycleDays: Record<BillingCycle, number> = { monthly: 30, quarterly: 90, yearly: 365 };

function CreateTenantDialog({ modulePacks }: { modulePacks: SuperAdminModulePack[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [platformType, setPlatformType] = useState<PlatformType>("ERP");
  const [modulePackId, setModulePackId] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [days, setDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);

  const erpPacks = modulePacks.filter((pack) => pack.code !== "hotel" && pack.is_active);

  const reset = () => {
    setCompanyName("");
    setAdminName("");
    setAdminEmail("");
    setPhone("");
    setPlatformType("ERP");
    setModulePackId("");
    setBillingCycle("monthly");
    setDays("30");
  };

  const submit = async () => {
    if (!companyName.trim() || !adminName.trim() || !adminEmail.trim() || !phone.trim()) {
      toast.error("Tous les champs sont requis.");
      return;
    }
    if (platformType === "ERP" && !modulePackId) {
      toast.error("Sélectionnez une offre (pack de modules) pour ce tenant.");
      return;
    }
    const parsedDays = Number(days);
    if (!Number.isInteger(parsedDays) || parsedDays < 1) {
      toast.error("La durée doit être un nombre entier positif.");
      return;
    }
    setSubmitting(true);
    try {
      const selectedPack = erpPacks.find((pack) => pack.id === modulePackId);
      const result = await createTenantBySuperAdmin({
        data: {
          companyName,
          adminName,
          adminEmail,
          phone,
          platformType,
          billingCycle,
          days: parsedDays,
          moduleIds: platformType === "ERP" ? (selectedPack?.moduleIds ?? []) : [],
        },
      });
      toast.success(`Tenant créé avec succès. Accès : ${result.loginUrl}`);
      setOpen(false);
      reset();
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Création du tenant impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
          setOpen(next);
          if (!next) reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="h-10 w-full justify-start rounded-lg bg-white text-black shadow-[0_8px_30px_rgba(255,255,255,.08)] hover:bg-zinc-200">
          <Plus className="size-4" />
          Créer un tenant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un tenant</DialogTitle>
          <DialogDescription>
            Un compte administrateur sera invité par e-mail pour accéder à ce tenant.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="tenant-company">Entreprise</Label>
            <Input
              id="tenant-company"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenant-admin-name">Nom de l’administrateur</Label>
              <Input
                id="tenant-admin-name"
                value={adminName}
                onChange={(event) => setAdminName(event.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-admin-email">E-mail administrateur</Label>
              <Input
                id="tenant-admin-email"
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenant-phone">Téléphone</Label>
              <Input
                id="tenant-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-platform">Plateforme</Label>
              <Select
                value={platformType}
                onValueChange={(value) => setPlatformType(value as PlatformType)}
                disabled={submitting}
              >
                <SelectTrigger id="tenant-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ERP">ERP</SelectItem>
                  <SelectItem value="HOTEL">Hôtel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {platformType === "ERP" ? (
            <div className="space-y-2">
              <Label htmlFor="tenant-pack">Offre (pack de modules)</Label>
              <Select value={modulePackId} onValueChange={setModulePackId} disabled={submitting}>
                <SelectTrigger id="tenant-pack">
                  <SelectValue placeholder="Sélectionner un pack" />
                </SelectTrigger>
                <SelectContent>
                  {erpPacks.map((pack) => (
                    <SelectItem key={pack.id} value={pack.id}>
                      {pack.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              Le pack de modules Hôtel sera assigné automatiquement.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenant-cycle">Cycle de facturation</Label>
              <Select
                value={billingCycle}
                onValueChange={(value) => {
                  const cycle = value as BillingCycle;
                  setBillingCycle(cycle);
                  setDays(String(cycleDays[cycle]));
                }}
                disabled={submitting}
              >
                <SelectTrigger id="tenant-cycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(cycleLabels) as BillingCycle[]).map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {cycleLabels[cycle]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-days">Durée (jours)</Label>
              <Input
                id="tenant-days"
                type="number"
                min={1}
                max={3650}
                value={days}
                onChange={(event) => setDays(event.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            {submitting ? "Création…" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SuperAdminSidebar({
  mobile = false,
  modulePacks = [],
}: {
  mobile?: boolean;
  modulePacks?: SuperAdminModulePack[];
}) {
  const { pathname, hash } = useLocation();
  const isDashboardRoute = pathname === "/super-admin" || pathname === "/super-admin/";

  return (
    <div className="flex h-full flex-col bg-[#070d1f] text-white">
      <div className="flex h-24 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <BrandLogo context="superAdmin" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-wide">
            {PLATFORM_BRANDING.shortName}
          </p>
          <p className="truncate text-[11px] text-blue-200/70">Console plateforme</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-6" aria-label="Navigation">
        <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200/50">
          Espace plateforme
        </p>
        {navItems.map(({ label, icon: Icon, href }) => {
          const sectionId = href.startsWith("/super-admin#")
            ? href.slice("/super-admin#".length)
            : null;
          const active = sectionId
            ? isDashboardRoute && (hash === sectionId || (!hash && sectionId === "dashboard"))
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <a
              key={label}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "border-blue-400 bg-blue-500/15 text-white"
                  : "text-blue-100/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-[18px]" />
              <span>{label}</span>
              {active && <ChevronRight className="ml-auto size-4 text-blue-300" />}
            </a>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-3 pt-4">
        <CreateTenantDialog modulePacks={modulePacks} />
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[.03] p-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Super Admin</p>
            <p className="truncate text-xs text-blue-200/60">Compte plateforme</p>
          </div>
          {!mobile && <span className="ml-auto size-2 rounded-full bg-emerald-400" />}
        </div>
      </div>
    </div>
  );
}
