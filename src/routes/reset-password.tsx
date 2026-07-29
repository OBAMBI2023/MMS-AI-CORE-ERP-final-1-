import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  clearPasswordRecoveryContext,
  hasValidPasswordRecoverySession,
} from "@/integrations/supabase/password-recovery";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmation: z.string(),
  })
  .refine((values) => values.password === values.confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmation"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [checkingLink, setCheckingLink] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setCheckingLink(false);
    }, 5000);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setValidSession(true);
        setCheckingLink(false);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setValidSession(hasValidPasswordRecoverySession() && Boolean(data.session));
      setCheckingLink(false);
    });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async ({ password }: ResetPasswordValues) => {
    setSubmitting(true);
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setServerError("Ce lien est invalide ou a expiré. Demandez un nouveau lien.");
      return;
    }

    await supabase.auth.signOut();
    clearPasswordRecoveryContext();
    setCompleted(true);
  };

  return (
    <AuthLayout
      icon={KeyRound}
      title="Nouveau mot de passe"
      subtitle="Choisissez un nouveau mot de passe pour sécuriser votre compte."
      badge="Récupération de compte"
      backLink={{ href: "/login", label: "Retour à la connexion" }}
      premium
    >
      <Card className="w-full rounded-[28px] border border-white/70 bg-white/[0.96] shadow-[0_32px_90px_rgba(0,8,35,0.38)] dark:border-slate-700/80 dark:bg-slate-950/[0.96]">
        <CardHeader className="px-6 pb-5 pt-8 text-center sm:px-10">
          <CardTitle className="text-2xl text-slate-950 dark:text-white">
            Définir un nouveau mot de passe
          </CardTitle>
          <CardDescription className="mt-2 leading-6 dark:text-slate-300">
            Utilisez au moins 8 caractères.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 sm:px-10">
          {checkingLink ? (
            <div role="status" className="flex justify-center py-8 text-slate-500 dark:text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin" aria-label="Vérification du lien" />
            </div>
          ) : completed ? (
            <div role="status" className="space-y-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                Votre mot de passe a été modifié. Vous pouvez maintenant vous reconnecter.
              </p>
              <Button type="button" className="h-12 w-full rounded-2xl bg-[#0F5BFF]" onClick={() => navigate({ to: "/login", replace: true })}>
                Se connecter
              </Button>
            </div>
          ) : !validSession ? (
            <div role="alert" className="space-y-5 text-center">
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                Ce lien est invalide ou a expiré. Demandez un nouveau lien de réinitialisation.
              </p>
              <a href="/forgot-password" className="text-sm font-semibold text-[#0F5BFF] hover:underline dark:text-blue-400">
                Demander un nouveau lien
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit(updatePassword)} className="space-y-5">
              {(["password", "confirmation"] as const).map((field, index) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field} className="dark:text-slate-200">
                    {index === 0 ? "Nouveau mot de passe" : "Confirmer le mot de passe"}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                    <Input
                      {...register(field)}
                      id={field}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="h-13 rounded-2xl pl-11 pr-11 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      aria-invalid={Boolean(errors[field])}
                      aria-describedby={errors[field] ? `${field}-error` : undefined}
                      disabled={submitting}
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={showPassword ? "Masquer les mots de passe" : "Afficher les mots de passe"}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors[field] && <p id={`${field}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400">{errors[field]?.message}</p>}
                </div>
              ))}
              {serverError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{serverError}</p>}
              <Button type="submit" className="h-13 w-full rounded-2xl bg-[#0F5BFF] font-semibold text-white hover:bg-[#0B4FDF]" disabled={submitting}>
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enregistrer le mot de passe"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
