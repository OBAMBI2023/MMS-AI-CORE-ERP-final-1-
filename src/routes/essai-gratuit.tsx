import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTrialWorkspace } from "@/lib/trial-signup.server";
import { supabase } from "@/integrations/supabase/client";
import { readEnvVar } from "@/integrations/supabase/env";

export const Route = createFileRoute("/essai-gratuit")({ component: TrialSignupPage });

function TrialSignupPage() {
  const navigate = useNavigate(); const turnstile = useRef<TurnstileHandle>(null);
  const [busy,setBusy]=useState(false); const [token,setToken]=useState("");
  const [form,setForm]=useState({companyName:"",adminName:"",platformType:"ERP" as "ERP"|"HOTEL",email:"",phone:"",password:"",confirmation:"",termsAccepted:false});
  const field=(key:keyof typeof form)=>(e:React.ChangeEvent<HTMLInputElement>)=>setForm(v=>({...v,[key]:e.target.value}));
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);try{
    const result=await createTrialWorkspace({data:{...form,termsAccepted:form.termsAccepted as true,turnstileToken:token}});
    await supabase.auth.setSession({access_token:result.accessToken,refresh_token:result.refreshToken});
    await navigate({to:result.platformType==="HOTEL"?"/hotel":"/app",replace:true});
  }catch(error){toast.error(error instanceof Error?error.message:"Impossible d’envoyer la demande.");turnstile.current?.reset();setToken("");}finally{setBusy(false)}};
  const siteKey=readEnvVar("VITE_TURNSTILE_SITE_KEY") ?? "";
  return <main className="min-h-screen bg-muted/30 px-4 py-12"><Card className="mx-auto max-w-2xl"><CardHeader><CardTitle>Créer votre espace d’essai</CardTitle><p className="text-sm text-muted-foreground">Accédez immédiatement à votre plateforme pendant 7 jours.</p></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    {([["companyName","Entreprise"],["adminName","Administrateur"],["email","E-mail"],["phone","Téléphone"]] as const).map(([key,label])=><div key={key} className="space-y-2"><Label htmlFor={key}>{label}</Label><Input id={key} type={key==="email"?"email":"text"} value={form[key]} onChange={field(key)} required /></div>)}
    <div className="space-y-2 sm:col-span-2"><Label>Plateforme</Label><Select value={form.platformType} onValueChange={platformType=>setForm(v=>({...v,platformType:platformType as "ERP"|"HOTEL"}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ERP">ERP Entreprise</SelectItem><SelectItem value="HOTEL">Hôtel &amp; Résidences</SelectItem></SelectContent></Select></div>
    <div className="space-y-2"><Label htmlFor="password">Mot de passe</Label><Input id="password" type="password" minLength={8} value={form.password} onChange={field("password")} required /></div>
    <div className="space-y-2"><Label htmlFor="confirmation">Confirmation</Label><Input id="confirmation" type="password" value={form.confirmation} onChange={field("confirmation")} required /></div>
    <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox checked={form.termsAccepted} onCheckedChange={checked=>setForm(v=>({...v,termsAccepted:checked===true}))}/><span>J’accepte les conditions d’utilisation.</span></label>
    <div className="sm:col-span-2">{siteKey?<Turnstile ref={turnstile} siteKey={siteKey} onTokenChange={setToken}/>:<p className="text-sm text-destructive">Le contrôle anti-robot n’est pas configuré.</p>}</div>
    <Button className="sm:col-span-2" disabled={busy||!token||!form.termsAccepted}>{busy?"Création…":"Démarrer mon essai de 7 jours"}</Button>
  </form></CardContent></Card></main>;
}
