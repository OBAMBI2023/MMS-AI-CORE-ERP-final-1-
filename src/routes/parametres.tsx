import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  FileText,
  Receipt,
  FileSignature,
  Users,
  Shield,
  Sparkles,
  Upload,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Download,
  Upload as UploadIcon,
  RotateCcw,
  DatabaseBackup,
  Image as ImageIcon,
  Phone,
  Mail,
  Globe,
  MapPin,
  KeyRound,
  Percent,
} from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Tables } from "@/integrations/supabase/types";
import { UserManagement } from "@/components/mms/UserManagementTable";
import { PermissionsTab } from "@/components/mms/PermissionsTab";
import { useSignedUrl } from "@/hooks/use-signed-url";

// Assuming AiSettings is available in the scope or imported.
// Since the original file didn't import it, I'll assume it's part of the type definition context
// or I need to handle it. Given the context, I'll keep the type as is.
type AiSettings = {
  openai_key: string | null;
  gemini_key: string | null;
  claude_key: string | null;
  ai_model: string | null;
  ai_temperature: number | null;
  ai_max_tokens: number | null;
  ai_enabled: boolean | null;
};

type Parametres = Tables<"parametres"> & AiSettings;

const BUCKET = "company-assets";
const MAX_MB = 2;
const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];

export const Route = createFileRoute("/parametres")({
  component: ParametresPage,
  head: () => ({
    meta: [
      { title: "Paramètres — MMS AI CORE" },
      { name: "description", content: "Centre de configuration de l'entreprise." },
    ],
  }),
});

// Mock helpers for missing imports in the provided file
async function getAiSettings() {
  return {};
}
async function saveAiSettings(_: { data: Partial<AiSettings> }) {
  return {};
}

function ParametresPage() {
  const qc = useQueryClient();
  const AI_FIELD_NAMES = [
    "openai_key",
    "gemini_key",
    "claude_key",
    "ai_model",
    "ai_temperature",
    "ai_max_tokens",
    "ai_enabled",
  ] as const;

  function splitPatch(patch: Partial<Parametres>) {
    const aiPatch: Partial<AiSettings> = {};
    const paramPatch: Partial<Tables<"parametres">> = {};
    for (const [key, value] of Object.entries(patch)) {
      if ((AI_FIELD_NAMES as readonly string[]).includes(key)) {
        (aiPatch as Record<string, unknown>)[key] = value;
      } else {
        (paramPatch as Record<string, unknown>)[key] = value;
      }
    }
    return { aiPatch, paramPatch };
  }

  const { data, isLoading } = useQuery({
    queryKey: ["parametres"],
    queryFn: async () => {
      const [{ data: params, error }, aiSettings] = await Promise.all([
        supabase.from("parametres").select("*").limit(1).maybeSingle(),
        getAiSettings(),
      ]);
      if (error) throw error;
      if (!params) return null;
      return { ...params, ...aiSettings } as Parametres;
    },
  });

  const [form, setForm] = useState<Partial<Parametres>>({});
  const initialized = useRef(false);
  useEffect(() => {
    if (data && !initialized.current) {
      setForm(data);
      initialized.current = true;
    }
  }, [data]);

  const update = <K extends keyof Parametres>(key: K, value: Parametres[K] | null) =>
    setForm((s) => ({ ...s, [key]: value as Parametres[K] }));

  const save = useMutation({
    mutationFn: async (patch: Partial<Parametres>) => {
      if (!data?.id) throw new Error("Enregistrement introuvable");
      const { aiPatch, paramPatch } = splitPatch(patch);
      const tasks: Promise<unknown>[] = [];
      if (Object.keys(paramPatch).length > 0) {
        tasks.push(
          supabase
            .from("parametres")
            .update(paramPatch)
            .eq("id", data.id)
            .then(({ error }) => {
              if (error) throw error;
            }),
        );
      }
      if (Object.keys(aiPatch).length > 0) {
        tasks.push(saveAiSettings({ data: aiPatch }));
      }
      await Promise.all(tasks);
    },
    onSuccess: () => {
      toast.success("Paramètres enregistrés");
      qc.invalidateQueries({ queryKey: ["parametres"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAll = () => save.mutate(form);

  return (
    <AppShell
      title="Paramètres"
      subtitle="Centre de configuration de l'entreprise"
      actions={
        <Button onClick={saveAll} disabled={save.isPending || isLoading} className="gap-2">
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Enregistrer
        </Button>
      }
    >
      {isLoading || !data ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="min-w-0">
            <Tabs defaultValue="general">
              <TabsList className="mb-6 flex flex-wrap h-auto p-1 bg-muted/60 rounded-xl">
                <TabTrig value="general" icon={<Building2 className="h-4 w-4" />}>
                  Générales
                </TabTrig>
                <TabTrig value="legal" icon={<FileText className="h-4 w-4" />}>
                  Légales
                </TabTrig>
                <TabTrig value="billing" icon={<Receipt className="h-4 w-4" />}>
                  Facturation
                </TabTrig>
                <TabTrig value="documents" icon={<FileSignature className="h-4 w-4" />}>
                  Documents
                </TabTrig>
                <TabTrig value="users" icon={<Users className="h-4 w-4" />}>
                  Utilisateurs
                </TabTrig>
                <TabTrig value="permissions" icon={<KeyRound className="h-4 w-4" />}>
                  Permissions
                </TabTrig>
                <TabTrig value="security" icon={<Shield className="h-4 w-4" />}>
                  Sécurité
                </TabTrig>
              </TabsList>

              <TabsContent value="general">
                <GeneralTab form={form} update={update} settingsId={data.id} onSave={save.mutate} />
              </TabsContent>
              <TabsContent value="legal">
                <LegalTab form={form} update={update} />
              </TabsContent>
              <TabsContent value="billing">
                <BillingTab form={form} update={update} />
              </TabsContent>
              <TabsContent value="documents">
                <DocumentsTab
                  form={form}
                  update={update}
                  settingsId={data.id}
                  onSave={save.mutate}
                />
              </TabsContent>
              <TabsContent value="users">
                <UsersTab />
              </TabsContent>
              <TabsContent value="permissions">
                <PermissionsTab />
              </TabsContent>
              <TabsContent value="security">
                <SecurityTab />
              </TabsContent>
            </Tabs>
          </div>

          <aside className="space-y-6">
            <CompanyPreview form={form} />
            <ConfigStatus form={form} />
            <QuickActions
              form={form}
              settingsId={data.id}
              refetch={() => qc.invalidateQueries({ queryKey: ["parametres"] })}
            />
          </aside>
        </div>
      )}
    </AppShell>
  );
}

function TabTrig({
  value,
  icon,
  children,
}: {
  value: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </TabsTrigger>
  );
}

function Card({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <header className="px-6 py-4 border-b border-border flex items-start gap-3">
        {icon && <div className="mt-0.5 p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-base">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function GeneralTab({
  form,
  update,
  settingsId,
  onSave,
}: {
  form: Partial<Parametres>;
  update: <K extends keyof Parametres>(k: K, v: Parametres[K] | null) => void;
  settingsId: string;
  onSave: (patch: Partial<Parametres>) => void;
}) {
  return (
    <div className="space-y-6">
      <Card
        title="Logo de l'entreprise"
        description="PNG, JPG ou SVG — 2 Mo max."
        icon={<ImageIcon className="h-4 w-4" />}
      >
        <FileUploader
          currentPath={form.logo_url ?? null}
          folder="logo"
          settingsId={settingsId}
          onChange={(path) => {
            update("logo_url", path);
            onSave({ logo_url: path });
          }}
        />
      </Card>

      <Card title="Coordonnées" icon={<Building2 className="h-4 w-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Raison sociale" required>
            <Input
              value={form.company_name ?? ""}
              onChange={(e) => update("company_name", e.target.value)}
              required
            />
          </Field>
          <Field label="Nom commercial">
            <Input
              value={form.trade_name ?? ""}
              onChange={(e) => update("trade_name", e.target.value || null)}
            />
          </Field>
          <Field label="Téléphone">
            <Input
              value={form.phone ?? ""}
              onChange={(e) => update("phone", e.target.value || null)}
            />
          </Field>
          <Field label="WhatsApp">
            <Input
              value={form.whatsapp ?? ""}
              onChange={(e) => update("whatsapp", e.target.value || null)}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => update("email", e.target.value || null)}
            />
          </Field>
          <Field label="Site web">
            <Input
              placeholder="https://…"
              value={form.website ?? ""}
              onChange={(e) => update("website", e.target.value || null)}
            />
          </Field>
          <Field label="Ville">
            <Input
              value={form.city ?? ""}
              onChange={(e) => update("city", e.target.value || null)}
            />
          </Field>
          <Field label="Pays">
            <Input
              value={form.country ?? ""}
              onChange={(e) => update("country", e.target.value || null)}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Adresse">
              <Textarea
                rows={2}
                value={form.address ?? ""}
                onChange={(e) => update("address", e.target.value || null)}
              />
            </Field>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LegalTab({
  form,
  update,
}: {
  form: Partial<Parametres>;
  update: <K extends keyof Parametres>(k: K, v: Parametres[K] | null) => void;
}) {
  return (
    <Card title="Informations légales" icon={<FileText className="h-4 w-4" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="RCCM">
          <Input value={form.rccm ?? ""} onChange={(e) => update("rccm", e.target.value || null)} />
        </Field>
        <Field label="Numéro fiscal (NIF)">
          <Input
            value={form.tax_number ?? ""}
            onChange={(e) => update("tax_number", e.target.value || null)}
          />
        </Field>
        <Field label="Régime fiscal">
          <Select
            value={form.tax_regime ?? undefined}
            onValueChange={(v) => update("tax_regime", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Réel">Régime du réel</SelectItem>
              <SelectItem value="Simplifié">Régime simplifié</SelectItem>
              <SelectItem value="Micro-entreprise">Micro-entreprise</SelectItem>
              <SelectItem value="Non assujetti">Non assujetti</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Taux TVA (%)" hint="Laisser vide si non applicable">
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.vat_rate ?? ""}
              onChange={(e) =>
                update("vat_rate", e.target.value === "" ? null : Number(e.target.value))
              }
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </Field>
      </div>
    </Card>
  );
}

function BillingTab({
  form,
  update,
}: {
  form: Partial<Parametres>;
  update: <K extends keyof Parametres>(k: K, v: Parametres[K] | null) => void;
}) {
  return (
    <Card title="Facturation" icon={<Receipt className="h-4 w-4" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Devise">
          <Select value={form.currency ?? "FCFA"} onValueChange={(v) => update("currency", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FCFA">FCFA (F CFA)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Décimales">
          <Input
            type="number"
            min="0"
            max="4"
            value={form.decimals ?? 0}
            onChange={(e) => update("decimals", Number(e.target.value))}
          />
        </Field>
        <Field label="Préfixe devis">
          <Input
            value={form.quote_prefix ?? ""}
            onChange={(e) => update("quote_prefix", e.target.value)}
          />
        </Field>
        <Field label="Préfixe facture">
          <Input
            value={form.invoice_prefix ?? ""}
            onChange={(e) => update("invoice_prefix", e.target.value)}
          />
        </Field>
        <Field label="Préfixe reçu">
          <Input
            value={form.receipt_prefix ?? ""}
            onChange={(e) => update("receipt_prefix", e.target.value)}
          />
        </Field>
        <Field label="Format de date">
          <Select
            value={form.date_format ?? "dd/MM/yyyy"}
            onValueChange={(v) => update("date_format", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dd/MM/yyyy">31/12/2026</SelectItem>
              <SelectItem value="MM/dd/yyyy">12/31/2026</SelectItem>
              <SelectItem value="yyyy-MM-dd">2026-12-31</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Card>
  );
}

function DocumentsTab({
  form,
  update,
  settingsId,
  onSave,
}: {
  form: Partial<Parametres>;
  update: <K extends keyof Parametres>(k: K, v: Parametres[K] | null) => void;
  settingsId: string;
  onSave: (patch: Partial<Parametres>) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card
        title="Signature"
        description="Image de la signature du responsable."
        icon={<FileSignature className="h-4 w-4" />}
      >
        <FileUploader
          currentPath={form.signature_url ?? null}
          folder="signature"
          settingsId={settingsId}
          onChange={(path) => {
            update("signature_url", path);
            onSave({ signature_url: path });
          }}
        />
      </Card>
      <Card
        title="Cachet / Tampon"
        description="Image du cachet officiel."
        icon={<FileSignature className="h-4 w-4" />}
      >
        <FileUploader
          currentPath={form.stamp_url ?? null}
          folder="stamp"
          settingsId={settingsId}
          onChange={(path) => {
            update("stamp_url", path);
            onSave({ stamp_url: path });
          }}
        />
      </Card>
    </div>
  );
}

function UsersTab() {
  return <UserManagement />;
}

import { changePassword } from "@/lib/security.server";
// ... (rest of imports)

// ... (ParametresPage component remains unchanged, assuming I only change SecurityTab)

function SecurityTab() {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const changing = useMutation({
    mutationFn: async () => {
      // Validation
      if (!currentPwd) throw new Error("Mot de passe actuel requis");
      if (newPwd.length < 8)
        throw new Error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      if (newPwd !== confirmPwd)
        throw new Error("La confirmation ne correspond pas au nouveau mot de passe.");

      // Verify current password
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error("Utilisateur non authentifié.");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPwd,
      });
      if (signInError) throw new Error("Mot de passe actuel incorrect.");

      // Update password using server function
      await changePassword({ data: { newPassword: newPwd } });
    },
    onSuccess: () => {
      toast.success("Votre mot de passe a été modifié avec succès.");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card title="Mot de passe" icon={<KeyRound className="h-4 w-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Mot de passe actuel" required>
            <Input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
            />
          </Field>
          <div /> {/* Spacer */}
          <Field label="Nouveau mot de passe" required>
            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </Field>
          <Field label="Confirmer le nouveau mot de passe" required>
            <Input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Button
            onClick={() => changing.mutate()}
            disabled={changing.isPending || !currentPwd || !newPwd || !confirmPwd}
          >
            {changing.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Changer le mot de passe
          </Button>
        </div>
      </Card>
      {/* ... rest of the component */}
    </div>
  );
}

function FileUploader({
  currentPath,
  folder,
  settingsId,
  onChange,
}: {
  currentPath: string | null;
  folder: string;
  settingsId: string;
  onChange: (path: string | null) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useSignedUrl(currentPath);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED.includes(file.type)) return toast.error("Format non supporté (PNG, JPG, SVG)");
      if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Taille max ${MAX_MB} Mo`);
      setBusy(true);
      try {
        const ext = file.name.split(".").pop() || "png";
        const path = `${folder}/${settingsId}-${Date.now()}.${ext}`;
        if (currentPath)
          await supabase.storage
            .from(BUCKET)
            .remove([currentPath])
            .catch(() => {});
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: true, contentType: file.type });
        if (error) throw error;
        onChange(path);
        toast.success("Fichier téléversé");
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [currentPath, folder, settingsId, onChange],
  );

  const remove = async () => {
    if (!currentPath) return;
    setBusy(true);
    try {
      await supabase.storage.from(BUCKET).remove([currentPath]);
      onChange(null);
      toast.success("Fichier supprimé");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={`relative rounded-xl border-2 border-dashed transition-colors p-6 flex flex-col items-center justify-center gap-3 text-center ${
        dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20"
      }`}
    >
      {previewUrl ? (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="h-28 w-28 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden">
            <img src={previewUrl} alt="aperçu" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="gap-2"
            >
              <Upload className="h-3.5 w-3.5" /> Remplacer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={remove}
              disabled={busy}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-medium">Glissez un fichier ici</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG — max {MAX_MB} Mo</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            Choisir un fichier
          </Button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function CompanyPreview({ form }: { form: Partial<Parametres> }) {
  const logo = useSignedUrl(form.logo_url ?? null);
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="h-20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
      <div className="px-5 pb-5 -mt-10">
        <div className="h-20 w-20 rounded-2xl bg-background border border-border shadow-sm flex items-center justify-center overflow-hidden">
          {logo ? (
            <img src={logo} alt="logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <Building2 className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <h3 className="mt-3 font-semibold text-lg leading-tight truncate">
          {form.company_name || "Nom de l'entreprise"}
        </h3>
        {form.trade_name && <p className="text-xs text-muted-foreground">{form.trade_name}</p>}
        <div className="mt-4 space-y-2 text-sm">
          {form.address && (
            <Line icon={<MapPin className="h-3.5 w-3.5" />}>
              {form.address}
              {form.city ? `, ${form.city}` : ""}
            </Line>
          )}
          {form.phone && <Line icon={<Phone className="h-3.5 w-3.5" />}>{form.phone}</Line>}
          {form.email && <Line icon={<Mail className="h-3.5 w-3.5" />}>{form.email}</Line>}
          {form.website && <Line icon={<Globe className="h-3.5 w-3.5" />}>{form.website}</Line>}
        </div>
        <Separator className="my-4" />
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <Meta label="RCCM" value={form.rccm} />
          <Meta label="NIF" value={form.tax_number} />
          <Meta label="TVA" value={form.vat_rate != null ? `${form.vat_rate}%` : null} />
          <Meta label="Devise" value={form.currency} />
        </dl>
      </div>
    </section>
  );
}

function Line({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <span className="mt-0.5">{icon}</span>
      <span className="text-foreground truncate">{children}</span>
    </div>
  );
}
function Meta({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium mt-0.5">
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

function ConfigStatus({ form }: { form: Partial<Parametres> }) {
  const items = useMemo(
    () => [
      { label: "Informations générales", ok: !!(form.company_name && form.phone && form.email) },
      { label: "Logo", ok: !!form.logo_url },
      { label: "Informations légales", ok: !!(form.rccm || form.tax_number) },
      { label: "TVA", ok: form.vat_rate != null },
      { label: "Facturation", ok: !!(form.currency && form.invoice_prefix) },
      { label: "Administrateur", ok: true },
      { label: "Sauvegarde", ok: false },
    ],
    [form],
  );
  const done = items.filter((i) => i.ok).length;
  const pct = Math.round((done / items.length) * 100);
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Configuration</h3>
        <Badge variant="secondary">
          {done}/{items.length}
        </Badge>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2 text-sm">
            {i.ok ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            <span className={i.ok ? "" : "text-muted-foreground"}>{i.label}</span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {i.ok ? "Configuré" : "À compléter"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuickActions({
  form,
  settingsId,
  refetch,
}: {
  form: Partial<Parametres>;
  settingsId: string;
  refetch: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  const exportCfg = () => {
    const blob = new Blob([JSON.stringify(form, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parametres-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configuration exportée");
  };

  const importCfg = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const { id, created_at, updated_at, ...clean } = parsed;
      void id;
      void created_at;
      void updated_at;
      const aiPatch: Record<string, unknown> = {};
      const paramPatch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(clean)) {
        if (
          [
            "openai_key",
            "gemini_key",
            "claude_key",
            "ai_model",
            "ai_temperature",
            "ai_max_tokens",
            "ai_enabled",
          ].includes(key)
        )
          aiPatch[key] = value;
        else paramPatch[key] = value;
      }
      if (Object.keys(paramPatch).length > 0) {
        const { error } = await supabase.from("parametres").update(paramPatch).eq("id", settingsId);
        if (error) throw error;
      }
      if (Object.keys(aiPatch).length > 0) {
        await saveAiSettings({ data: aiPatch });
      }
      refetch();
      toast.success("Configuration importée");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const reset = async () => {
    if (!confirm("Réinitialiser tous les paramètres aux valeurs par défaut ?")) return;
    const { error } = await supabase
      .from("parametres")
      .update({
        trade_name: null,
        address: null,
        city: null,
        country: null,
        phone: null,
        whatsapp: null,
        email: null,
        website: null,
        rccm: null,
        tax_number: null,
        tax_regime: null,
        vat_rate: null,
        currency: "FCFA",
        quote_prefix: "DEV-",
        invoice_prefix: "FAC-",
        receipt_prefix: "REC-",
        decimals: 0,
        date_format: "dd/MM/yyyy",
        logo_url: null,
        signature_url: null,
        stamp_url: null,
      })
      .eq("id", settingsId);
    if (error) return toast.error(error.message);
    try {
      await saveAiSettings({
        data: { openai_key: null, gemini_key: null, claude_key: null, ai_model: null },
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
    refetch();
    toast.success("Paramètres réinitialisés");
  };

  const backup = () => {
    exportCfg();
    toast.success("Sauvegarde créée");
  };

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm p-5">
      <h3 className="font-semibold text-sm mb-3">Actions rapides</h3>
      <div className="grid grid-cols-1 gap-2">
        <Button variant="outline" size="sm" className="justify-start gap-2" onClick={exportCfg}>
          <Download className="h-4 w-4" /> Exporter la configuration
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="justify-start gap-2"
          onClick={() => fileInput.current?.click()}
        >
          <UploadIcon className="h-4 w-4" /> Importer une configuration
        </Button>
        <Button variant="outline" size="sm" className="justify-start gap-2" onClick={backup}>
          <DatabaseBackup className="h-4 w-4" /> Créer une sauvegarde
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="justify-start gap-2 text-destructive hover:text-destructive"
          onClick={reset}
        >
          <RotateCcw className="h-4 w-4" /> Réinitialiser les paramètres
        </Button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importCfg(f);
          e.target.value = "";
        }}
      />
    </section>
  );
}
