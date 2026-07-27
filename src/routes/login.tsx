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
import { Mail, Lock, Eye, EyeOff, Loader2, BarChart3, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { getPlatformAdminAccess } from "@/lib/super-admin.server";

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

async function getAuthenticatedHome(): Promise<"/app" | "/super-admin"> {
  const { isPlatformAdmin } = await getPlatformAdminAccess();
  return isPlatformAdmin ? "/super-admin" : "/app";
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

export function LoginPage({ tenantSlug }: { tenantSlug?: string }) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tenant, setTenant] = useState<LoginTenant | null>(null);
  const [tenantLoading, setTenantLoading] = useState(Boolean(tenantSlug));
  const [tenantNotFound, setTenantNotFound] = useState(false);
  const navigate = useNavigate();
  const { companyName, logoUrl } = useCompanySettings(tenantSlug ? null : undefined);
  const displayedCompanyName = tenantSlug ? tenant?.name ?? "AUREX ERP" : companyName;

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

      // La journalisation ne doit jamais bloquer l'accès d'un compte authentifié.
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
    <div className="grid grid-cols-1 md:grid-cols-2 h-[100dvh] w-full bg-slate-50">
      {/* Left Panel: Marketing */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-900 to-indigo-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />

        <div className="relative z-10">
          <h1 className="text-4xl font-bold tracking-tight mb-6">
            Gérez votre activité avec
            <br />
            <span className="text-blue-400">l'excellence opérationnelle</span>
          </h1>
          <p className="text-blue-100 text-lg mb-12 max-w-md">
            Une solution ERP complète pour piloter vos achats, ventes, fournisseurs et services avec
            une intelligence intégrée.
          </p>

          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <BarChart3 className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold">Rapports en temps réel</h3>
                <p className="text-sm text-blue-200">
                  Prenez des décisions basées sur des données précises.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold">Sécurité robuste</h3>
                <p className="text-sm text-blue-200">Protection avancée de vos données métier.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <Zap className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold">Flux optimisés</h3>
                <p className="text-sm text-blue-200">
                  Automatisez vos processus pour gagner en productivité.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-blue-300/60">
          © {new Date().getFullYear()} {displayedCompanyName || "AUREX ERP"}. Tous droits réservés.
        </div>
      </div>

      {/* Right Panel: Login Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[420px] bg-white p-10 rounded-[32px] shadow-xl border border-slate-100"
        >
          {/* Logo & Branding */}
          <div className="flex flex-col items-center mb-10">
            {tenantLoading ? (
              <Skeleton className="h-20 w-20 mb-4 rounded-3xl" />
            ) : tenant?.logo_url || (!tenantSlug && logoUrl) ? (
              <img
                src={tenant?.logo_url ?? logoUrl ?? undefined}
                alt={tenant?.name ?? companyName}
                className="max-w-[220px] h-auto mb-4 object-contain"
              />
            ) : (
              <div className="h-20 w-20 mb-4 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                A
              </div>
            )}
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {tenantSlug ? "AUREX ERP" : companyName || "AUREX ERP"}
            </h2>
            {tenantLoading ? (
              <Skeleton className="h-4 w-48 mt-2" />
            ) : (
              <p
                className={`text-sm mt-1 ${
                  tenantNotFound ? "text-red-600 font-medium" : "text-slate-500"
                }`}
              >
                {tenantNotFound
                  ? "Espace entreprise introuvable"
                  : tenant
                    ? `Espace ${tenant.name}`
                    : "Connectez-vous à votre espace"}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit(handleLogin)} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-semibold uppercase text-slate-500 tracking-wider"
              >
                Adresse e-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  className="pl-9 h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-blue-500 transition-colors"
                  placeholder="nom@entreprise.com"
                  disabled={tenantLoading || tenantNotFound}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase text-slate-500 tracking-wider"
                >
                  Mot de passe
                </Label>
                <a href="#" className="text-xs text-blue-600 hover:underline font-medium">
                  Oublié ?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pl-9 pr-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                  disabled={tenantLoading || tenantNotFound}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed"
                  disabled={tenantLoading || tenantNotFound}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-white font-semibold shadow-md shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 transition-all duration-200 mt-2"
              disabled={loading || tenantLoading || tenantNotFound}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Se connecter"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
