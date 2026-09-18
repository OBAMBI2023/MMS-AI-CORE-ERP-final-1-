import { useCallback, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowRight,
  BedSingle,
  Building2,
  CalendarCheck,
  Calendar,
  Check,
  Contact,
  CreditCard,
  Eye,
  EyeOff,
  Globe2,
  Hotel,
  Info,
  LayoutDashboard,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserRound,
  Wallet,
} from "lucide-react";
import { z } from "zod";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { createTrialWorkspace } from "@/lib/trial-signup.server";
import { supabase } from "@/integrations/supabase/client";
import { readEnvVar } from "@/integrations/supabase/env";
import { getAuthenticatedDestination } from "@/lib/partner-admin.server";

// Formulaire d'inscription spécialisé SAOVIA HOTEL (hotel.saovia.net/essai-gratuit).
// Contexte HOTEL déterminé par le portail, pas par un choix de secteur —
// active="hotel" est donc fixé ici, jamais demandé à l'utilisateur. Réutilise
// exactement createTrialWorkspace (voir trial-signup.server.ts) : "hotel" est
// une valeur déjà résolue côté RPC create_trial_workspace en
// platform_type='HOTEL' (supabase/migrations/20260809140000_...), seule
// l'énumération de validation TypeScript (trial-activities.ts) a dû
// l'accepter en plus — aucun changement Supabase.
const HOTEL_ACTIVITY_CODE = "hotel" as const;

const trustBadges = [
  { icon: Calendar, label: "7 jours gratuits" },
  { icon: CreditCard, label: "Sans carte bancaire" },
  { icon: ShieldCheck, label: "Annulation à tout moment" },
] as const;

const featureCards = [
  {
    icon: BedSingle,
    title: "Gestion des chambres",
    description: "Suivez vos chambres, logements, tarifs et disponibilités.",
  },
  {
    icon: CalendarCheck,
    title: "Réservations",
    description: "Centralisez vos réservations et gardez une vision claire de votre activité.",
  },
  {
    icon: Contact,
    title: "Clients",
    description: "Retrouvez facilement les informations de vos clients et séjours.",
  },
  {
    icon: LayoutDashboard,
    title: "Tableau de bord",
    description: "Visualisez les indicateurs essentiels de votre établissement.",
  },
  {
    icon: UserCog,
    title: "Équipe",
    description: "Organisez les accès et les responsabilités de votre équipe.",
  },
  {
    icon: Globe2,
    title: "Présence en ligne",
    description: "Donnez plus de visibilité à vos logements grâce à votre présence SAOVIA HOTEL.",
  },
] as const;

const previewHighlights = [
  { icon: BedSingle, label: "Gestion des chambres" },
  { icon: CalendarCheck, label: "Réservations centralisées" },
  { icon: Wallet, label: "Suivi des revenus" },
] as const;

const signupSchema = z
  .object({
    companyName: z.string().trim().min(2, "Indiquez le nom de votre établissement"),
    fullName: z.string().trim().min(2, "Indiquez votre nom complet"),
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

export function HotelTrialSignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
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

  const handleGoogleSignIn = async () => {
    setGoogleBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) {
      toast.error(error.message);
      setGoogleBusy(false);
    }
  };

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
          activity: HOTEL_ACTIVITY_CODE,
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
      // Route platform_type-aware (identique à /login) : redirige vers /hotel
      // dès que le tenant y a accès, /app sinon — contrairement au formulaire
      // ERP générique qui n'a jamais besoin de cette distinction.
      const destination = await getAuthenticatedDestination();
      await navigate({ to: destination, replace: true });
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
    <div className="relative min-h-screen overflow-x-hidden bg-white text-slate-950">
      {/* Header clair premium SAOVIA HOTEL */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <nav
          aria-label="Navigation principale"
          className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 lg:px-10"
        >
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D4AF37]/50 bg-[#0B1F4D]">
              <Hotel className="h-5 w-5 text-[#D4AF37]" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-[#0B1F4D]">
              SAOVIA <span className="text-[#D4AF37]">HOTEL</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">Déjà un compte ?</span>
            <Link
              to="/login"
              className="inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F4D]/40"
            >
              Se connecter
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative">
        {/* Halo navy/gold SAOVIA HOTEL (très léger sur fond blanc) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[#0B1F4D]/10 blur-[130px]" />
          <div className="absolute top-24 right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-[#D4AF37]/10 blur-[120px]" />
        </div>

        {/* Hero */}
        <section className="relative px-5 pb-20 pt-14 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-14">
            {/* Colonne gauche : positionnement + aperçu + confiance */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-1.5 text-xs font-semibold text-[#0B1F4D]">
                <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
                Essai gratuit 7 jours
              </span>

              <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.4rem]">
                Créez votre espace <span className="text-[#0B1F4D]">SAOVIA HOTEL</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Gérez votre hôtel ou votre résidence simplement pendant 7 jours, sans engagement.
              </p>
              <p className="mt-3 max-w-xl text-sm font-semibold text-[#0B1F4D] sm:text-base">
                SAOVIA HOTEL — la plateforme de gestion pour hôtels, résidences et établissements
                d'hébergement.
              </p>

              {/* Aperçu : bénéfices réels, aucune donnée fictive */}
              <div className="relative mt-10 hidden sm:block">
                <div
                  className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-[#0B1F4D]/10 via-[#D4AF37]/5 to-[#0B1F4D]/10 blur-2xl"
                  aria-hidden="true"
                />
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-20px_rgba(11,31,77,0.18)]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                    <span className="ml-3 h-2 w-24 rounded-full bg-slate-100" />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {previewHighlights.map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-[#0B1F4D]/[0.04] p-3 text-center"
                      >
                        <Icon className="h-4 w-4 text-[#0B1F4D]" aria-hidden="true" />
                        <p className="text-[11px] font-semibold leading-tight text-slate-700">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Garanties */}
              <div className="mt-8 grid grid-cols-3 gap-3">
                {trustBadges.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center shadow-sm transition-colors hover:border-[#0B1F4D]/30"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0B1F4D]/[0.06] text-[#0B1F4D]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <p className="text-[11px] font-semibold leading-tight text-slate-700">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Carte blanche premium avec le formulaire */}
            <div
              id="formulaire-essai"
              className="scroll-mt-24 animate-in fade-in slide-in-from-bottom-4 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_25px_70px_-20px_rgba(11,31,77,0.20)] duration-700 sm:p-8 lg:p-9"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Créer votre espace d'essai</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Remplissez les informations ci-dessous pour commencer.
                  </p>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0B1F4D]/[0.06] text-[#0B1F4D]">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleBusy}
                className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F4D]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon className="h-5 w-5" />
                Continuer avec Google
              </button>

              <div className="my-4 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium text-slate-400">ou</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit(handleSignup)} noValidate className="space-y-5">
                <LightField
                  id="companyName"
                  label="Nom de l'établissement"
                  icon={Building2}
                  autoComplete="organization"
                  placeholder="Ex. Résidence Damaja"
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
                    placeholder="07 XX XX XX XX"
                    error={errors.phone?.message}
                    {...register("phone")}
                  />
                </div>

                <LightField
                  id="email"
                  label="E-mail professionnel"
                  type="email"
                  icon={Mail}
                  autoComplete="email"
                  placeholder="contact@monetablissement.ci"
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
                        className="text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F4D]/40 rounded"
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
                        className="text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F4D]/40 rounded"
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
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0B1F4D]" aria-hidden="true" />
                  <span className="flex flex-1 flex-wrap items-start gap-1">
                    <input
                      id="termsAccepted"
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#0B1F4D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F4D]/40"
                      {...register("termsAccepted")}
                    />
                    <span>
                      En créant votre espace, vous acceptez les{" "}
                      <Link to="/tarifs" className="font-semibold text-[#0B1F4D] hover:underline">
                        Conditions d'utilisation
                      </Link>{" "}
                      et la{" "}
                      <Link to="/tarifs" className="font-semibold text-[#0B1F4D] hover:underline">
                        Politique de confidentialité
                      </Link>{" "}
                      de SAOVIA.
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
                  aria-label="Démarrer mon essai gratuit"
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] text-sm font-bold text-[#0B1F4D] shadow-lg shadow-[#D4AF37]/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#D4AF37]/90 hover:shadow-xl active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F4D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Création…
                    </>
                  ) : (
                    <>
                      Démarrer mon essai gratuit
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

        {/* Fonctionnalités */}
        <section className="relative mx-auto max-w-6xl px-5 py-16 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Tout ce qu'il faut pour mieux gérer votre établissement
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-[#0B1F4D]/30"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#0B1F4D]/[0.06] text-[#0B1F4D]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bandeau final */}
        <section className="px-5 py-16 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#0B1F4D] to-[#12295e] px-6 py-12 text-center shadow-2xl shadow-[#0B1F4D]/30 sm:px-12">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              Prêt à mieux gérer votre établissement ?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/70 sm:text-base">
              Rejoignez SAOVIA et centralisez votre activité hôtelière.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-white/90">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" aria-hidden="true" />
                7 jours gratuits
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" aria-hidden="true" />
                Sans carte bancaire
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" aria-hidden="true" />
                Annulation à tout moment
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={scrollToForm}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#0B1F4D] shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1F4D] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                Démarrer mon essai gratuit
              </button>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
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
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-200 focus:border-[#0B1F4D] focus:bg-white focus:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F4D]/30"
        />
        {trailing && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
