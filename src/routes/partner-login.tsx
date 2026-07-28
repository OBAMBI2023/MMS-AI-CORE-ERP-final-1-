import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Handshake, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORM_BRANDING } from "@/config/branding";
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
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-950 px-5 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(15,91,255,0.28),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(37,99,235,0.16),transparent_34%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between bg-[#07113D] p-12 text-white lg:flex">
          <img
            src={PLATFORM_BRANDING.assets.logoDark}
            alt={PLATFORM_BRANDING.alt}
            className="h-14 w-auto max-w-[230px] self-start"
          />
          <div className="my-20">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/10">
              <Handshake className="h-7 w-7 text-blue-300" aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">Portail partenaires</h1>
            <p className="mt-4 max-w-md leading-7 text-blue-100/70">
              Accédez aux entreprises qui vous sont confiées depuis un espace sécurisé et dédié.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-100/50">
            <ShieldCheck className="h-4 w-4" />
            Accès protégé par Supabase Auth
          </div>
        </section>

        <section className="flex items-center bg-slate-50 p-6 sm:p-10 lg:p-12">
          <Card className="w-full border-slate-200/80 shadow-xl shadow-slate-200/60">
            <CardHeader className="space-y-3 pb-6 text-center">
              <img
                src={PLATFORM_BRANDING.assets.logoVertical}
                alt={PLATFORM_BRANDING.alt}
                className="mx-auto h-20 w-auto max-w-[190px] object-contain lg:hidden"
              />
              <CardTitle className="text-2xl text-slate-900">Connexion partenaire</CardTitle>
              <CardDescription>
                Utilisez les identifiants de votre compte partenaire.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="partner-email">Adresse e-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      {...register("email")}
                      id="partner-email"
                      type="email"
                      autoComplete="email"
                      placeholder="partenaire@entreprise.com"
                      className="h-12 pl-11"
                      disabled={submitting}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partner-password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      {...register("password")}
                      id="partner-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="h-12 pl-11 pr-11"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-[#0F5BFF] font-semibold hover:bg-[#084bd8]"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Se connecter"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
