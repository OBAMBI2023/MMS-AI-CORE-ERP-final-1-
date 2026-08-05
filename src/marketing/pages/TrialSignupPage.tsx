import { useRef, useState } from "react";
import { useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Headphones,
  Info,
  Lock,
  Mail,
  Menu,
  Phone,
  Rocket,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
  BarChart3,
} from "lucide-react";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { createTrialWorkspace } from "@/lib/trial-signup.server";
import { TRIAL_SECTORS, type TrialSector } from "@/lib/public-trial-policy";
import { supabase } from "@/integrations/supabase/client";
import { readEnvVar } from "@/integrations/supabase/env";

const navigationItems = [
  { label: "Accueil", to: "/" },
  { label: "Fonctionnalités", to: "/fonctionnalites" },
  { label: "Tarifs", to: "/tarifs" },
  { label: "Démonstration", to: "/demo" },
] as const;

const features = [
  {
    icon: ShieldCheck,
    title: "Sécurisé & fiable",
    description: "Vos données sont protégées et stockées en toute sécurité.",
  },
  {
    icon: Rocket,
    title: "Prise en main rapide",
    description: "Interface intuitive, adaptée à tous les profils utilisateurs.",
  },
  {
    icon: BarChart3,
    title: "Toutes les fonctionnalités",
    description: "Accédez à l'ensemble des modules pendant 7 jours.",
  },
  {
    icon: Headphones,
    title: "Support réactif",
    description: "Notre équipe est disponible pour vous accompagner.",
  },
] as const;

type FormState = {
  companyName: string;
  adminName: string;
  sector: TrialSector | "";
  email: string;
  phone: string;
  password: string;
  confirmation: string;
  termsAccepted: boolean;
};

const initialForm: FormState = {
  companyName: "",
  adminName: "",
  sector: "",
  email: "",
  phone: "",
  password: "",
  confirmation: "",
  termsAccepted: false,
};

export function TrialSignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const turnstile = useRef<TurnstileHandle>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  const field =
    (key: keyof Pick<FormState, "companyName" | "adminName" | "email" | "phone" | "password" | "confirmation">) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((v) => ({ ...v, [key]: e.target.value }));

  const passwordsMismatch = form.confirmation.length > 0 && form.password !== form.confirmation;
  const siteKey = readEnvVar("VITE_TURNSTILE_SITE_KEY") ?? "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.sector) {
      toast.error("Veuillez sélectionner un secteur d’activité.");
      return;
    }
    if (form.password !== form.confirmation) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      const result = await createTrialWorkspace({
        data: { ...form, sector: form.sector, termsAccepted: form.termsAccepted as true, turnstileToken: token },
      });

      // The account and tenant now exist. Establish the browser session
      // explicitly instead of assuming signUp/the RPC left one behind.
      const normalizedEmail = form.email.trim().toLowerCase();
      const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: form.password,
      });

      if (signInError || !signIn.session || !signIn.user) {
        toast.error(
          signInError?.message ??
            "Votre espace a été créé mais la connexion automatique a échoué. Veuillez vous connecter.",
        );
        return;
      }

      const { data: verified } = await supabase.auth.getSession();
      if (!verified.session) {
        toast.error("Votre espace a été créé mais la session n’a pas pu être établie. Veuillez vous connecter.");
        return;
      }

      // A brand-new user id can't have stale cached data, but clear anyway so
      // no query keyed off a previous session in this tab can leak in.
      queryClient.clear();
      setForm(initialForm);
      await navigate({ to: result.platformType === "HOTEL" ? "/hotel" : "/app", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'envoyer la demande.");
      turnstile.current?.reset();
      setToken("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      {/* Header sombre, cohérent avec le reste du site */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B1220]/95 backdrop-blur-xl">
        <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center" onClick={() => setMobileNavOpen(false)}>
            <BrandLogo context="header" />
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {navigationItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm font-medium transition-colors hover:text-blue-400 ${
                  pathname === item.to ? "text-blue-400" : "text-slate-300"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
            >
              Connexion
            </Link>
            <button
              type="button"
              onClick={() =>
                document.getElementById("formulaire-essai")?.scrollIntoView({ behavior: "smooth" })
              }
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-700"
            >
              Essayer gratuitement
            </button>
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-200 hover:bg-white/10 lg:hidden"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {mobileNavOpen && (
          <div className="border-t border-white/10 bg-[#0B1220] px-5 py-5 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="px-5 py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
          {/* Colonne pitch */}
          <div className="lg:sticky lg:top-28">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300 ring-1 ring-inset ring-blue-400/30">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Essai gratuit 7 jours
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Créez votre espace <br className="hidden sm:block" />
              d'essai <span className="text-amber-400">gratuitement</span>
            </h1>

            <p className="mt-5 max-w-md text-slate-300">
              Profitez de 7 jours d'essai complet et sans engagement pour découvrir SAOVIA ERP.
              Gérez facilement votre entreprise avec une solution tout-en-un, intelligente et
              sécurisée.
            </p>

            <ul className="mt-9 space-y-5">
              {features.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-sm text-slate-400">{description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
                <Users className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-sm text-slate-300">
                Déjà plus de <span className="font-semibold text-white">500 entreprises</span> nous
                font confiance.
              </p>
            </div>
          </div>

          {/* Colonne formulaire */}
          <div
            id="formulaire-essai"
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Créer votre espace d'essai</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Remplissez les informations ci-dessous pour commencer.
                </p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            <form onSubmit={submit} className="mt-7 space-y-6">
              {/* Informations de l'entreprise */}
              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  Informations de l'entreprise
                </h3>

                <DarkField
                  id="companyName"
                  label={null}
                  icon={Building2}
                  placeholder="Nom de votre entreprise*"
                  value={form.companyName}
                  onChange={field("companyName")}
                  autoComplete="organization"
                  required
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <DarkField
                    id="adminName"
                    label="Nom complet*"
                    icon={User}
                    value={form.adminName}
                    onChange={field("adminName")}
                    autoComplete="name"
                    required
                  />
                  <DarkField
                    id="phone"
                    label="Téléphone*"
                    type="tel"
                    icon={Phone}
                    placeholder="+225 07 00 00 00"
                    value={form.phone}
                    onChange={field("phone")}
                    autoComplete="tel"
                    required
                  />
                </div>

                <DarkField
                  id="email"
                  label="E-mail professionnel*"
                  type="email"
                  icon={Mail}
                  placeholder="exemple@entreprise.com"
                  value={form.email}
                  onChange={field("email")}
                  autoComplete="email"
                  required
                />

                <div className="space-y-1.5">
                  <label htmlFor="sector" className="text-xs font-medium text-slate-400">
                    Secteur d'activité*
                  </label>
                  <select
                    id="sector"
                    value={form.sector}
                    onChange={(e) =>
                      setForm((v) => ({ ...v, sector: e.target.value as TrialSector }))
                    }
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 [&>option]:bg-[#0B1220]"
                  >
                    <option value="" disabled>
                      Sélectionnez votre secteur d'activité
                    </option>
                    {TRIAL_SECTORS.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <div className="border-t border-white/10" />

              {/* Informations de connexion */}
              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Informations de connexion
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DarkField
                    id="password"
                    label="Mot de passe*"
                    type={showPassword ? "text" : "password"}
                    icon={Lock}
                    value={form.password}
                    onChange={field("password")}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-slate-400 hover:text-slate-200"
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                  <DarkField
                    id="confirmation"
                    label="Confirmer le mot de passe*"
                    type={showConfirmation ? "text" : "password"}
                    icon={Lock}
                    value={form.confirmation}
                    onChange={field("confirmation")}
                    autoComplete="new-password"
                    required
                    error={passwordsMismatch ? "Les mots de passe diffèrent." : undefined}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowConfirmation((v) => !v)}
                        className="text-slate-400 hover:text-slate-200"
                        aria-label={showConfirmation ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                </div>
              </section>

              <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
                <span className="flex flex-1 flex-wrap items-start gap-1">
                  <input
                    type="checkbox"
                    checked={form.termsAccepted}
                    onChange={(e) => setForm((v) => ({ ...v, termsAccepted: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500/40"
                  />
                  <span>
                    En créant votre compte, vous acceptez nos{" "}
                    <Link to="/tarifs" className="font-semibold text-blue-300 hover:underline">
                      Conditions d'utilisation
                    </Link>{" "}
                    et notre{" "}
                    <Link to="/tarifs" className="font-semibold text-blue-300 hover:underline">
                      Politique de confidentialité
                    </Link>
                    .
                  </span>
                </span>
              </label>

              {siteKey ? (
                <Turnstile ref={turnstile} siteKey={siteKey} onTokenChange={setToken} />
              ) : (
                <p className="text-sm text-red-400">Le contrôle anti-robot n'est pas configuré.</p>
              )}

              <button
                type="submit"
                disabled={busy || !token || !form.termsAccepted || !form.sector || passwordsMismatch}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {busy ? (
                  "Création…"
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    Créer mon espace d'essai gratuit
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500">
                Aucun engagement · Annulation à tout moment
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function DarkField({
  id,
  label,
  icon: Icon,
  error,
  trailing,
  ...inputProps
}: {
  id: string;
  label: string | null;
  icon: typeof Building2;
  error?: string;
  trailing?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-400">
          {label}
        </label>
      )}
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <input
          id={id}
          {...inputProps}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        {trailing && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error && <p className="text-xs font-medium text-red-400">{error}</p>}
    </div>
  );
}
