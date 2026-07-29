import type { LucideIcon } from "lucide-react";
import { Moon, ShieldCheck, Sun } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { PLATFORM_BRANDING } from "@/config/branding";
import { useTheme } from "@/components/theme-provider";
import { BrandLogo } from "@/components/branding/BrandLogo";

type AuthLayoutProps = {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  logo?: string;
  logoAlt?: string;
  badge?: string;
  accentClassName?: string;
  backLink?: { href: string; label: string };
  premium?: boolean;
  showSecurityFooter?: boolean;
  compactMobile?: boolean;
};

export function AuthLayout({
  children,
  icon: Icon,
  title,
  subtitle,
  logo = PLATFORM_BRANDING.assets.logo,
  logoAlt = PLATFORM_BRANDING.alt,
  badge,
  accentClassName = "text-blue-300",
  backLink,
  premium = false,
  showSecurityFooter = true,
  compactMobile = false,
}: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const themeToggle = (
    <button
      type="button"
      onClick={toggleTheme}
      className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/20 text-white backdrop-blur transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:right-6 sm:top-6"
      aria-label={theme === "dark" ? "Activer le thème clair" : "Activer le thème sombre"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );

  if (premium) {
    return (
      <main className={`relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#071A52] px-4 sm:px-6 sm:py-12 ${compactMobile ? "py-3" : "py-8"}`}>
        {themeToggle}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(45,119,255,0.42),transparent_28%),radial-gradient(circle_at_84%_23%,rgba(73,105,255,0.28),transparent_27%),radial-gradient(circle_at_54%_92%,rgba(13,83,214,0.28),transparent_35%),linear-gradient(145deg,#071A52_0%,#061441_55%,#030d2c_100%)]" />
        <div className="pointer-events-none absolute left-[-12%] top-[8%] h-[34rem] w-[34rem] rounded-full border border-blue-300/[0.09]" />
        <div className="pointer-events-none absolute left-[-7%] top-[16%] h-[25rem] w-[25rem] rounded-full border border-blue-300/[0.07]" />
        <div className="pointer-events-none absolute right-[-10%] top-[4%] h-[28rem] w-[28rem] rounded-full border border-indigo-200/[0.08]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />

        <svg className="pointer-events-none absolute inset-x-0 top-[5%] h-[55%] w-full opacity-30" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-80 470C210 140 432 590 742 265C988 7 1174 345 1520 70" stroke="url(#curve-a)" strokeWidth="1.2" />
          <path d="M-40 540C267 240 486 650 805 345C1057 105 1249 407 1500 190" stroke="url(#curve-b)" strokeWidth="0.8" />
          <defs>
            <linearGradient id="curve-a" x1="0" y1="0" x2="1440" y2="0"><stop stopColor="#70A4FF" stopOpacity="0" /><stop offset=".48" stopColor="#70A4FF" /><stop offset="1" stopColor="#70A4FF" stopOpacity="0" /></linearGradient>
            <linearGradient id="curve-b" x1="0" y1="0" x2="1440" y2="0"><stop stopColor="#A7C5FF" stopOpacity="0" /><stop offset=".55" stopColor="#A7C5FF" /><stop offset="1" stopColor="#A7C5FF" stopOpacity="0" /></linearGradient>
          </defs>
        </svg>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 opacity-[0.16]" aria-hidden="true">
          <div className="absolute bottom-0 left-0 h-36 w-[28%] bg-blue-200 [clip-path:polygon(0_100%,0_52%,8%_52%,8%_30%,20%_30%,20%_64%,29%_64%,29%_10%,43%_10%,43%_48%,53%_48%,53%_0,66%_0,66%_70%,78%_70%,78%_38%,91%_38%,91%_60%,100%_60%,100%_100%)]" />
          <div className="absolute bottom-0 right-0 h-44 w-[30%] bg-blue-200 [clip-path:polygon(0_100%,0_62%,10%_62%,10%_28%,25%_28%,25%_52%,35%_52%,35%_5%,51%_5%,51%_66%,61%_66%,61%_34%,74%_34%,74%_0,89%_0,89%_44%,100%_44%,100%_100%)]" />
        </div>

        <div className="relative z-10 flex w-full max-w-[520px] flex-col items-center">
          {backLink && (
            <a href={backLink.href} className="mb-4 self-start text-sm text-blue-100/70 transition-colors hover:text-white">
              {backLink.label}
            </a>
          )}
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {children}
          </motion.div>
          {showSecurityFooter && <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mt-6 flex max-w-md items-center justify-center gap-2.5 text-center text-xs leading-5 text-blue-100/65 sm:text-sm"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
            <span>{PLATFORM_BRANDING.productName} protège vos données selon les meilleures normes de sécurité.</span>
          </motion.div>}
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-950 px-5 py-10">
      {themeToggle}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(15,91,255,0.28),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(37,99,235,0.16),transparent_34%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between bg-[#07113D] p-12 text-white lg:flex">
          <BrandLogo context="login" src={logo} alt={logoAlt} className="self-start" />
          <div className="my-20">
            {badge && (
              <p className={`mb-5 text-xs font-semibold uppercase tracking-[0.24em] ${accentClassName}`}>
                {badge}
              </p>
            )}
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/10">
              <Icon className={`h-7 w-7 ${accentClassName}`} aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-4 max-w-md leading-7 text-blue-100/70">{subtitle}</p>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs text-blue-100/50">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Accès protégé par Supabase Auth
            </span>
            {backLink && <a href={backLink.href} className="hover:text-blue-100">{backLink.label}</a>}
          </div>
        </section>
        <section className="flex items-center bg-slate-50 p-6 sm:p-10 lg:p-12">{children}</section>
      </div>
    </main>
  );
}
