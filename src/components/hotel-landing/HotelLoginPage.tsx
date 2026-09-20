import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowRight,
  BedDouble,
  CalendarCheck,
  Contact,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedDestination } from "@/lib/partner-admin.server";
import { cn } from "@/lib/utils";

// Page de connexion dédiée SAOVIA HOTEL (hotel.saovia.net/login). Réutilise
// exactement le même flux d'authentification que /login (ERP générique,
// src/routes/login.tsx) — signInWithPassword + getAuthenticatedDestination,
// déjà platform_type-aware — seule l'habillage visuel change. La fonction de
// journalisation est dupliquée volontairement (non exportée par login.tsx),
// même logique que isHotelHostRequest() dupliquée par fichier dans ce projet.
async function logConnectionAttempt(
  email: string,
  status: "success" | "failure",
  userId?: string,
) {
  try {
    const { error } = await supabase.rpc("log_connection_attempt", {
      p_email: email,
      p_status: status,
      ...(userId ? { p_user_id: userId } : {}),
    });
    if (error) console.error("Impossible de journaliser la tentative de connexion :", error);
  } catch (error) {
    console.error("Impossible de journaliser la tentative de connexion :", error);
  }
}

const heroFeatures = [
  { icon: CalendarCheck, label: "Réservations" },
  { icon: BedDouble, label: "Chambres" },
  { icon: Contact, label: "Clients" },
  { icon: Wallet, label: "Revenus" },
] as const;

const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function HotelLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const handleLogin = async (values: LoginValues) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        void logConnectionAttempt(values.email, "failure");
        throw error;
      }

      void logConnectionAttempt(values.email, "success", data.user.id);
      await navigate({ to: await getAuthenticatedDestination(), replace: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white lg:flex-row">
      {/* Gauche : photographie hôtel + overlay navy + positionnement.
          Mobile/tablette (<lg) : la photo reste le sujet dominant (42-48vh),
          seuls la marque et l'accroche reposent dessus (haut/bas), le centre
          — le sujet de la photo — reste dégagé. Les 4 fonctionnalités sont
          déplacées dans un bandeau SOUS la photo (cf. plus bas) plutôt que
          de s'empiler dessus. Desktop (lg+) : layout d'origine inchangé. */}
      <div className="relative h-[44vh] min-h-[300px] overflow-hidden sm:h-[46vh] md:h-[48vh] lg:h-auto lg:min-h-screen lg:w-[58%]">
        <picture>
          {/* Desktop/tablette large : crop portrait dédié, sujet centré, jamais coupé */}
          <source
            media="(min-width: 1024px)"
            srcSet="/images/hotel/saovia-hotel-login-hero.jpg"
          />
          <img
            src="/images/hotel/saovia-hotel-login-hero-mobile.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </picture>
        {/* Mobile/tablette : dégradé léger haut+bas (lisibilité du texte),
            centre transparent pour garder le sujet de la photo visible. */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#0B1F4D]/55 via-transparent to-[#0B1F4D]/70 lg:hidden"
          aria-hidden="true"
        />
        {/* Desktop : dégradé d'origine, inchangé. */}
        <div
          className="absolute inset-0 hidden bg-gradient-to-t from-[#0B1F4D]/90 via-[#0B1F4D]/45 to-[#0B1F4D]/20 lg:block"
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col justify-between p-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white sm:p-8 lg:justify-end lg:p-14 lg:pt-14">
          <div>
            <span className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              SAOVIA <span className="text-[#D4AF37]">HOTEL</span>
            </span>
            <span className="mt-2 block h-1 w-12 rounded-full bg-[#D4AF37] lg:mt-3 lg:w-14" aria-hidden="true" />
          </div>

          <div>
            <p className="max-w-md text-xl font-semibold leading-snug sm:text-2xl lg:mt-6 lg:text-3xl">
              L'hospitalité d'aujourd'hui,
              <br />
              une gestion plus performante.
            </p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/80 sm:mt-3 sm:text-sm lg:text-base">
              Pilotez votre établissement avec simplicité.
            </p>

            {/* Desktop uniquement : les 4 fonctionnalités restent sur la
                photo (assez d'espace vertical en min-h-screen pour rester
                élégantes sans masquer le sujet). Sur mobile/tablette, voir
                le bandeau dédié sous la photo. */}
            <div className="mt-6 hidden max-w-sm grid-cols-4 gap-3 lg:grid">
              {heroFeatures.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/25 bg-white/10 p-2.5 text-center backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
                  <p className="truncate text-[11px] leading-tight text-white/85">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bandeau fonctionnalités mobile/tablette : sous la photo, jamais
          superposé au sujet. Masqué à partir de lg (les fonctionnalités
          restent sur la photo en desktop, cf. ci-dessus). */}
      <div className="grid grid-cols-2 bg-[#0B1F4D] lg:hidden">
        {heroFeatures.map(({ icon: Icon, label }, index) => (
          <div
            key={label}
            className={cn(
              "flex min-w-0 items-center justify-center gap-2 px-3 py-3 text-white/90",
              index % 2 === 0 && "border-r border-white/10",
              index < 2 && "border-b border-white/10",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" aria-hidden="true" />
            <span className="truncate text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Droite : panneau clair, formulaire de connexion */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-white via-white to-slate-50 px-6 pt-12 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:px-10 lg:px-16">
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full border border-[#D4AF37]/15"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full border border-[#D4AF37]/15"
          aria-hidden="true"
        />

        <div className="relative z-10 w-full max-w-md">
          <div className="text-center">
            <img
              src="/branding/hotel/saovia-hotel-lockup.png"
              alt="SAOVIA HOTEL"
              className="mx-auto h-14 w-auto sm:h-16"
            />
          </div>

          <h1 className="mt-8 text-center text-3xl font-bold text-[#0B1F4D]">Bienvenue</h1>
          <p className="mt-1 text-center text-slate-500">
            Connectez-vous à votre espace de gestion
          </p>

          <form onSubmit={handleSubmit(handleLogin)} noValidate className="mt-8 space-y-5">
            <HotelLoginField
              id="hotel-login-email"
              label="E-mail professionnel"
              type="email"
              icon={Mail}
              autoComplete="email"
              placeholder="votre@email.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <HotelLoginField
              id="hotel-login-password"
              label="Mot de passe"
              type={showPassword ? "text" : "password"}
              icon={Lock}
              autoComplete="current-password"
              placeholder="Votre mot de passe"
              error={errors.password?.message}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F4D]/40 rounded"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              {...register("password")}
            />

            <div className="flex items-center justify-between gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-[#0B1F4D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F4D]/40"
                />
                Se souvenir de moi
              </label>
              <Link
                to="/forgot-password"
                className="shrink-0 text-sm font-semibold text-[#0B1F4D] hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] text-sm font-bold text-[#0B1F4D] shadow-lg shadow-[#D4AF37]/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#D4AF37]/90 hover:shadow-xl active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F4D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">ou</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-sm text-slate-600">Vous n'avez pas encore de compte ?</p>
            <Link
              to="/essai-gratuit"
              className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border-2 border-[#D4AF37] px-5 py-3 text-sm font-bold text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/5"
            >
              Créer mon établissement
            </Link>
          </div>

          <div className="mt-8 text-center">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Accès sécurisé · SAOVIA HOTEL
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Vos données sont protégées et confidentielles
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HotelLoginField({
  id,
  label,
  icon: Icon,
  error,
  trailing,
  ...inputProps
}: {
  id: string;
  label: string;
  icon: typeof Mail;
  error?: string;
  trailing?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id={id}
          {...inputProps}
          className="h-[52px] w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-11 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0B1F4D] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0B1F4D]/10"
        />
        {trailing && <div className="absolute right-4 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
