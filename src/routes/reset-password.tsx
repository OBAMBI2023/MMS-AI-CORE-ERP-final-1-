import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  cleanPasswordRecoveryUrl,
  clearPasswordRecoveryContext,
  handlePasswordRecoveryCallback,
  hasValidPasswordRecoverySession,
} from "@/integrations/supabase/password-recovery";
import { sendPasswordRecoveryEmail } from "@/lib/password-recovery.server";

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
  const [tenantLoginPath, setTenantLoginPath] = useState("/login");
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendComplete, setResendComplete] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    let active = true;

    const verifySession = async (source: "initial" | "SIGNED_IN" | "PASSWORD_RECOVERY") => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (!active) return;

      const validRecoveryContext = hasValidPasswordRecoverySession();
      console.info("[PasswordSetup] Vérification de la session temporaire", {
        source,
        hasSession: Boolean(session),
        validRecoveryContext,
        error: error?.message,
      });
      setValidSession(Boolean(session) && validRecoveryContext);
      setCheckingLink(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) {
        void verifySession(event);
      }
    });

    void (async () => {
      const result = await handlePasswordRecoveryCallback();
      if (!active) return;
      // A clean reload has no callback, but retains both the verified Supabase
      // session and the tab-scoped recovery marker.
      await verifySession("initial");
      if (result === "invalid" && active) {
        setValidSession(false);
        setCheckingLink(false);
      }
    })();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const resendRecoveryEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResending(true);
    setResendError(null);

    const email = resendEmail.trim();
    if (!z.string().email().safeParse(email).success) {
      setResendError("Saisissez une adresse e-mail valide.");
      setResending(false);
      return;
    }

    try {
      await sendPasswordRecoveryEmail({ data: { email } });
    } catch (error) {
      console.error("[PasswordSetup] Échec du renvoi du lien :", error);
      setResendError("Le lien n’a pas pu être envoyé. Réessayez dans quelques instants.");
      setResending(false);
      return;
    }

    setResendComplete(true);
    setResending(false);
  };

  const updatePassword = async ({ password }: ResetPasswordValues) => {
    setSubmitting(true);
    setServerError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session || !hasValidPasswordRecoverySession()) {
      console.warn("[PasswordSetup] Mise à jour refusée : session temporaire absente");
      setValidSession(false);
      setSubmitting(false);
      return;
    }

    console.info("[PasswordSetup] Mise à jour du mot de passe démarrée", {
      userId: session.user.id,
    });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      console.error("[PasswordSetup] Échec de mise à jour du mot de passe", {
        userId: session.user.id,
        message: error.message,
      });
      setServerError("Lien invalide ou expiré. Demandez une nouvelle invitation.");
      setSubmitting(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    let tenantSlug =
      typeof user?.user_metadata?.tenant_slug === "string"
        ? user.user_metadata.tenant_slug
        : null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("slug")
          .eq("id", profile.tenant_id)
          .maybeSingle();
        if (tenant?.slug) tenantSlug = tenant.slug;
      }
    }
    const { data: activation, error: activationError } = await (supabase as any).rpc(
      "activate_invited_tenant_after_password",
    );
    if (activationError) {
      console.error("[PasswordSetup] Échec de l’activation du tenant invité", activationError);
      setServerError("Le mot de passe est défini, mais l’activation du tenant a échoué.");
      setSubmitting(false);
      return;
    }
    if (activation?.activated) {
      cleanPasswordRecoveryUrl();
      clearPasswordRecoveryContext();
      setSubmitting(false);
      setCompleted(true);
      window.location.replace(activation.platformType === "HOTEL" ? "/hotel" : "/app");
      return;
    }
    const loginPath = tenantSlug ? `/login/${encodeURIComponent(tenantSlug)}` : "/login";
    setTenantLoginPath(loginPath);
    cleanPasswordRecoveryUrl();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.warn("[PasswordSetup] Échec de fermeture de la session temporaire", {
        message: signOutError.message,
      });
    }
    clearPasswordRecoveryContext();
    console.info("[PasswordSetup] Mot de passe défini, redirection vers la connexion", {
      loginPath,
    });
    setSubmitting(false);
    setCompleted(true);
    window.location.replace(loginPath);
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
              <Button type="button" className="h-12 w-full rounded-2xl bg-[#0F5BFF]" onClick={() => window.location.replace(tenantLoginPath)}>
                Se connecter
              </Button>
            </div>
          ) : !validSession ? (
            <div role="alert" className="space-y-5 text-center">
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                Lien invalide ou expiré. Demandez une nouvelle invitation.
              </p>
              {resendComplete ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                  Si un compte correspond à cette adresse, un nouveau lien vient d’être envoyé.
                </p>
              ) : (
                <form onSubmit={resendRecoveryEmail} className="space-y-3 text-left">
                  <Label htmlFor="resend-email" className="dark:text-slate-200">
                    Adresse e-mail
                  </Label>
                  <Input
                    id="resend-email"
                    type="email"
                    autoComplete="email"
                    value={resendEmail}
                    onChange={(event) => setResendEmail(event.target.value)}
                    disabled={resending}
                    required
                    className="h-12 rounded-2xl dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                  {resendError && <p className="text-sm text-red-600 dark:text-red-400">{resendError}</p>}
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-[#0F5BFF] font-semibold text-white hover:bg-[#0B4FDF]"
                    disabled={resending}
                  >
                    {resending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Envoyer un nouveau lien"}
                  </Button>
                </form>
              )}
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
