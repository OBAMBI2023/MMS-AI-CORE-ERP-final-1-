import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Handshake } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginCard } from "@/components/auth/LoginCard";
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedDestination } from "@/lib/partner-admin.server";

const schema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/partner-login")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) throw redirect({ to: await getAuthenticatedDestination() });
  },
  component: PartnerLoginPage,
});

function PartnerLoginPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) throw error;
      await navigate({ to: await getAuthenticatedDestination(), replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      icon={Handshake}
      title="Portail partenaires"
      subtitle="Accédez aux entreprises qui vous sont confiées depuis un espace sécurisé et dédié."
    >
      <LoginCard
        title="Connexion partenaire"
        description="Utilisez les identifiants de votre compte partenaire."
        emailRegistration={register("email")}
        passwordRegistration={register("password")}
        emailError={errors.email}
        passwordError={errors.password}
        submitting={submitting}
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword((visible) => !visible)}
        onSubmit={handleSubmit(onSubmit)}
        emailId="partner-email"
        passwordId="partner-password"
        emailPlaceholder="partenaire@entreprise.com"
      />
    </AuthLayout>
  );
}
