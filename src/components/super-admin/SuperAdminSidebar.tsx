import { useLocation } from "@tanstack/react-router";
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
  Plus,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PLATFORM_BRANDING } from "@/config/branding";
import { BrandLogo } from "@/components/branding/BrandLogo";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/super-admin#dashboard" },
  { label: "Tenants", icon: Building2, href: "/super-admin#tenants" },
  { label: "Packs de modules", icon: Layers3, href: "/super-admin#packs-modules" },
  { label: "Modules", icon: LayoutGrid, href: "/super-admin#modules" },
  { label: "Offres partenaires", icon: CreditCard, href: "/super-admin#offres-partenaires" },
  { label: "Partenaires", icon: Handshake, href: "/super-admin/partners" },
  { label: "Utilisateurs", icon: Users, href: "/super-admin/users" },
  { label: PLATFORM_BRANDING.products.ai, icon: Bot, href: "/super-admin/ia-platform" },
  { label: "Licences", icon: KeyRound, href: "/super-admin#licences" },
  { label: "Activité", icon: Activity, href: "/super-admin#activite" },
  { label: "Paramètres", icon: Settings, href: "/super-admin#parametres" },
] as const;

export function SuperAdminSidebar({ mobile = false }: { mobile?: boolean }) {
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

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Navigation">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200/50">
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
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                active
                  ? "bg-blue-600 text-white shadow-[0_4px_16px_rgba(37,99,235,.35)]"
                  : "text-blue-100/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-[18px]" />
              <span>{label}</span>
              {active && <ChevronRight className="ml-auto size-4" />}
            </a>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-3">
        <Button
          className="h-10 w-full justify-start rounded-lg bg-white text-black shadow-[0_8px_30px_rgba(255,255,255,.08)] hover:bg-zinc-200"
          disabled
          title="Aucune action de création n'est configurée"
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
            <p className="truncate text-xs text-blue-200/60">Compte plateforme</p>
          </div>
          {!mobile && <span className="ml-auto size-2 rounded-full bg-emerald-400" />}
        </div>
      </div>
    </div>
  );
}
