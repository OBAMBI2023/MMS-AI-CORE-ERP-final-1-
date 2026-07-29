import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORM_BRANDING } from "@/config/branding";

type LoginCardProps = {
  title: string;
  description: string;
  emailRegistration: UseFormRegisterReturn;
  passwordRegistration: UseFormRegisterReturn;
  emailError?: FieldError;
  passwordError?: FieldError;
  submitting: boolean;
  disabled?: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: () => void;
  emailId: string;
  passwordId: string;
  emailPlaceholder: string;
  inputClassName?: string;
  logo?: string;
  logoAlt?: string;
  headerContent?: ReactNode;
  footer?: ReactNode;
  premium?: boolean;
  forgotPasswordHref?: string;
};

export function LoginCard({
  title, description, emailRegistration, passwordRegistration, emailError, passwordError,
  submitting, disabled = false, showPassword, onTogglePassword, onSubmit, emailId,
  passwordId, emailPlaceholder, logo = PLATFORM_BRANDING.assets.logo,
  logoAlt = PLATFORM_BRANDING.alt, headerContent, footer,
  inputClassName, premium = false, forgotPasswordHref = "/forgot-password",
}: LoginCardProps) {
  const inputsDisabled = submitting || disabled;

  if (premium) {
    return (
      <Card className="w-full rounded-[28px] border border-white/70 bg-white/[0.96] shadow-[0_32px_90px_rgba(0,8,35,0.38)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-950/[0.96]">
        <CardHeader className="space-y-0 px-6 pb-5 pt-7 text-center sm:px-10 sm:pt-9">
          <div className="mb-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F5BFF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0F5BFF] shadow-[0_0_0_4px_rgba(15,91,255,.12)]" />
              ERP SaaS
            </span>
          </div>
          {headerContent ?? (
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12, duration: 0.4 }}
              src={logo}
              alt={logoAlt}
              className="mx-auto mb-5 h-[108px] w-auto max-w-[255px] object-contain"
            />
          )}
          <CardTitle className="text-[28px] font-semibold tracking-[-0.025em] text-slate-950 dark:text-white">{title}</CardTitle>
          <CardDescription className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</CardDescription>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Connectez-vous à votre espace de travail sécurisé.
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-7 sm:px-10 sm:pb-9">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={emailId} className="text-sm font-medium text-slate-700 dark:text-slate-200">Adresse e-mail</Label>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-slate-500 transition-colors duration-200 group-focus-within:text-[#0F5BFF] dark:text-slate-400 dark:group-focus-within:text-blue-400" aria-hidden="true" />
                <Input {...emailRegistration} id={emailId} type="email" autoComplete="email" placeholder={emailPlaceholder} className={inputClassName} aria-invalid={Boolean(emailError)} aria-describedby={emailError ? `${emailId}-error` : undefined} disabled={inputsDisabled} />
              </div>
              {emailError && <p id={`${emailId}-error`} role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">{emailError.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor={passwordId} className="text-sm font-medium text-slate-700 dark:text-slate-200">Mot de passe</Label>
                <a href={forgotPasswordHref} className="text-xs font-semibold text-[#0F5BFF] transition-colors hover:text-blue-700 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-blue-400 dark:hover:text-blue-300">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-slate-500 transition-colors duration-200 group-focus-within:text-[#0F5BFF] dark:text-slate-400 dark:group-focus-within:text-blue-400" aria-hidden="true" />
                <Input {...passwordRegistration} id={passwordId} type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" className={inputClassName} aria-invalid={Boolean(passwordError)} aria-describedby={passwordError ? `${passwordId}-error` : undefined} disabled={inputsDisabled} />
                <button type="button" onClick={onTogglePassword} className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-slate-400 dark:hover:text-white" disabled={inputsDisabled} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
              {passwordError && <p id={`${passwordId}-error`} role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">{passwordError.message}</p>}
            </div>
            <div className="flex items-center justify-between py-0.5">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#0F5BFF] accent-[#0F5BFF] focus:ring-blue-500/20" />
                Se souvenir de moi
              </label>
              <ShieldCheck className="h-[18px] w-[18px] text-emerald-500" aria-label="Connexion sécurisée" />
            </div>
            <Button type="submit" className="group mt-1 h-13 w-full rounded-2xl bg-gradient-to-r from-[#0F5BFF] to-[#3478FF] font-semibold text-white shadow-[0_12px_26px_rgba(15,91,255,0.26)] transition-all duration-300 hover:-translate-y-0.5 hover:from-[#0B4FDF] hover:to-[#2468ED] hover:shadow-[0_16px_32px_rgba(15,91,255,0.34)] active:translate-y-0" disabled={inputsDisabled}>
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Se connecter
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </form>
          {footer}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-slate-200/80 shadow-xl shadow-slate-200/60">
      <CardHeader className="space-y-3 pb-6 text-center">
        {headerContent ?? <img src={logo} alt={logoAlt} className="mx-auto h-20 w-auto max-w-[190px] object-contain lg:hidden" />}
        <CardTitle className="text-2xl text-slate-900">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={emailId}>Adresse e-mail</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input {...emailRegistration} id={emailId} type="email" autoComplete="email" placeholder={emailPlaceholder} className="h-12 pl-11" disabled={inputsDisabled} />
            </div>
            {emailError && <p className="text-xs text-red-600">{emailError.message}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor={passwordId}>Mot de passe</Label>
              <a href={forgotPasswordHref} className="text-xs font-semibold text-[#0F5BFF] hover:underline">
                Mot de passe oublié ?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input {...passwordRegistration} id={passwordId} type={showPassword ? "text" : "password"} autoComplete="current-password" className="h-12 pl-11 pr-11" disabled={inputsDisabled} />
              <button type="button" onClick={onTogglePassword} className="absolute right-4 top-1/2 -translate-y-1/2 rounded text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" disabled={inputsDisabled} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordError && <p className="text-xs text-red-600">{passwordError.message}</p>}
          </div>
          <Button type="submit" className="h-12 w-full bg-[#0F5BFF] font-semibold hover:bg-[#084bd8]" disabled={inputsDisabled}>
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Se connecter"}
          </Button>
        </form>
        {footer}
      </CardContent>
    </Card>
  );
}
