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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/use-permissions";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { configureCurrency } from "@/lib/mms/format";
import { useTenant } from "@/providers/TenantProvider";

type Row = Tables<"parametres">;
type Form = Pick<
  Row,
  | "company_name"
  | "phone"
  | "email"
  | "address"
  | "city"
  | "country"
  | "currency"
  | "rccm"
  | "tax_regime"
  | "logo_url"
>;
const BUCKET = "company-assets";
const TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const message = (error: unknown) =>
  (error as { message?: string })?.message || "Une erreur inattendue est survenue.";

export function HotelSettingsPage() {
  const cache = useQueryClient();
  const { profile, tenant, loading: tenantLoading } = useTenant();
  const permissions = usePermissions();
  const tenantId = profile?.tenant_id;
  const canManageSettings =
    (permissions.data?.permissions as string[] | undefined)?.includes("settings.manage") ?? false;
  const [tab, setTab] = useState<"hotel" | "roles">("hotel");
  const [form, setForm] = useState<Form | null>(null);
  const query = useQuery({
    queryKey: ["parametres", tenantId],
    enabled: !tenantLoading && Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) throw new Error("Aucun établissement associé à ce compte.");
      const { data, error } = await supabase
        .from("parametres")
        .select(
          "id,company_name,phone,email,address,city,country,currency,rccm,tax_regime,logo_url,decimals",
        )
        .eq("tenant_id", tenantId)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("[HotelSettingsPage] Échec du chargement des paramètres", {
          tenantId,
          error,
        });
        throw new Error("Impossible de charger les informations de l’établissement.");
      }
      return data;
    },
  });
  const emptyForm = (): Form => ({
    company_name: tenant?.name?.trim() || "",
    phone: null,
    email: null,
    address: null,
    city: null,
    country: null,
    currency: "XOF",
    rccm: null,
    tax_regime: null,
    logo_url: null,
  });
  const fromRow = (row: typeof query.data): Form =>
    row
      ? {
          company_name: row.company_name,
          phone: row.phone,
          email: row.email,
          address: row.address,
          city: row.city,
          country: row.country,
          currency: row.currency,
          rccm: row.rccm,
          tax_regime: row.tax_regime,
          logo_url: row.logo_url,
        }
      : emptyForm();
  useEffect(() => {
    if (query.isSuccess) setForm(fromRow(query.data));
  }, [query.data, query.isSuccess, tenant?.name]);
  const save = useMutation({
    mutationFn: async (values: Form) => {
      if (!tenantId || !canManageSettings)
        throw new Error("Vous n’avez pas la permission de modifier ces paramètres.");
      const clean = (value: string | null) => value?.trim() || null;
      const payload = {
        ...values,
        tenant_id: tenantId,
        company_name: values.company_name.trim(),
        phone: clean(values.phone),
        email: clean(values.email),
        address: clean(values.address),
        city: clean(values.city),
        country: clean(values.country),
        rccm: clean(values.rccm),
        tax_regime: clean(values.tax_regime),
      };
      const { data, error } = await supabase
        .from("parametres")
        .upsert(payload, { onConflict: "tenant_id" })
        .select(
          "id,company_name,phone,email,address,city,country,currency,rccm,tax_regime,logo_url,decimals",
        )
        .single();
      if (error) {
        console.error("[HotelSettingsPage] Échec de l’enregistrement des paramètres", {
          tenantId,
          error,
        });
        throw new Error("Impossible d’enregistrer les informations de l’établissement.");
      }
      return data;
    },
    onSuccess: (saved) => {
      configureCurrency(saved.currency, saved.decimals);
      cache.setQueryData(["parametres", tenantId], saved);
      setForm(fromRow(saved));
      toast.success("Informations de l’établissement enregistrées");
    },
    onError: (error) => toast.error(message(error)),
  });
  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((old) => (old ? { ...old, [key]: value } : old));
  const loading = tenantLoading || permissions.isLoading || query.isLoading;
  return (
    <AppShell
      title="Paramètres"
      subtitle="Gérez l’identité et les informations de votre établissement"
      actions={
        tab === "hotel" && form && canManageSettings ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={save.isPending}
              onClick={() => setForm(fromRow(query.data))}
            >
              Annuler
            </Button>
            <Button
              className="gap-2"
              disabled={save.isPending || !form.company_name.trim()}
              onClick={() => save.mutate(form)}
            >
              {save.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="mx-auto w-full max-w-6xl">
        {loading ? (
          <Centered
            icon={<Loader2 className="h-6 w-6 animate-spin" />}
            title="Chargement des paramètres…"
          />
        ) : query.error || !tenantId || !form ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
            {message(query.error)}
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-2 rounded-xl border bg-card p-1.5 shadow-sm">
              <Tab active={tab === "hotel"} onClick={() => setTab("hotel")}>
                <Building2 className="h-4 w-4" />
                Établissement
              </Tab>
              <Tab active={tab === "roles"} onClick={() => setTab("roles")}>
                <LockKeyhole className="h-4 w-4" />
                Rôles et permissions
                <Badge
                  variant="secondary"
                  className="ml-1 hidden rounded-full text-[10px] sm:inline-flex"
                >
                  Bientôt
                </Badge>
              </Tab>
            </div>
            {tab === "roles" ? (
              <Centered
                icon={<LockKeyhole className="h-9 w-9" />}
                badge
                title="Rôles et permissions"
                text="Cette fonctionnalité sera disponible prochainement."
              />
            ) : (
              <Identity
                form={form}
                tenantId={tenantId}
                editable={canManageSettings}
                update={update}
                saveLogo={(path) => save.mutateAsync({ ...form, logo_url: path })}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Identity({
  form,
  tenantId,
  editable,
  update,
  saveLogo,
}: {
  form: Form;
  tenantId: string;
  editable: boolean;
  update: <K extends keyof Form>(key: K, value: Form[K]) => void;
  saveLogo: (path: string | null) => Promise<unknown>;
}) {
  const input = (
    key: "phone" | "email" | "address" | "city" | "country" | "rccm",
    type = "text",
  ) => <Input type={type} value={form[key] ?? ""} onChange={(e) => update(key, e.target.value)} />;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Panel
          title="Logo"
          text="Votre identité visuelle sur tous les documents de l’hôtel."
          icon={<ImageIcon className="h-5 w-5" />}
        >
          <Logo
            current={form.logo_url}
            tenantId={tenantId}
            editable={editable}
            change={(path) => update("logo_url", path)}
            save={saveLogo}
          />
        </Panel>
        <Panel
          title="Informations générales"
          text="Coordonnées et informations légales de l’établissement."
          icon={<Building2 className="h-5 w-5" />}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom de l’établissement" wide required>
              <Input
                value={form.company_name}
                onChange={(e) => update("company_name", e.target.value)}
              />
            </Field>
            <Field label="Téléphone">{input("phone", "tel")}</Field>
            <Field label="E-mail">{input("email", "email")}</Field>
            <Field label="Adresse" wide>
              {input("address")}
            </Field>
            <Field label="Ville">{input("city")}</Field>
            <Field label="Pays">{input("country")}</Field>
            <Field label="Devise" required>
              <Select
                value={form.currency === "FCFA" ? "XOF" : form.currency}
                onValueChange={(v) => update("currency", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ["XOF", "Franc CFA (XOF)"],
                    ["EUR", "Euro (EUR)"],
                    ["USD", "Dollar américain (USD)"],
                    ["GBP", "Livre sterling (GBP)"],
                  ].map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="RCCM">{input("rccm")}</Field>
            <Field label="Régime d’imposition" wide>
              <Select
                value={form.tax_regime ?? "unset"}
                onValueChange={(v) => update("tax_regime", v === "unset" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "unset",
                    "Réel normal",
                    "Réel simplifié",
                    "Taxe d’État de l’entreprenant",
                    "Microentreprise",
                  ].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v === "unset" ? "Non renseigné" : v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Panel>
      </div>
      <Preview form={form} />
    </div>
  );
}

function Logo({
  current,
  tenantId,
  editable,
  change,
  save,
}: {
  current: string | null;
  tenantId: string;
  editable: boolean;
  change: (path: string | null) => void;
  save: (path: string | null) => Promise<unknown>;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const url = useSignedUrl(current);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    if (!TYPES.includes(file.type)) return toast.error("Utilisez un fichier PNG, JPG ou SVG.");
    if (file.size > 2 * 1024 * 1024) return toast.error("Le logo ne doit pas dépasser 2 Mo.");
    setBusy(true);
    let path: string | null = null;
    try {
      path = `${tenantId}/logo/hotel-${Date.now()}.${file.name.split(".").pop()?.toLowerCase() || "png"}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      await save(path);
      change(path);
      if (current) await supabase.storage.from(BUCKET).remove([current]);
      toast.success(current ? "Logo remplacé" : "Logo importé");
    } catch (error) {
      if (path) await supabase.storage.from(BUCKET).remove([path]);
      console.error("[HotelSettingsPage] Échec de l’import du logo", { tenantId, error });
      toast.error("Impossible d’importer le logo.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await save(null);
      change(null);
      const { error } = await supabase.storage.from(BUCKET).remove([current]);
      if (error) {
        console.error("[HotelSettingsPage] Paramètre logo supprimé, nettoyage du fichier échoué", {
          tenantId,
          error,
        });
      }
      toast.success("Logo supprimé");
    } catch (error) {
      console.error("[HotelSettingsPage] Échec de la suppression du logo", { tenantId, error });
      toast.error("Impossible de supprimer le logo.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed bg-muted/20 p-6 sm:flex-row">
      <button
        type="button"
        aria-label="Prévisualiser le logo"
        className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background shadow-sm"
        onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : url ? (
          <BrandLogo context="dashboard" src={url} alt="Logo de l’établissement" />
        ) : (
          <Building2 className="h-9 w-9 text-muted-foreground" />
        )}
      </button>
      <div className="flex-1 text-center sm:text-left">
        <p className="font-medium">Logo de l’établissement</p>
        <p className="mt-1 text-sm text-muted-foreground">PNG, JPG ou SVG · 2 Mo maximum</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
          {editable && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => ref.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {current ? "Remplacer" : "Importer"}
            </Button>
          )}
          {url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            >
              Prévisualiser
            </Button>
          )}
          {editable && current && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={busy}
              onClick={remove}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          )}
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept={TYPES.join(",")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Preview({ form }: { form: Form }) {
  const logo = useSignedUrl(form.logo_url);
  const uses = [
    { icon: FileText, text: "Factures" },
    { icon: ReceiptText, text: "Reçus" },
    { icon: ShieldCheck, text: "Rapports" },
    { icon: Building2, text: "Documents PDF" },
  ];
  return (
    <aside className="h-fit overflow-hidden rounded-2xl border bg-card shadow-sm lg:sticky lg:top-6">
      <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
      <div className="-mt-12 px-5 pb-5">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-2xl border bg-background p-2 shadow-sm">
          {logo ? (
            <BrandLogo context="dashboard" src={logo} alt="Logo" />
          ) : (
            <Building2 className="h-9 w-9 text-muted-foreground" />
          )}
        </div>
        <h3 className="mt-4 truncate text-lg font-semibold">
          {form.company_name || "Votre établissement"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {[form.city, form.country].filter(Boolean).join(", ") || "Localisation non renseignée"}
        </p>
        <div className="my-5 h-px bg-border" />
        <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
          Utilisé automatiquement sur
        </p>
        <ul className="space-y-3">
          {uses.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm">
              <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              {text}
              <Check className="ml-auto h-4 w-4 text-emerald-600" />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
function Panel({
  title,
  text,
  icon,
  children,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex gap-3 border-b px-5 py-4 sm:px-6">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
function Field({
  label,
  wide,
  required,
  children,
}: {
  label: string;
  wide?: boolean;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${wide ? "sm:col-span-2" : ""}`}>
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium sm:flex-none ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}
function Centered({
  icon,
  title,
  text,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  badge?: boolean;
}) {
  return (
    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border bg-card px-6 text-center shadow-sm">
      <div className="mb-4 rounded-2xl bg-primary/10 p-4 text-primary">{icon}</div>
      {badge && (
        <Badge variant="secondary" className="mb-3">
          Bientôt disponible
        </Badge>
      )}
      <h2 className="text-xl font-semibold">{title}</h2>
      {text && <p className="mt-2 max-w-md text-sm text-muted-foreground">{text}</p>}
    </section>
  );
}
