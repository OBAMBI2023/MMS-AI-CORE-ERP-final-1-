import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Eye, EyeOff, Loader2, Lock, Mail, Phone, UserRound } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarketingLayout } from "@/marketing/layouts/MarketingLayout";
import { supabase } from "@/integrations/supabase/client";
import { createTrialWorkspace } from "@/lib/trial-signup.server";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";

const signupSchema = z
  .object({
    companyName: z.string().trim().min(2, "Indiquez le nom de votre entreprise"),
    fullName: z.string().trim().min(2, "Indiquez votre nom complet"),
    email: z.string().trim().email("Adresse e-mail invalide"),
    phone: z.string().trim().min(6, "Numéro de téléphone invalide"),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["passwordConfirmation"],
  });

type SignupValues = z.infer<typeof signupSchema>;

export const Route = createFileRoute("/essai-gratuit")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) throw redirect({ to: "/app" });
  },
  component: TrialSignupPage,
});

function TrialSignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);
  const submissionInFlightRef = useRef(false);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const handleTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const handleSignup = async (values: SignupValues) => {
    if (submissionInFlightRef.current || !turnstileToken) return;

    submissionInFlightRef.current = true;
    const tokenForThisSubmission = turnstileToken;
    // Un token Turnstile est à usage unique : il est consommé dès le début de la requête.
    setTurnstileToken("");
    setLoading(true);
    try {
      const session = await createTrialWorkspace({
        data: {
          companyName: values.companyName,
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          password: values.password,
          turnstileToken: tokenForThisSubmission,
        },
      });

      const { error } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });
      if (error) {
        toast.success("Votre espace a été créé. Connectez-vous avec vos identifiants.");
        await navigate({ to: "/login", replace: true });
        return;
      }

      toast.success("Votre espace est prêt. Votre essai gratuit de 3 jours commence maintenant.");
      await navigate({ to: "/app", replace: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de créer votre espace. Aucune donnée n'a été conservée.";
      turnstileRef.current?.reset();
      toast.error(
        message.includes("timeout-or-duplicate")
          ? "La vérification anti-robot a expiré. Veuillez la refaire."
          : message,
      );
    } finally {
      submissionInFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <MarketingLayout>
      <section className="px-5 py-16 lg:px-8">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-blue-950/10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="bg-slate-950 p-8 text-white sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
              Essai gratuit 3 jours
            </p>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
              Créez votre espace entreprise.
            </h1>
            <p className="mt-4 leading-7 text-slate-300">
              Accédez immédiatement à AUREX ERP, sans données fictives et sans carte bancaire.
            </p>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              Votre compte est administrateur de votre espace. Vos utilisateurs, rôles et données
              restent isolés au sein de votre entreprise.
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <form onSubmit={handleSubmit(handleSignup)} className="space-y-5">
              <Field label="Entreprise" error={errors.companyName?.message}>
                <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  {...register("companyName")}
                  autoComplete="organization"
                  className="h-12 rounded-xl pl-9"
                  placeholder="Nom de votre entreprise"
                />
              </Field>
              <Field label="Nom de l'administrateur" error={errors.fullName?.message}>
                <UserRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  {...register("fullName")}
                  autoComplete="name"
                  className="h-12 rounded-xl pl-9"
                  placeholder="Nom de l'administrateur"
                />
              </Field>
              <Field label="Adresse e-mail" error={errors.email?.message}>
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  className="h-12 rounded-xl pl-9"
                  placeholder="nom@entreprise.com"
                />
              </Field>
              <Field label="Téléphone" error={errors.phone?.message}>
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  {...register("phone")}
                  type="tel"
                  autoComplete="tel"
                  className="h-12 rounded-xl pl-9"
                  placeholder="+212 6 00 00 00 00"
                />
              </Field>
              <Field label="Mot de passe" error={errors.password?.message}>
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="h-12 rounded-xl px-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-3.5 text-slate-400"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </Field>
              <Field
                label="Confirmation du mot de passe"
                error={errors.passwordConfirmation?.message}
              >
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  {...register("passwordConfirmation")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="h-12 rounded-xl pl-9"
                />
              </Field>
              {siteKey ? (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={siteKey}
                  onTokenChange={handleTurnstileToken}
                />
              ) : (
                <p role="alert" className="text-sm text-red-600">
                  La protection anti-robot n'est pas configurée.
                </p>
              )}
              <Button
                type="submit"
                disabled={loading || !turnstileToken}
                className="h-12 w-full rounded-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création en cours…
                  </>
                ) : (
                  "Créer mon espace gratuit"
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">{children}</div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
