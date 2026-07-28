import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  BarChart3,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { getAuthenticatedDestination } from "@/lib/partner-admin.server";
import { PLATFORM_BRANDING } from "@/config/branding";

const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

type LoginValues = z.infer<typeof loginSchema>;

type LoginTenant = {
  id: string;
  name: string;
  logo_url: string | null;
};

async function getAuthenticatedHome(): Promise<"/app" | "/super-admin" | "/partner"> {
  const destination = await getAuthenticatedDestination();
  return destination === "/403" ? "/app" : destination;
}

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

    if (error) {
      console.error("Impossible de journaliser la tentative de connexion :", error);
    }
  } catch (error) {
    console.error("Impossible de journaliser la tentative de connexion :", error);
  }
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      throw redirect({ to: await getAuthenticatedHome() });
    }
  },
});

const benefits = [
  {
    icon: BarChart3,
    title: "Pilotage en temps réel",
    description: "Suivez vos performances et prenez les bonnes décisions.",
  },
  {
    icon: ShieldCheck,
    title: "Sécurité avancée",
    description: "Vos données d’entreprise protégées à chaque instant.",
  },
  {
    icon: Zap,
    title: "Productivité optimisée",
    description: "Des processus fluides pour accélérer votre croissance.",
  },
];

export function LoginPage({ tenantSlug }: { tenantSlug?: string }) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tenant, setTenant] = useState<LoginTenant | null>(null);
  const [tenantLoading, setTenantLoading] = useState(Boolean(tenantSlug));
  const [tenantNotFound, setTenantNotFound] = useState(false);
  const navigate = useNavigate();
  const displayedCompanyName = tenantSlug
    ? tenant?.name ?? PLATFORM_BRANDING.name
    : PLATFORM_BRANDING.name;

  useEffect(() => {
    if (!tenantSlug) {
      setTenant(null);
      setTenantLoading(false);
      setTenantNotFound(false);
      return;
    }

    let active = true;
    setTenant(null);
    setTenantLoading(true);
    setTenantNotFound(false);

    void (async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, logo_url")
        .eq("slug", tenantSlug)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("Impossible de récupérer l’espace demandé :", error);
      }

      setTenant(data);
      setTenantNotFound(Boolean(error) || !data);
      setTenantLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [tenantSlug]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

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

      if (tenantSlug) {
        if (!tenant) {
          await supabase.auth.signOut();
          throw new Error("Espace entreprise introuvable");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileError || profile?.tenant_id !== tenant.id) {
          await supabase.auth.signOut();
          void logConnectionAttempt(values.email, "failure");
          throw new Error("Ce compte n’appartient pas à cet espace.");
        }
      }

      // La journalisation ne doit jamais bloquer l’accès d’un compte authentifié.
      void logConnectionAttempt(values.email, "success", data.user.id);

      await navigate({
        to: tenantSlug ? "/app" : await getAuthenticatedHome(),
        replace: true,
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-[100dvh] w-full bg-[#f4f7fc] lg:grid-cols-[minmax(480px,1.08fr)_minmax(520px,0.92fr)]">
      <section className="relative hidden min-h-[100dvh] flex-col overflow-hidden bg-[#07113D] px-12 py-10 text-white lg:flex xl:px-20 xl:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,rgba(15,91,255,0.38),transparent_36%),radial-gradient(circle_at_85%_55%,rgba(40,109,255,0.22),transparent_38%),linear-gradient(145deg,#0b1c5a_0%,#07113d_52%,#040a24_100%)]" />
        <div className="pointer-events-none absolute -left-40 top-[35%] h-96 w-96 rounded-full border border-blue-400/10" />
        <div className="pointer-events-none absolute -left-24 top-[42%] h-72 w-72 rounded-full border border-blue-400/10" />

        <img
          src={PLATFORM_BRANDING.assets.logoDark}
          alt={PLATFORM_BRANDING.alt}
          className="relative z-10 h-14 w-auto max-w-[230px]"
        />

        <div className="relative z-10 my-auto max-w-[590px] pb-28 pt-16">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
            L’entreprise, réinventée
          </p>
          <h1 className="max-w-[570px] text-[42px] font-semibold leading-[1.13] tracking-[-0.035em] xl:text-[50px]">
            La plateforme ERP intelligente pour piloter votre entreprise.
          </h1>

          <div className="mt-11 grid gap-6">
            {benefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] shadow-inner shadow-white/5 backdrop-blur">
                  <Icon className="h-5 w-5 text-[#5e9bff]" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold">{title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-blue-100/60">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 opacity-60">
          <div className="absolute bottom-0 left-[2%] h-20 w-[10%] bg-blue-500/10 [clip-path:polygon(0_35%,20%_35%,20%_0,55%_0,55%_55%,75%_55%,75%_25%,100%_25%,100%_100%,0_100%)]" />
          <div className="absolute bottom-0 left-[11%] h-32 w-[18%] border-x border-t border-blue-400/10 bg-blue-500/[0.06] [clip-path:polygon(0_100%,0_25%,12%_25%,12%_8%,55%_8%,55%_0,75%_0,75%_38%,100%_38%,100%_100%)]" />
          <div className="absolute bottom-0 left-[28%] h-24 w-[17%] border-t border-blue-400/10 bg-blue-500/[0.08] [clip-path:polygon(0_100%,0_40%,22%_40%,22%_0,62%_0,62%_48%,100%_48%,100%_100%)]" />
          <div className="absolute bottom-0 left-[44%] h-44 w-[22%] border-x border-t border-blue-400/10 bg-blue-500/[0.06] [clip-path:polygon(0_100%,0_34%,18%_34%,18%_10%,35%_10%,35%_0,66%_0,66%_42%,82%_42%,82%_24%,100%_24%,100%_100%)]" />
          <div className="absolute bottom-0 right-[14%] h-28 w-[22%] border-t border-blue-400/10 bg-blue-500/[0.08] [clip-path:polygon(0_100%,0_30%,24%_30%,24%_0,62%_0,62%_50%,78%_50%,78%_15%,100%_15%,100%_100%)]" />
          <div className="absolute bottom-0 right-0 h-36 w-[17%] border-l border-t border-blue-400/10 bg-blue-500/[0.06] [clip-path:polygon(0_100%,0_46%,22%_46%,22%_20%,55%_20%,55%_0,100%_0,100%_100%)]" />
        </div>

        <div className="relative z-10 text-xs text-blue-200/45">
          © {new Date().getFullYear()} {displayedCompanyName || "AUREX ERP"}. Tous droits réservés.
        </div>
      </section>

      <section className="relative flex min-h-[100dvh] items-center justify-center overflow-y-auto px-5 py-8 sm:px-10 lg:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(15,91,255,0.07),transparent_30%)]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative w-full max-w-[460px] rounded-[28px] border border-white bg-white px-6 py-8 shadow-[0_24px_70px_rgba(17,34,80,0.12)] sm:px-10 sm:py-10"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            {tenantLoading ? (
              <Skeleton className="mb-4 h-16 w-16 rounded-2xl" />
            ) : tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={`Logo ${tenant.name}`}
                className="mb-4 h-16 max-w-[210px] object-contain"
              />
            ) : (
              <img
                src={PLATFORM_BRANDING.assets.logoVertical}
                alt={PLATFORM_BRANDING.alt}
                className="mb-4 h-24 w-auto max-w-[220px] object-contain"
              />
            )}
            <h2 className="sr-only">{tenant?.name ?? PLATFORM_BRANDING.name}</h2>
            {tenantLoading ? (
              <Skeleton className="mt-2 h-4 w-44" />
            ) : (
              <p
                className={`mt-1 text-sm ${
                  tenantNotFound ? "font-medium text-red-600" : "text-slate-500"
                }`}
              >
                {tenantNotFound
                  ? "Espace entreprise introuvable"
                  : tenant
                    ? `Espace ${tenant.name}`
                    : displayedCompanyName && displayedCompanyName !== "AUREX ERP"
                      ? `Espace ${displayedCompanyName}`
                      : "Votre espace de gestion intelligent"}
              </p>
            )}
            <p className="mt-5 text-[15px] font-medium text-slate-700">
              Connectez-vous à votre espace
            </p>
          </div>

          <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Adresse e-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/80 pl-11 text-sm placeholder:text-slate-400 focus:border-[#0F5BFF] focus:bg-white"
                  placeholder="nom@entreprise.com"
                  disabled={tenantLoading || tenantNotFound}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Mot de passe
                </Label>
                <a href="#" className="text-xs font-medium text-[#0F5BFF] hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/80 pl-11 pr-11 text-sm placeholder:text-slate-400 focus:border-[#0F5BFF] focus:bg-white"
                  placeholder="••••••••"
                  disabled={tenantLoading || tenantNotFound}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5BFF] disabled:cursor-not-allowed"
                  disabled={tenantLoading || tenantNotFound}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="mt-3 h-12 w-full rounded-xl bg-[#0F5BFF] font-semibold text-white shadow-[0_10px_24px_rgba(15,91,255,0.24)] transition-all duration-200 hover:bg-[#084bd8]"
              disabled={loading || tenantLoading || tenantNotFound}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Se connecter"}
            </Button>
          </form>

          <p className="mt-7 text-center text-[11px] leading-5 text-slate-400">
            En vous connectant, vous acceptez nos{" "}
            <a href="#" className="font-medium text-slate-500 hover:text-[#0F5BFF]">
              Conditions d’utilisation
            </a>{" "}
            et notre{" "}
            <a href="#" className="font-medium text-slate-500 hover:text-[#0F5BFF]">
              Politique de confidentialité
            </a>
            .
          </p>
        </motion.div>
      </section>
    </main>
  );
}
