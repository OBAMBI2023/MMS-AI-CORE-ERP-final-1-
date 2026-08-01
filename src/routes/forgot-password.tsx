import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPasswordRecoveryEmail } from "@/lib/password-recovery.server";

const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const sendResetEmail = async ({ email }: ForgotPasswordValues) => {
    setSubmitting(true);
    try {
      await sendPasswordRecoveryEmail({ data: { email } });
    } catch (error) {
      console.error("Impossible d’envoyer l’e-mail de réinitialisation :", error);
    } finally {
      setSubmitted(true);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      icon={KeyRound}
      title="Mot de passe oublié"
      subtitle="Recevez un lien sécurisé pour choisir un nouveau mot de passe."
      badge="Récupération de compte"
      backLink={{ href: "/login", label: "Retour à la connexion" }}
      premium
    >
      <Card className="w-full rounded-[28px] border border-white/70 bg-white/[0.96] shadow-[0_32px_90px_rgba(0,8,35,0.38)] dark:border-slate-700/80 dark:bg-slate-950/[0.96]">
        <CardHeader className="px-6 pb-5 pt-8 text-center sm:px-10">
          <CardTitle className="text-2xl text-slate-950 dark:text-white">
            Réinitialiser votre accès
          </CardTitle>
          <CardDescription className="mt-2 leading-6 dark:text-slate-300">
            Saisissez l’adresse e-mail associée à votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 sm:px-10">
          {submitted ? (
            <div role="status" className="space-y-6 text-center">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                Si un compte correspond à cette adresse, un lien de réinitialisation vient d’être
                envoyé.
              </div>
              <a href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F5BFF] hover:underline dark:text-blue-400">
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit(sendResetEmail)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="dark:text-slate-200">Adresse e-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <Input
                    {...register("email")}
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    className="h-13 rounded-2xl pl-11 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "reset-email-error" : undefined}
                    disabled={submitting}
                  />
                </div>
                {errors.email && <p id="reset-email-error" role="alert" className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="h-13 w-full rounded-2xl bg-[#0F5BFF] font-semibold text-white hover:bg-[#0B4FDF]" disabled={submitting}>
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Envoyer le lien"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
