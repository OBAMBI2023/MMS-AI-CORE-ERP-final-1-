import { useCallback, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Info,
  LayoutGrid,
  Loader2,
  Lock,
  Mail,
  Menu,
  Phone,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { z } from "zod";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { PLATFORM_BRANDING } from "@/config/branding";
import { createTrialWorkspace } from "@/lib/trial-signup.server";
import { TRIAL_ACTIVITIES, TRIAL_ACTIVITY_CODES } from "@/lib/trial-activities";
import { supabase } from "@/integrations/supabase/client";
import { readEnvVar } from "@/integrations/supabase/env";

// Chaque activité détermine automatiquement la configuration ERP du tenant
// créé (voir create_trial_workspace) — aucun choix de pack n'est exposé ici.
function resolvePostSignupRoute(_platformType: string): "/app" {
  // Toutes les activités (y compris hôtel) provisionnent l'espace ERP
  // générique pour l'instant. Ajouter un cas "HOTEL" ici branchera la
  // redirection dédiée le jour où cette expérience existera.
  return "/app";
}

const navigationItems = [
  { label: "Accueil", to: "/" },
  { label: "Fonctionnalités", to: "/fonctionnalites" },
  { label: "Tarifs", to: "/tarifs" },
  { label: "Démonstration", to: "/demo" },
] as const;

const trustBadges = [
  { icon: Calendar, label: "Essai gratuit 7 jours" },
  { icon: CreditCard, label: "Sans carte bancaire" },
  { icon: ShieldCheck, label: "Données sécurisées" },
  { icon: Timer, label: "Mise en service en 2 minutes" },
] as const;

const solutionCards = [
  {
    icon: LayoutGrid,
    title: "Gestion centralisée",
    description: "Pilotez ventes, stocks, achats et finances depuis une seule plateforme.",
  },
  {
    icon: Users,
    title: "Collaboration efficace",
    description: "Travaillez en équipe avec des rôles et permissions adaptés à chaque métier.",
  },
  {
    icon: BarChart3,
    title: "Analyses avancées",
    description: "Suivez vos performances en temps réel grâce à des tableaux de bord intelligents.",
  },
  {
    icon: ShieldCheck,
    title: "Sécurité maximale",
    description: "Chiffrement, sauvegardes automatiques et isolation totale de vos données.",
  },
] as const;

// Noms fictifs à but illustratif uniquement — aucune marque réelle.
const trustCompanies = [
  "Atlas Corp",
  "NordTrade",
  "Groupe Meridian",
  "Alpha Industries",
  "Zenith Retail",
  "Delta Services",
] as const;

const signupSchema = z
  .object({
    companyName: z.string().trim().min(2, "Indiquez le nom de votre entreprise"),
    fullName: z.string().trim().min(2, "Indiquez votre nom complet"),
    activity: z.enum(TRIAL_ACTIVITY_CODES, {
      errorMap: () => ({ message: "Sélectionnez une activité" }),
    }),
    email: z.string().trim().email("Adresse e-mail invalide"),
    phone: z.string().trim().min(6, "Numéro de téléphone invalide"),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    passwordConfirmation: z.string(),
    termsAccepted: z.boolean().refine((value) => value === true, {
      message: "Vous devez accepter les conditions d'utilisation",
    }),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["passwordConfirmation"],
  });

type SignupValues = z.infer<typeof signupSchema>;

export function TrialSignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);
  const submissionInFlightRef = useRef(false);
  const siteKey = readEnvVar("VITE_TURNSTILE_SITE_KEY") ?? "";
  const handleTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      companyName: "",
      fullName: "",
      email: "",
      phone: "",
      password: "",
      passwordConfirmation: "",
      termsAccepted: false,
    },
  });

  const scrollToForm = () =>
    document
      .getElementById("formulaire-essai")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleSignup = async (values: SignupValues) => {
    if (submissionInFlightRef.current || !turnstileToken) return;

    submissionInFlightRef.current = true;
    const tokenForThisSubmission = turnstileToken;
    // Un token Turnstile est à usage unique : il est consommé dès le début de la requête.
    setTurnstileToken("");
    setBusy(true);
    try {
      const session = await createTrialWorkspace({
        data: {
          companyName: values.companyName,
          fullName: values.fullName,
          activity: values.activity,
          email: values.email,
          phone: values.phone,
          password: values.password,
          turnstileToken: tokenForThisSubmission,
        },
      });

      const { error } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });

      queryClient.clear();

      if (error) {
        toast.success("Votre espace a été créé. Connectez-vous avec vos identifiants.");
        await navigate({ to: "/login", replace: true });
        return;
      }

      toast.success("Votre espace est prêt. Votre essai gratuit de 7 jours commence maintenant.");
      await navigate({ to: resolvePostSignupRoute(session.platformType), replace: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de créer votre espace. Aucune donnée n'a été conservée.";
      turnstileRef.current?.reset();
      toast.error(
        message.includes("timeout-or-duplicate")
          ? "La vérification anti-robot a expiré. Veuillez la refaire."
          : message,
      );
    } finally {
      submissionInFlightRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070B18] text-white">
      {/* Header sombre premium */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070B18]/95 backdrop-blur-xl">
        <nav
          aria-label="Navigation principale"
          className="mx-auto grid h-20 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-5 lg:px-10"
        >
          <Link to="/" className="flex items-center" onClick={() => setMobileNavOpen(false)}>
            <BrandLogo context="header" className="size-12 md:size-14" />
          </Link>

          <div className="hidden items-center justify-center gap-9 lg:flex">
            {navigationItems.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group relative inline-block pb-1 text-sm font-medium transition-colors hover:text-blue-400 ${
                    active ? "text-blue-400" : "text-slate-300"
                  }`}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-gradient-to-r from-blue-400 to-violet-400 transition-transform duration-300 group-hover:scale-x-100 ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 lg:gap-3">
            <Link
              to="/login"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 lg:inline-flex"
            >
              Se connecter
            </Link>
            <Link
              to="/demo"
              className="hidden items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 lg:inline-flex"
              style={{
                border: "1px solid transparent",
                backgroundImage:
                  "linear-gradient(#070B18, #070B18), linear-gradient(to right, #3b82f6, #8b5cf6)",
                backgroundOrigin: "border-box",
                backgroundClip: "padding-box, border-box",
              }}
            >
              Demander une démo
            </Link>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 lg:hidden"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-navigation"
              aria-label={mobileNavOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {mobileNavOpen && (
          <div
            id="mobile-navigation"
            className="border-t border-white/10 bg-[#070B18] px-5 py-5 lg:hidden"
          >
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
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                <Link
                  to="/login"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-slate-100"
                >
                  Se connecter
                </Link>
                <Link
                  to="/demo"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Demander une démo
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="relative">
        {/* Halo bleu/violet */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue-600/25 blur-[130px]" />
          <div className="absolute top-24 right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-violet-600/20 blur-[120px]" />
        </div>

        {/* Hero */}
        <section className="relative px-5 py-14 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-14">
            {/* Colonne gauche : pitch + illustration + confiance */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-200">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Essai gratuit 7 jours
              </span>

              <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
                Pilotez votre entreprise avec{" "}
                <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  puissance et simplicité
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Découvrez {PLATFORM_BRANDING.productName}, la plateforme tout-en-un qui centralise
                ventes, stocks, finances et équipes. Testez toutes les fonctionnalités pendant 7
                jours, sans engagement.
              </p>

              {/* Illustration : aperçu tableau de bord ERP */}
              <div className="relative mt-10 hidden sm:block">
                <div
                  className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-violet-500/20 blur-2xl"
                  aria-hidden="true"
                />
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_-20px_rgba(2,6,23,0.7)] backdrop-blur-xl">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                    <span className="ml-3 h-2 w-24 rounded-full bg-white/10" />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      { label: "Ventes", value: "128,4 M FCFA" },
                      { label: "Stocks", value: "3 214" },
                      { label: "Clients", value: "587" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-base font-bold text-white">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex h-24 items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    {[40, 65, 50, 80, 60, 95, 70].map((height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-md bg-gradient-to-t from-blue-500/70 to-violet-400/70"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Cartes de confiance */}
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {trustBadges.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-4 text-center backdrop-blur-xl transition-colors hover:border-blue-400/30"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-300">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <p className="text-[11px] font-semibold leading-tight text-slate-200">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-center text-[11px] text-slate-400 sm:text-left">
                Compatible avec toutes les devises (FCFA, EUR, USD, GBP, etc.). SAOVIA adapte
                automatiquement la devise selon la configuration de votre entreprise.
              </p>
            </div>

            {/* Carte blanche premium avec le formulaire */}
            <div
              id="formulaire-essai"
              className="scroll-mt-24 animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-[0_25px_70px_-20px_rgba(2,6,23,0.65)] duration-700 sm:p-8 lg:p-9"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Créer votre espace d'essai</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Remplissez les informations ci-dessous pour commencer.
                  </p>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>

              <form onSubmit={handleSubmit(handleSignup)} noValidate className="mt-7 space-y-5">
                <LightField
                  id="companyName"
                  label="Nom de l'entreprise"
                  icon={Building2}
                  autoComplete="organization"
                  placeholder="Nom de votre entreprise"
                  error={errors.companyName?.message}
                  {...register("companyName")}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField
                    id="fullName"
                    label="Nom complet"
                    icon={UserRound}
                    autoComplete="name"
                    placeholder="Votre nom complet"
                    error={errors.fullName?.message}
                    {...register("fullName")}
                  />
                  <LightField
                    id="phone"
                    label="Téléphone"
                    type="tel"
                    icon={Phone}
                    autoComplete="tel"
                    placeholder="+225 07 00 00 00"
                    error={errors.phone?.message}
                    {...register("phone")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="activity" className="text-xs font-semibold text-slate-600">
                    Secteur d'activité
                  </label>
                  <select
                    id="activity"
                    defaultValue=""
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 shadow-sm transition-all duration-200 focus:border-blue-500 focus:bg-white focus:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    {...register("activity")}
                  >
                    <option value="" disabled>
                      Sélectionnez votre secteur d'activité
                    </option>
                    {TRIAL_ACTIVITIES.map((activity) => (
                      <option key={activity.value} value={activity.value}>
                        {activity.label}
                      </option>
                    ))}
                  </select>
                  {errors.activity?.message && (
                    <p className="text-xs font-medium text-red-600">{errors.activity.message}</p>
                  )}
                </div>

                <LightField
                  id="email"
                  label="E-mail professionnel"
                  type="email"
                  icon={Mail}
                  autoComplete="email"
                  placeholder="exemple@entreprise.com"
                  error={errors.email?.message}
                  {...register("email")}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField
                    id="password"
                    label="Mot de passe"
                    type={showPassword ? "text" : "password"}
                    icon={Lock}
                    autoComplete="new-password"
                    error={errors.password?.message}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded"
                        aria-label={
                          showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                    {...register("password")}
                  />
                  <LightField
                    id="passwordConfirmation"
                    label="Confirmer le mot de passe"
                    type={showConfirmation ? "text" : "password"}
                    icon={Lock}
                    autoComplete="new-password"
                    error={errors.passwordConfirmation?.message}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowConfirmation((v) => !v)}
                        className="text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded"
                        aria-label={
                          showConfirmation ? "Masquer le mot de passe" : "Afficher le mot de passe"
                        }
                      >
                        {showConfirmation ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                    {...register("passwordConfirmation")}
                  />
                </div>

                <label
                  htmlFor="termsAccepted"
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
                >
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
                  <span className="flex flex-1 flex-wrap items-start gap-1">
                    <input
                      id="termsAccepted"
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                      {...register("termsAccepted")}
                    />
                    <span>
                      En créant votre compte, vous acceptez nos{" "}
                      <Link to="/tarifs" className="font-semibold text-blue-600 hover:underline">
                        Conditions d'utilisation
                      </Link>{" "}
                      et notre{" "}
                      <Link to="/tarifs" className="font-semibold text-blue-600 hover:underline">
                        Politique de confidentialité
                      </Link>
                      .
                    </span>
                  </span>
                </label>
                {errors.termsAccepted?.message && (
                  <p className="-mt-3 text-xs font-medium text-red-600">
                    {errors.termsAccepted.message}
                  </p>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {siteKey ? (
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={siteKey}
                      onTokenChange={handleTurnstileToken}
                    />
                  ) : (
                    <p role="alert" className="text-sm text-red-600">
                      La protection anti-robot n'est pas configurée.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={busy || !turnstileToken}
                  aria-label="Créer mon espace gratuitement"
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-600/30 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Création…
                    </>
                  ) : (
                    <>
                      Créer mon espace gratuitement
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>

                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Données sécurisées
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Essai 7 jours
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Annulation à tout moment
                  </span>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Solution complète */}
        <section className="relative mx-auto max-w-6xl px-5 py-16 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Une solution complète pour votre entreprise
            </h2>
            <p className="mt-4 text-slate-300">
              Tous les modules dont vous avez besoin, réunis dans une seule plateforme intelligente.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {solutionCards.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-blue-400/30"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-300">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bande de confiance (noms fictifs) */}
        <section className="border-y border-white/10 bg-white/[0.02] py-10">
          <div className="mx-auto max-w-6xl px-5 lg:px-8">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Elles nous font confiance
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {trustCompanies.map((name) => (
                <span
                  key={name}
                  className="text-lg font-bold tracking-tight text-slate-500/70 transition-colors hover:text-slate-300"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Bandeau final */}
        <section className="px-5 py-16 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-12 text-center shadow-2xl shadow-blue-900/40 sm:px-12">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              Prêt à transformer la gestion de votre entreprise ?
            </h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-white/90">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" aria-hidden="true" />
                Essai gratuit 7 jours
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" aria-hidden="true" />
                Sans carte bancaire
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" aria-hidden="true" />
                Annulation facile
              </span>
            </div>
            <button
              type="button"
              onClick={scrollToForm}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-700 shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              Créer mon espace gratuitement
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function LightField({
  id,
  label,
  icon: Icon,
  error,
  trailing,
  ...inputProps
}: {
  id: string;
  label: string;
  icon: typeof Building2;
  error?: string;
  trailing?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-slate-600">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id={id}
          {...inputProps}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-200 focus:border-blue-500 focus:bg-white focus:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
        />
        {trailing && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
