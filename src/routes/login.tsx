import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, Loader2, BarChart3, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { Checkbox } from "@/components/ui/checkbox";

const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

type LoginValues = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      throw redirect({ to: "/" });
    }
  },
});

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { companyName, logoUrl } = useCompanySettings();

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
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Left Panel: Gradient Blue */}
      <div className="hidden lg:flex w-[45%] bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] text-white p-16 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-24">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={companyName}
                className="h-12 w-12 object-contain bg-white rounded-2xl p-1"
              />
            )}
            <span className="text-2xl font-bold tracking-tight">{companyName || "ERP Premium"}</span>
          </div>
          <h1 className="text-5xl font-extrabold mb-8 leading-tight">
            Pilotez votre entreprise <br /> <span className="text-[#60A5FA]">avec précision</span>.
          </h1>
          <p className="text-blue-50 text-lg mb-16 max-w-md">
            Centralisez vos opérations, optimisez vos ressources et prenez de meilleures décisions grâce à votre ERP.
          </p>

          <div className="space-y-6">
            {[
              { icon: Zap, title: "Tableau de bord intelligent" },
              { icon: ShieldCheck, title: "Données sécurisées" },
              { icon: BarChart3, title: "Performance optimale" },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                  <feature.icon className="w-6 h-6 text-[#60A5FA]" />
                </div>
                <span className="text-lg font-medium">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md bg-white p-10 rounded-[24px] shadow-2xl border border-slate-100"
        >
          <div className="flex flex-col items-center mb-10">
            {logoUrl && <img src={logoUrl} alt={companyName} className="h-16 w-16 mb-6" />}
            <h2 className="text-3xl font-bold text-slate-950 mb-2">Bienvenue</h2>
            <p className="text-slate-500 text-center">Connectez-vous à votre espace ERP</p>
          </div>

          <form onSubmit={handleSubmit(handleLogin)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  className="pl-10 h-12 rounded-xl"
                  placeholder="nom@entreprise.com"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Mot de passe</Label>
                <a href="#" className="text-sm text-[#2563EB] hover:underline">Mot de passe oublié ?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <Input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pl-10 pr-10 h-12 rounded-xl"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="cursor-pointer">Se souvenir de moi</Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-white font-semibold shadow-lg bg-gradient-to-r from-[#2563EB] to-[#60A5FA] hover:from-[#1E3A8A] hover:to-[#2563EB]"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Se connecter"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
