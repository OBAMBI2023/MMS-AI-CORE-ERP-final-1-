import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginCard } from "@/components/auth/LoginCard";
import { restaurantSupabase } from "@/integrations/restaurant/restaurant-supabase-client";

const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

type LoginValues = z.infer<typeof loginSchema>;

async function logConnectionAttempt(email: string, status: "success" | "failure", userId?: string) {
  try {
    const { error } = await restaurantSupabase.rpc("log_connection_attempt", {
      p_email: email,
      p_status: status,
      ...(userId ? { p_user_id: userId } : {}),
    });
    if (error) console.error("Impossible de journaliser la tentative de connexion Restaurant :", error);
  } catch (error) {
    console.error("Impossible de journaliser la tentative de connexion Restaurant :", error);
  }
}

export const Route = createFileRoute("/restaurant/login")({
  component: RestaurantLoginPage,
});

function RestaurantLoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data } = await restaurantSupabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        await navigate({ to: "/restaurant", replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogin = async (values: LoginValues) => {
    setLoading(true);
    try {
      const { data, error } = await restaurantSupabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        void logConnectionAttempt(values.email, "failure");
        throw error;
      }

      void logConnectionAttempt(values.email, "success", data.user.id);
      await navigate({ to: "/restaurant", replace: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={Building2}
      title="Restaurant"
      subtitle="Accédez à votre espace Restaurant sécurisé."
      badge="Restaurant"
      premium
      showSecurityFooter={false}
      compactMobile
    >
      <LoginCard
        title="Connexion Restaurant"
        description="Accédez à votre espace de travail Restaurant."
        emailRegistration={register("email")}
        passwordRegistration={register("password")}
        emailError={errors.email}
        passwordError={errors.password}
        submitting={loading}
        disabled={false}
        showPassword={false}
        onTogglePassword={() => {}}
        onSubmit={handleSubmit(handleLogin)}
        emailId="restaurant-email"
        passwordId="restaurant-password"
        emailPlaceholder="nom@restaurant.com"
        logo={undefined}
        logoAlt="Restaurant"
        headerContent={
          loading ? <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-slate-500" /> : undefined
        }
        premium
      />
    </AuthLayout>
  );
}
