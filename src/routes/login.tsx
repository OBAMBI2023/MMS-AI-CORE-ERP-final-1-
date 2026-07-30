import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
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
    if (session) throw redirect({ to: await getAuthenticatedHome() });
  },
});

export function LoginPage({ tenantSlug }: { tenantSlug?: string }) {
  const [loading, setLoading] = useState(false);
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
      await navigate({ to: tenantSlug ? "/app" : await getAuthenticatedHome(), replace: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
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
            <Skeleton className="mx-auto mb-4 h-24 w-24 rounded-2xl" />
          ) : undefined
        }
        premium
      />
    </AuthLayout>
  );
}
