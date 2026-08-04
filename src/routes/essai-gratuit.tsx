import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Building2, Clock, KeyRound, Layers, Lock, Mail, Phone, ShieldCheck, Sparkles, User, Zap } from "lucide-react";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTrialWorkspace } from "@/lib/trial-signup.server";
import { supabase } from "@/integrations/supabase/client";
import { readEnvVar } from "@/integrations/supabase/env";
import { ERP_PACK_CODES, type ErpPackCode } from "@/lib/public-trial-policy";
import { PLATFORM_BRANDING } from "@/config/branding";
import { BrandLogo } from "@/components/branding/BrandLogo";

export const Route = createFileRoute("/essai-gratuit")({ component: TrialSignupPage });

const packLabels: Record<ErpPackCode, string> = { commerce: "Commerce", services: "Services", restaurant: "Restaurant", complet: "Complet" };

const fieldClass = "h-12 rounded-xl border-slate-200 bg-white pl-11 text-[15px] shadow-none transition-all duration-200 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/15";
const triggerClass = "relative h-12 rounded-xl border-slate-200 bg-white pl-11 text-[15px] shadow-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15";
const iconClass = "pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400";

const benefits = [
  { icon: Clock, text: "7 jours d'accès complet, sans engagement" },
  { icon: Zap, text: "Espace de travail prêt en quelques secondes" },
  { icon: ShieldCheck, text: "Données hébergées et protégées en continu" },
  { icon: Layers, text: "Modules ERP ou Hôtel selon votre activité" },
] as const;

function TrialSignupPage() {
  const navigate = useNavigate(); const turnstile = useRef<TurnstileHandle>(null);
  const [busy,setBusy]=useState(false); const [token,setToken]=useState("");
  const [form,setForm]=useState({companyName:"",adminName:"",platformType:"ERP" as "ERP"|"HOTEL",packCode:"commerce" as ErpPackCode,email:"",phone:"",password:"",confirmation:"",termsAccepted:false});
  const field=(key:keyof typeof form)=>(e:React.ChangeEvent<HTMLInputElement>)=>setForm(v=>({...v,[key]:e.target.value}));
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);try{
    const result=await createTrialWorkspace({data:{...form,termsAccepted:form.termsAccepted as true,turnstileToken:token}});
    await supabase.auth.setSession({access_token:result.accessToken,refresh_token:result.refreshToken});
    await navigate({to:result.platformType==="HOTEL"?"/hotel":"/app",replace:true});
  }catch(error){toast.error(error instanceof Error?error.message:"Impossible d’envoyer la demande.");turnstile.current?.reset();setToken("");}finally{setBusy(false)}};
  const siteKey=readEnvVar("VITE_TURNSTILE_SITE_KEY") ?? "";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:py-14">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-stretch lg:gap-0 lg:overflow-hidden lg:rounded-[28px] lg:shadow-[0_30px_80px_-20px_rgba(11,31,77,0.35)]">

        {/* Form column — shown first on mobile */}
        <section className="order-1 rounded-[28px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_20px_60px_-15px_rgba(11,31,77,0.15)] backdrop-blur-xl sm:p-8 lg:order-2 lg:rounded-none lg:border-0 lg:p-12 lg:shadow-none">
          <div className="mx-auto max-w-md">
            <BrandLogo context="header" className="lg:hidden" />
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Créer votre espace d’essai</h1>
            <p className="mt-1.5 text-sm text-slate-500">Accédez immédiatement à votre plateforme pendant 7 jours.</p>

            <form onSubmit={submit} className="mt-7 space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Votre entreprise</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <Building2 className={iconClass} aria-hidden="true" />
                    <Input id="companyName" aria-label="Entreprise" placeholder="Nom de l’entreprise" value={form.companyName} onChange={field("companyName")} required className={fieldClass} />
                  </div>
                  <div className="relative">
                    <User className={iconClass} aria-hidden="true" />
                    <Input id="adminName" aria-label="Administrateur" placeholder="Nom de l’administrateur" value={form.adminName} onChange={field("adminName")} required className={fieldClass} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Vos accès</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <Mail className={iconClass} aria-hidden="true" />
                    <Input id="email" type="email" aria-label="E-mail" placeholder="E-mail" value={form.email} onChange={field("email")} required className={fieldClass} />
                  </div>
                  <div className="relative">
                    <Phone className={iconClass} aria-hidden="true" />
                    <Input id="phone" aria-label="Téléphone" placeholder="Téléphone" value={form.phone} onChange={field("phone")} required className={fieldClass} />
                  </div>
                </div>

                <Select value={form.platformType} onValueChange={platformType=>setForm(v=>({...v,platformType:platformType as "ERP"|"HOTEL"}))}>
                  <SelectTrigger className={triggerClass} aria-label="Plateforme">
                    <Layers className={iconClass} aria-hidden="true" />
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ERP">ERP Entreprise</SelectItem>
                    <SelectItem value="HOTEL">Hôtel &amp; Résidences</SelectItem>
                  </SelectContent>
                </Select>

                {form.platformType==="ERP" && (
                  <Select value={form.packCode} onValueChange={packCode=>setForm(v=>({...v,packCode:packCode as ErpPackCode}))}>
                    <SelectTrigger className={triggerClass} aria-label="Pack de modules">
                      <Sparkles className={iconClass} aria-hidden="true" />
                      <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                      {ERP_PACK_CODES.map(code=><SelectItem key={code} value={code}>{packLabels[code]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Sécurité</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <Lock className={iconClass} aria-hidden="true" />
                    <Input id="password" type="password" aria-label="Mot de passe" placeholder="Mot de passe" minLength={8} value={form.password} onChange={field("password")} required className={fieldClass} />
                  </div>
                  <div className="relative">
                    <KeyRound className={iconClass} aria-hidden="true" />
                    <Input id="confirmation" type="password" aria-label="Confirmation du mot de passe" placeholder="Confirmation" value={form.confirmation} onChange={field("confirmation")} required className={fieldClass} />
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-sm text-slate-600">
                <Checkbox checked={form.termsAccepted} onCheckedChange={checked=>setForm(v=>({...v,termsAccepted:checked===true}))} className="mt-0.5"/>
                <span>J’accepte les conditions d’utilisation.</span>
              </label>

              <div>{siteKey?<Turnstile ref={turnstile} siteKey={siteKey} onTokenChange={setToken}/>:<p className="text-sm text-destructive">Le contrôle anti-robot n’est pas configuré.</p>}</div>

              <Button
                disabled={busy||!token||!form.termsAccepted}
                className="group h-14 w-full rounded-2xl bg-gradient-to-r from-[#0B1F4D] to-blue-600 text-[15px] font-bold text-white shadow-[0_16px_32px_-10px_rgba(11,31,77,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-10px_rgba(11,31,77,0.55)] active:translate-y-0"
              >
                {busy?"Création…":(
                  <span className="flex items-center justify-center gap-2">
                    Démarrer mon essai de 7 jours
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </section>

        {/* Marketing column — shown after the form on mobile */}
        <aside className="order-2 flex flex-col justify-between rounded-[28px] bg-[#0B1F4D] p-8 text-white sm:p-10 lg:order-1 lg:rounded-none lg:p-11">
          <BrandLogo context="login" className="hidden self-start lg:flex" />
          <div className="lg:my-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-blue-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Essai gratuit
            </span>
            <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              {PLATFORM_BRANDING.productName}, prêt en un instant.
            </h2>
            <ul className="mt-6 space-y-4">
              {benefits.map(({icon:Icon,text})=>(
                <li key={text} className="flex items-center gap-3 text-sm text-blue-100/85">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
                    <Icon className="h-4 w-4 text-blue-200" aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-8 flex items-center gap-2 text-xs text-blue-100/50 lg:mt-0">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            Accès protégé par Supabase Auth
          </p>
        </aside>
      </div>
    </main>
  );
}
