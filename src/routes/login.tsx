import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Building2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginCard } from "@/components/auth/LoginCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORM_BRANDING } from "@/config/branding";
import { supabase } from "@/integrations/supabase/client";
import {
  getAuthenticatedDestination,
  getLoginTenantBranding,
} from "@/lib/partner-admin.server";
import { profileBelongsToTenant } from "@/lib/tenant-login-access";

const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

type LoginValues = z.infer<typeof loginSchema>;
type LoginTenant = { id: string; name: string; logoUrl: string | null };

const loginInputClassName =
  "login-field h-[60px] rounded-2xl border-slate-300 bg-white pl-12 pr-12 text-sm text-slate-900 caret-slate-900 shadow-sm shadow-slate-100 transition-all duration-200 placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-[#0F5BFF] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:caret-white dark:shadow-none dark:placeholder:text-slate-400 dark:hover:border-slate-500 dark:focus-visible:border-blue-400 dark:focus-visible:bg-slate-900 dark:focus-visible:ring-blue-400/20";

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

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) throw redirect({ to: await getAuthenticatedDestination() });
  },
});

export function LoginPage({ tenantSlug }: { tenantSlug?: string }) {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tenant, setTenant] = useState<LoginTenant | null>(null);
  const [tenantLoading, setTenantLoading] = useState(Boolean(tenantSlug));
  const [tenantNotFound, setTenantNotFound] = useState(false);
  const navigate = useNavigate();

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
      let data: LoginTenant | null = null;
      let error: unknown = null;
      try {
        data = await getLoginTenantBranding({ data: { slug: tenantSlug } });
      } catch (brandingError) {
        error = brandingError;
      }
      if (!active) return;
      if (error) console.error("Impossible de récupérer l’espace demandé :", error);
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

        if (profileError || !profileBelongsToTenant(profile?.tenant_id, tenant.id)) {
          await supabase.auth.signOut();
          void logConnectionAttempt(values.email, "failure");
          throw new Error("Ce compte n’appartient pas à cet espace.");
        }
      }

      void logConnectionAttempt(values.email, "success", data.user.id);
      await navigate({ to: await getAuthenticatedDestination(), replace: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading || googleLoading) return;

    setGoogleLoading(true);
    try {
      const redirectUrl = new URL(window.location.href);
      redirectUrl.search = "";
      redirectUrl.hash = "";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl.toString() },
      });

      if (error) throw error;
    } catch {
      toast.error("Impossible de continuer avec Google pour le moment.");
      setGoogleLoading(false);
    }
  };

  const companyName = tenant?.name ?? PLATFORM_BRANDING.name;
  return (
    <AuthLayout
      icon={Building2}
      title={tenant ? `Espace ${tenant.name}` : "Portail ERP"}
      subtitle={
        tenant
          ? `Accédez à l’espace sécurisé et dédié de ${tenant.name}.`
          : "Accédez à vos outils de gestion depuis votre espace sécurisé et dédié."
      }
      badge={tenantSlug ? "Espace entreprise" : "ERP intelligent"}
      logo={
        tenantLoading
          ? undefined
          : (tenant?.logoUrl ?? PLATFORM_BRANDING.assets.logo)
      }
      logoAlt={tenant ? `Logo ${tenant.name}` : PLATFORM_BRANDING.alt}
      backLink={tenantSlug ? { href: "/login", label: "Retour" } : undefined}
      premium
      showSecurityFooter={false}
      compactMobile
    >
      <LoginCard
        title="Connexion"
        description="Accédez à votre espace de travail sécurisé."
        emailRegistration={register("email")}
        passwordRegistration={register("password")}
        emailError={errors.email}
        passwordError={errors.password}
        submitting={loading}
        disabled={tenantLoading || tenantNotFound}
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword((visible) => !visible)}
        onSubmit={handleSubmit(handleLogin)}
        emailId={tenantSlug ? "tenant-email" : "email"}
        passwordId={tenantSlug ? "tenant-password" : "password"}
        emailPlaceholder="nom@entreprise.com"
        inputClassName={loginInputClassName}
        logo={
          tenantLoading
            ? undefined
            : (tenant?.logoUrl ?? PLATFORM_BRANDING.assets.logo)
        }
        logoAlt={tenant ? `Logo ${companyName}` : PLATFORM_BRANDING.alt}
        headerContent={
          tenantLoading ? (
            <Skeleton className="mx-auto mb-4 h-[118px] w-[118px] rounded-2xl" />
          ) : undefined
        }
        footer={
          <div className="space-y-3">
            <div className="mt-4 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-slate-300/90 dark:bg-slate-600/90" />
              <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
                ou
              </span>
              <span className="h-px flex-1 bg-slate-300/90 dark:bg-slate-600/90" />
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading || tenantLoading || tenantNotFound}
              className="inline-flex h-[60px] w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-hidden="true" />
              ) : (
                <GoogleIcon className="h-5 w-5" />
              )}
              <span>{googleLoading ? "Connexion..." : "Continuer avec Google"}</span>
            </button>
          </div>
        }
        premium
      />
    </AuthLayout>
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
