import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  Headphones,
  Hotel,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Rocket,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Zap,
} from "lucide-react";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createTrialWorkspace } from "@/lib/trial-signup.server";
import { supabase } from "@/integrations/supabase/client";
import { readEnvVar } from "@/integrations/supabase/env";
import { PLATFORM_BRANDING } from "@/config/branding";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/essai-gratuit")({ component: TrialSignupPage });

const fieldClass =
  "h-11 w-full rounded-[10px] border border-[#DCE4F0] bg-white pl-11 text-base text-slate-900 shadow-none transition-all duration-200 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/10 [@media(max-width:767px)_and_(max-height:760px)]:h-[42px] md:h-[52px] md:text-[15px]";
const iconClass =
  "pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400";

const platformOptions = [
  {
    value: "ERP" as const,
    icon: Briefcase,
    title: "ERP Entreprise",
    description: "Pour tous types d’entreprises",
    details: "Commerce, Services, etc.",
  },
  {
    value: "HOTEL" as const,
    icon: Hotel,
    title: "Hôtel & Résidences",
    description: "Pour hôtels, résidences",
    details: "et maisons d’hôtes",
  },
];

const benefitBadges = [
  { icon: Gift, label: "Essai gratuit 7 jours" },
  { icon: CreditCard, label: "Sans carte bancaire" },
  { icon: Zap, label: "Activation immédiate" },
];

const stats = [
  { icon: Users, value: "+500", label: "entreprises nous font confiance" },
  { icon: ShieldCheck, value: "99,9 %", label: "disponibilité garantie" },
  { icon: Headphones, value: "Support 7j/7", label: "par WhatsApp" },
  { icon: Rocket, value: "Activation", label: "en moins d’une minute" },
];

const footerReassurance = [
  { icon: Lock, label: "Données sécurisées" },
  { icon: Rocket, label: "Activation immédiate" },
  { icon: MessageCircle, label: "Support WhatsApp" },
];

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const strengthLabels = ["Trop court", "Faible", "Moyen", "Bon", "Mot de passe robuste"];

function TrialSignupPage() {
  const navigate = useNavigate();
  const turnstile = useRef<TurnstileHandle>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [turnstileSize, setTurnstileSize] = useState<"normal" | "flexible">("normal");
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setTurnstileSize(mql.matches ? "flexible" : "normal");
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  const [form, setForm] = useState({
    companyName: "",
    adminName: "",
    platformType: "ERP" as "ERP" | "HOTEL",
    email: "",
    phone: "",
    password: "",
    confirmation: "",
    termsAccepted: false,
  });
  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((v) => ({ ...v, [key]: e.target.value }));
  const strength = useMemo(() => passwordStrength(form.password), [form.password]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await createTrialWorkspace({
        data: { ...form, termsAccepted: form.termsAccepted as true, turnstileToken: token },
      });
      await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      await navigate({ to: result.platformType === "HOTEL" ? "/hotel" : "/app", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’envoyer la demande.");
      turnstile.current?.reset();
      setToken("");
    } finally {
      setBusy(false);
    }
  };
  const siteKey = readEnvVar("VITE_TURNSTILE_SITE_KEY") ?? "";

  return (
    <main className="flex h-dvh min-h-dvh w-full items-center justify-center overflow-hidden bg-[#020C24] px-3 pt-3 [padding-bottom:max(12px,env(safe-area-inset-bottom))] md:h-auto md:min-h-screen md:overflow-visible md:px-4 md:py-6 md:[padding-bottom:0] lg:py-8">
      <div className="mx-auto grid h-full w-full max-w-[1200px] gap-6 overflow-hidden md:h-auto md:overflow-visible lg:grid-cols-[2fr_3fr] lg:items-stretch lg:gap-0 lg:overflow-hidden lg:rounded-[28px] lg:shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
        {/* Form column — shown first on mobile */}
        <section className="order-1 flex h-full max-h-[calc(100dvh-24px-env(safe-area-inset-bottom))] flex-col justify-center overflow-hidden rounded-[24px] bg-white p-4 shadow-[0_20px_60px_-15px_rgba(11,31,77,0.15)] [@media(max-width:767px)_and_(max-height:760px)]:p-3 md:h-auto md:max-h-none md:justify-start md:overflow-visible md:rounded-[28px] md:p-8 lg:order-2 lg:rounded-none lg:p-11 lg:[padding:44px_52px]">
          <div className="mx-auto w-full max-w-md">
            <BrandLogo context="header" className="size-8 md:size-14 lg:hidden" />
            <h1 className="mt-1.5 text-xl font-extrabold tracking-tight text-slate-950 [@media(max-width:767px)_and_(max-height:760px)]:text-lg md:mt-2 md:text-[26px]">
              Créer votre espace d’essai
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 [@media(max-width:767px)_and_(max-height:760px)]:hidden md:mt-1 md:text-sm">
              Accédez immédiatement à votre plateforme pendant 7 jours.
            </p>

            <div className="mt-5 hidden grid-cols-3 gap-2 md:grid">
              {benefitBadges.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[#DCE4F0] bg-slate-50/60 px-2 py-2.5 text-center"
                >
                  <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span className="text-[11px] font-semibold leading-tight text-slate-600">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <form
              onSubmit={submit}
              className="mt-3 space-y-2.5 [@media(max-width:767px)_and_(max-height:760px)]:space-y-2 md:mt-5 md:space-y-4"
            >
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Votre entreprise
                </p>
                <div className="grid grid-cols-2 gap-2.5 [@media(max-width:767px)_and_(max-height:760px)]:gap-2 md:gap-3">
                  <div className="relative">
                    <Building2 className={iconClass} aria-hidden="true" />
                    <Input
                      id="companyName"
                      aria-label="Entreprise"
                      placeholder="Nom de l’entreprise"
                      value={form.companyName}
                      onChange={field("companyName")}
                      required
                      className={fieldClass}
                    />
                  </div>
                  <div className="relative">
                    <User className={iconClass} aria-hidden="true" />
                    <Input
                      id="adminName"
                      aria-label="Administrateur"
                      placeholder="Nom de l’administrateur"
                      value={form.adminName}
                      onChange={field("adminName")}
                      required
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Vos accès
                </p>
                <div className="grid grid-cols-2 gap-2.5 [@media(max-width:767px)_and_(max-height:760px)]:gap-2 md:gap-3">
                  <div className="relative">
                    <Mail className={iconClass} aria-hidden="true" />
                    <Input
                      id="email"
                      type="email"
                      aria-label="E-mail"
                      placeholder="E-mail"
                      value={form.email}
                      onChange={field("email")}
                      required
                      className={fieldClass}
                    />
                  </div>
                  <div className="relative">
                    <Phone className={iconClass} aria-hidden="true" />
                    <Input
                      id="phone"
                      aria-label="Téléphone"
                      placeholder="Téléphone"
                      value={form.phone}
                      onChange={field("phone")}
                      required
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Plateforme
                </p>
                <div className="grid grid-cols-2 gap-2.5 [@media(max-width:767px)_and_(max-height:760px)]:gap-2 md:gap-3">
                  {platformOptions.map(({ value, icon: Icon, title, description, details }) => {
                    const selected = form.platformType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((v) => ({ ...v, platformType: value }))}
                        aria-pressed={selected}
                        className={cn(
                          "relative flex flex-col items-start gap-1 rounded-[10px] border px-3 py-2 text-left transition-all duration-150 md:gap-1.5 md:px-4 md:py-3",
                          selected
                            ? "border-2 border-blue-600 bg-[#F8FBFF]"
                            : "border-[#DCE4F0] bg-white hover:border-blue-300",
                        )}
                      >
                        {selected && (
                          <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-white">
                            <Check className="h-3 w-3" aria-hidden="true" />
                          </span>
                        )}
                        <Icon className="h-4 w-4 text-blue-600 md:h-5 md:w-5" aria-hidden="true" />
                        <span className="text-sm font-bold text-slate-900">{title}</span>
                        <span className="hidden text-xs leading-snug text-slate-500 md:block">
                          {description}
                          <br />
                          {details}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Sécurité
                </p>
                <div className="grid grid-cols-2 gap-2.5 [@media(max-width:767px)_and_(max-height:760px)]:gap-2 md:gap-3">
                  <div className="relative">
                    <Lock className={iconClass} aria-hidden="true" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      aria-label="Mot de passe"
                      placeholder="Mot de passe"
                      minLength={8}
                      value={form.password}
                      onChange={field("password")}
                      required
                      className={cn(fieldClass, "pr-11")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={
                        showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className={iconClass} aria-hidden="true" />
                    <Input
                      id="confirmation"
                      type={showConfirmation ? "text" : "password"}
                      aria-label="Confirmation du mot de passe"
                      placeholder="Confirmation"
                      value={form.confirmation}
                      onChange={field("confirmation")}
                      required
                      className={cn(fieldClass, "pr-11")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmation((s) => !s)}
                      aria-label={
                        showConfirmation ? "Masquer le mot de passe" : "Afficher le mot de passe"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmation ? (
                        <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                {form.password && (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors",
                            i < strength ? "bg-[#22C55E]" : "bg-slate-200",
                          )}
                        />
                      ))}
                    </div>
                    <span className="whitespace-nowrap text-xs font-medium text-slate-500">
                      {strengthLabels[strength]}
                    </span>
                  </div>
                )}
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-600 md:gap-2.5 md:text-sm">
                <Checkbox
                  checked={form.termsAccepted}
                  onCheckedChange={(checked) =>
                    setForm((v) => ({ ...v, termsAccepted: checked === true }))
                  }
                  className="mt-0.5"
                />
                <span>
                  J’accepte les conditions d’utilisation et la politique de confidentialité.
                </span>
              </label>

              <div className="rounded-[10px] border border-[#DCE4F0] bg-slate-50/60 p-2 md:p-3">
                <p className="hidden text-xs font-bold text-slate-700 md:block">
                  Protection anti-robot
                </p>
                <p className="hidden text-xs text-slate-500 md:mt-0.5 md:block">
                  Nous vérifions que vous êtes bien humain.
                </p>
                <div className="md:mt-2">
                  {siteKey ? (
                    <Turnstile
                      ref={turnstile}
                      siteKey={siteKey}
                      onTokenChange={setToken}
                      size={turnstileSize}
                    />
                  ) : (
                    <p className="text-sm text-destructive">
                      Le contrôle anti-robot n’est pas configuré.
                    </p>
                  )}
                </div>
              </div>

              <Button
                disabled={busy || !token || !form.termsAccepted}
                className="group h-auto min-h-[52px] w-full rounded-[10px] bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] py-3 text-[15px] font-bold text-white shadow-[0_16px_32px_-10px_rgba(37,99,235,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.55)] active:translate-y-0 md:h-[58px] md:min-h-0 md:py-0"
              >
                {busy ? (
                  "Création…"
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Rocket className="h-4 w-4" aria-hidden="true" />
                    Créer mon espace gratuitement
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-2.5 flex items-center justify-center gap-3 border-t border-slate-100 pt-2.5 [@media(max-width:767px)_and_(max-height:760px)]:gap-2 md:mt-5 md:gap-5 md:pt-4">
              {footerReassurance.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1 text-[10px] text-slate-500 md:gap-1.5 md:text-xs"
                >
                  <Icon className="h-3 w-3 text-blue-600 md:h-3.5 md:w-3.5" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Marketing column — hidden on mobile, shown from tablet up */}
        <aside className="relative order-2 hidden flex-col justify-between overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.35),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.25),transparent_50%),linear-gradient(180deg,#020C24_0%,#0B1F4D_100%)] p-8 text-white sm:p-10 md:flex lg:order-1 lg:rounded-none lg:p-11">
          <BrandLogo context="login" className="hidden self-start lg:flex" />

          <div className="lg:my-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-blue-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Essai gratuit 7 jours
            </span>
            <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              La plateforme {PLATFORM_BRANDING.shortName} tout-en-un pour piloter votre entreprise
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-blue-100/80">
              Gérez vos ventes, stocks, clients, finances et bien plus depuis un seul espace, simple
              et puissant.
            </p>

            {/* Dashboard preview */}
            <div className="relative mt-7 hidden sm:block">
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-blue-500/20 blur-2xl" />
              <div className="[transform:perspective(1200px)_rotateY(-6deg)_rotateX(2deg)] rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Tableau de bord live
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {["Ventes", "Stocks", "Clients"].map((label) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                      <div className="mb-3 h-1.5 w-10 rounded-full bg-blue-400/60" />
                      <p className="text-[11px] font-semibold text-white/90">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex h-16 items-end gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2.5">
                  {[40, 65, 45, 80, 55, 90, 60].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-gradient-to-t from-blue-500 to-blue-300"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(({ icon: Icon, value, label }) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Icon className="h-4 w-4 text-blue-300" aria-hidden="true" />
                  <p className="mt-1.5 text-sm font-extrabold text-white">{value}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-blue-100/70">{label}</p>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm italic leading-relaxed text-blue-50/90">
                « SAOVIA a transformé la gestion de notre entreprise. Simple, rapide et ultra
                efficace ! »
              </p>
              <div className="mt-3 flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  KY
                </span>
                <div>
                  <p className="text-xs font-bold text-white">M. Kouadio Yao</p>
                  <p className="text-[11px] text-blue-100/60">Directeur, Ivoire Hom</p>
                </div>
              </div>
              <div className="mt-3 flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === 0 ? "w-4 bg-blue-300" : "w-1.5 bg-white/20",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <p className="mt-8 flex items-center gap-2 text-xs text-blue-100/50 lg:mt-0">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            Accès protégé par Supabase Auth
          </p>
        </aside>
      </div>
    </main>
  );
}
