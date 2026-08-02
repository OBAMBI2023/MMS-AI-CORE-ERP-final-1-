import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  LockKeyhole,
  ReceiptText,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { AppShell } from "@/components/mms/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORM_BRANDING } from "@/config/branding";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { configureCurrency } from "@/lib/mms/format";
import { useTenant } from "@/providers/TenantProvider";

type Parametres = Tables<"parametres">;
type CompanyForm = Pick<Parametres, "company_name" | "currency" | "rccm" | "tax_regime" | "logo_url">;

const BUCKET = "company-assets";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];

export const Route = createFileRoute("/parametres")({
  component: ParametresPage,
  head: () => ({
    meta: [
      { title: `Paramètres — ${PLATFORM_BRANDING.productName}` },
      { name: "description", content: "Informations et identité de votre entreprise." },
    ],
  }),
});

function formatError(error: unknown) {
  const value = error as { message?: string };
  return value?.message || "Une erreur inattendue est survenue.";
}

function ParametresPage() {
  const queryClient = useQueryClient();
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const [section, setSection] = useState<"company" | "roles">("company");
  const [form, setForm] = useState<CompanyForm | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["parametres", tenantId],
    enabled: !tenantLoading && Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) throw new Error("Aucun tenant associé à ce compte.");
      const { data, error } = await supabase
        .from("parametres")
        .select("id, company_name, currency, rccm, tax_regime, logo_url, decimals")
        .eq("tenant_id", tenantId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Les paramètres de ce tenant sont introuvables.");
      return data;
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setForm({
      company_name: settingsQuery.data.company_name,
      currency: settingsQuery.data.currency,
      rccm: settingsQuery.data.rccm,
      tax_regime: settingsQuery.data.tax_regime,
      logo_url: settingsQuery.data.logo_url,
    });
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: CompanyForm) => {
      if (!tenantId || !settingsQuery.data?.id) throw new Error("Tenant introuvable.");
      const payload = {
        company_name: values.company_name.trim(),
        currency: values.currency,
        rccm: values.rccm?.trim() || null,
        tax_regime: values.tax_regime?.trim() || null,
        logo_url: values.logo_url,
      };
      const { error } = await supabase
        .from("parametres")
        .update(payload)
        .eq("id", settingsQuery.data.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return payload;
    },
    onSuccess: async (saved) => {
      configureCurrency(saved.currency, settingsQuery.data?.decimals);
      await queryClient.invalidateQueries({ queryKey: ["parametres", tenantId] });
      toast.success("Informations de l’entreprise enregistrées");
    },
    onError: (error) => toast.error(formatError(error)),
  });

  const update = <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const loading = tenantLoading || settingsQuery.isLoading;

  return (
    <AppShell
      title="Paramètres"
      subtitle="Gérez les informations publiques de votre entreprise"
      actions={section === "company" && form ? (
        <Button
          className="gap-2"
          disabled={saveMutation.isPending || !form.company_name.trim()}
          onClick={() => saveMutation.mutate(form)}
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      ) : undefined}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex items-center gap-2 rounded-xl border bg-card p-1.5 shadow-sm">
          <NavButton active={section === "company"} onClick={() => setSection("company")} icon={<Building2 className="h-4 w-4" />}>
            Entreprise
          </NavButton>
          <NavButton active={section === "roles"} onClick={() => setSection("roles")} icon={<LockKeyhole className="h-4 w-4" />}>
            Rôles et permissions
            <Badge variant="secondary" className="ml-1 hidden rounded-full text-[10px] sm:inline-flex">Bientôt</Badge>
          </NavButton>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Chargement des paramètres…
          </div>
        ) : settingsQuery.error || !tenantId || !form ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
            {formatError(settingsQuery.error || new Error("Aucun tenant associé à ce compte."))}
          </div>
        ) : section === "company" ? (
          <CompanySection
            form={form}
            tenantId={tenantId}
            settingsId={settingsQuery.data!.id}
            update={update}
            onLogoSaved={(logoUrl) => saveMutation.mutate({ ...form, logo_url: logoUrl })}
          />
        ) : (
          <ComingSoon />
        )}
      </div>
    </AppShell>
  );
}

function NavButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors sm:flex-none ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      {icon}{children}
    </button>
  );
}

function CompanySection({ form, tenantId, settingsId, update, onLogoSaved }: {
  form: CompanyForm;
  tenantId: string;
  settingsId: string;
  update: <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => void;
  onLogoSaved: (path: string | null) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Panel title="Identité visuelle" description="Ce logo apparaîtra automatiquement sur vos documents." icon={<ImageIcon className="h-5 w-5" />}>
          <LogoUploader currentPath={form.logo_url} tenantId={tenantId} settingsId={settingsId} onChange={(path) => { update("logo_url", path); onLogoSaved(path); }} />
        </Panel>
        <Panel title="Informations de l’entreprise" description="Les informations légales et financières utilisées sur vos documents." icon={<Building2 className="h-5 w-5" />}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom de l’entreprise" required className="sm:col-span-2">
              <Input value={form.company_name} onChange={(event) => update("company_name", event.target.value)} placeholder="Nom de votre entreprise" />
            </Field>
            <Field label="Devise" required>
              <Select value={form.currency === "FCFA" ? "XOF" : form.currency} onValueChange={(value) => update("currency", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="XOF">Franc CFA (XOF)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="USD">Dollar américain (USD)</SelectItem>
                  <SelectItem value="GBP">Livre sterling (GBP)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="RCCM">
              <Input value={form.rccm ?? ""} onChange={(event) => update("rccm", event.target.value)} placeholder="CI-ABJ-01-2026-B00-00000" />
            </Field>
            <Field label="Régime d’imposition" className="sm:col-span-2">
              <Select value={form.tax_regime ?? "unset"} onValueChange={(value) => update("tax_regime", value === "unset" ? null : value)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un régime" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Non renseigné</SelectItem>
                  <SelectItem value="Réel normal">Réel normal</SelectItem>
                  <SelectItem value="Réel simplifié">Réel simplifié</SelectItem>
                  <SelectItem value="Taxe d’État de l’entreprenant">Taxe d’État de l’entreprenant</SelectItem>
                  <SelectItem value="Microentreprise">Microentreprise</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Panel>
      </div>
      <CompanyPreview form={form} />
    </div>
  );
}

function Panel({ title, description, icon, children }: { title: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border bg-card shadow-sm"><header className="flex gap-3 border-b px-5 py-4 sm:px-6"><div className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</div><div><h2 className="font-semibold">{title}</h2><p className="mt-0.5 text-sm text-muted-foreground">{description}</p></div></header><div className="p-5 sm:p-6">{children}</div></section>;
}

function Field({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}{required && <span className="ml-1 text-destructive">*</span>}</Label>{children}</div>;
}

function LogoUploader({ currentPath, tenantId, settingsId, onChange }: { currentPath: string | null; tenantId: string; settingsId: string; onChange: (path: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useSignedUrl(currentPath);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) return toast.error("Format non pris en charge. Utilisez PNG, JPG ou SVG.");
    if (file.size > MAX_FILE_SIZE) return toast.error("Le logo ne doit pas dépasser 2 Mo.");
    setBusy(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${tenantId}/logo/${settingsId}-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      onChange(path);
      if (currentPath) await supabase.storage.from(BUCKET).remove([currentPath]);
      toast.success(currentPath ? "Logo remplacé" : "Logo importé");
    } catch (error) { toast.error(formatError(error)); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!currentPath) return;
    setBusy(true);
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([currentPath]);
      if (error) throw error;
      onChange(null);
      toast.success("Logo supprimé");
    } catch (error) { toast.error(formatError(error)); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed bg-muted/20 p-6 sm:flex-row sm:text-left">
      <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background shadow-sm">
        {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : previewUrl ? <BrandLogo context="dashboard" src={previewUrl} alt="Logo de l’entreprise" /> : <Building2 className="h-9 w-9 text-muted-foreground/60" />}
      </div>
      <div className="flex-1 text-center sm:text-left"><p className="font-medium">Logo de l’entreprise</p><p className="mt-1 text-sm text-muted-foreground">PNG, JPG ou SVG · 2 Mo maximum</p><div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start"><Button type="button" variant="outline" size="sm" className="gap-2" disabled={busy} onClick={() => inputRef.current?.click()}><Upload className="h-4 w-4" />{currentPath ? "Remplacer" : "Importer"}</Button>{currentPath && <Button type="button" variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive" disabled={busy} onClick={remove}><Trash2 className="h-4 w-4" />Supprimer</Button>}</div></div>
      <input ref={inputRef} type="file" className="hidden" accept={ACCEPTED_TYPES.join(",")} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} />
    </div>
  );
}

function CompanyPreview({ form }: { form: CompanyForm }) {
  const logo = useSignedUrl(form.logo_url);
  const usages = [{ icon: FileText, label: "Factures PDF" }, { icon: ReceiptText, label: "Reçus" }, { icon: ShieldCheck, label: "Rapports" }, { icon: Building2, label: "Documents imprimés" }];
  return <aside className="h-fit overflow-hidden rounded-2xl border bg-card shadow-sm lg:sticky lg:top-6"><div className="h-24 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" /><div className="-mt-12 px-5 pb-5"><div className="flex size-24 items-center justify-center overflow-hidden rounded-2xl border bg-background p-2 shadow-sm">{logo ? <BrandLogo context="dashboard" src={logo} alt="Logo" /> : <Building2 className="h-9 w-9 text-muted-foreground" />}</div><h3 className="mt-4 truncate text-lg font-semibold">{form.company_name || "Votre entreprise"}</h3><p className="text-sm text-muted-foreground">{form.currency}{form.rccm ? ` · ${form.rccm}` : ""}</p><div className="my-5 h-px bg-border" /><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Utilisé automatiquement sur</p><ul className="space-y-3">{usages.map(({ icon: Icon, label }) => <li key={label} className="flex items-center gap-3 text-sm"><span className="rounded-lg bg-primary/10 p-1.5 text-primary"><Icon className="h-4 w-4" /></span>{label}<Check className="ml-auto h-4 w-4 text-emerald-600" /></li>)}</ul></div></aside>;
}

function ComingSoon() {
  return <section className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border bg-card px-6 text-center shadow-sm"><div className="mb-5 rounded-2xl bg-primary/10 p-4 text-primary"><LockKeyhole className="h-9 w-9" /></div><Badge variant="secondary" className="mb-3 rounded-full">Bientôt disponible</Badge><h2 className="text-xl font-semibold">Rôles et permissions</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Cette fonctionnalité sera disponible prochainement.</p></section>;
}
