import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  DatabaseBackup,
  Eye,
  FileCheck2,
  FileText,
  Lock,
  PenLine,
  Pencil,
  Percent,
  Receipt,
  Stamp,
  Users,
  Save,
  Loader2,
  Upload,
  Trash2,
  Shield,
  ShieldAlert,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { HotelUsersAccessTab } from "@/components/hotel/HotelUsersAccessTab";
import { HotelSecurityTab } from "@/components/hotel/HotelSecurityTab";
import { HotelAuditLogTab } from "@/components/hotel/HotelAuditLogTab";
import { Section } from "@/components/hotel/HotelSettingsUi";
import { BackupsPanel } from "@/components/mms/BackupsPanel";
import { useHotelBackupModules } from "@/hooks/use-hotel-backup-modules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useHotelSubscription } from "@/hooks/use-hotel-subscription";
import { useSignedUrl } from "@/hooks/use-signed-url";
import type { HotelSubscriptionRow } from "@/hooks/use-hotel-subscription";
import {
  useHotelSettings,
  useHotelSettingsRefresh,
  type HotelSettingsRow,
} from "@/hooks/use-hotel-settings";
import { configureCurrency } from "@/lib/mms/format";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type ParametresRow = Tables<"parametres">;

const BUCKET = "company-assets";
const MAX_MB = 2;
const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const ACCEPTED_SIGNATURE = ["image/png", "image/jpeg", "image/jpg"];

const CURRENCIES = ["XOF", "USD", "EUR", "MAD", "GBP"];

const TIMEZONES = [
  { value: "Africa/Abidjan", label: "Abidjan, Accra, Dakar (GMT)" },
  { value: "Africa/Lagos", label: "Lagos, Douala, Libreville (GMT+1)" },
  { value: "Africa/Casablanca", label: "Casablanca (GMT+1)" },
  { value: "Africa/Nairobi", label: "Nairobi (GMT+3)" },
  { value: "Europe/Paris", label: "Paris (GMT+1/+2)" },
  { value: "UTC", label: "UTC" },
];

const SUBSCRIPTION_FALLBACK_RATES: Record<"monthly" | "quarterly" | "yearly", { label: string; amount: number }> = {
  monthly: { label: "Mensuel", amount: 0 },
  quarterly: { label: "Trimestriel", amount: 50000 },
  yearly: { label: "Annuel", amount: 100000 },
};

const STATUS_META: Record<
  "trial" | "active" | "expired" | "suspended" | "missing",
  { label: string; className: string }
> = {
  trial: { label: "Essai gratuit", className: "border-sky-200 bg-sky-500/10 text-sky-700 dark:border-sky-900 dark:text-sky-300" },
  active: { label: "Actif", className: "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300" },
  expired: { label: "Expiré", className: "border-red-200 bg-red-500/10 text-red-700 dark:border-red-900 dark:text-red-300" },
  suspended: { label: "Suspendu", className: "border-orange-200 bg-orange-500/10 text-orange-700 dark:border-orange-900 dark:text-orange-300" },
  missing: { label: "Non défini", className: "border-border bg-muted text-muted-foreground" },
};

function formatSupabaseError(error: unknown): string {
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  const parts = [
    e?.code && `code: ${e.code}`,
    e?.message && `message: ${e.message}`,
    e?.details && `details: ${e.details}`,
    e?.hint && `hint: ${e.hint}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : "Erreur inconnue";
}

export function HotelParametresPage() {
  const qc = useQueryClient();
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const canView = useActionPermission("hotel.settings.view");
  const canEdit = useActionPermission("hotel.settings.update");
  const canViewUsers = useActionPermission("hotel.users.view");
  const canViewBackups = useActionPermission("hotel.backups.view");

  const hotelSettingsQuery = useHotelSettings();
  const hotelSubscriptionQuery = useHotelSubscription();
  const refreshHotelSettings = useHotelSettingsRefresh();
  const { settings: paramSettings, isLoading: paramsLoading } = useCompanySettings(tenantId);
  const backupModulesQuery = useHotelBackupModules();

  const [activeTab, setActiveTab] = useState("general");
  const [hotelForm, setHotelForm] = useState<Partial<HotelSettingsRow>>({});
  const hotelInitialized = useRef(false);
  useEffect(() => {
    if (hotelSettingsQuery.data && !hotelInitialized.current) {
      setHotelForm(hotelSettingsQuery.data);
      hotelInitialized.current = true;
    }
  }, [hotelSettingsQuery.data]);

  const [paramForm, setParamForm] = useState<Partial<ParametresRow>>({});
  const paramInitialized = useRef(false);
  useEffect(() => {
    if (paramSettings && !paramInitialized.current) {
      setParamForm(paramSettings);
      paramInitialized.current = true;
    }
  }, [paramSettings]);

  const updateHotel = <K extends keyof HotelSettingsRow>(key: K, value: HotelSettingsRow[K]) =>
    setHotelForm((s) => ({ ...s, [key]: value }));
  const updateParam = <K extends keyof ParametresRow>(key: K, value: ParametresRow[K] | null) =>
    setParamForm((s) => ({ ...s, [key]: value as ParametresRow[K] }));

  const save = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Locataire introuvable");
      const tasks: Promise<unknown>[] = [];

      if (hotelSettingsQuery.data?.id) {
        const { id: _hid, tenant_id: _htid, updated_at: _hu, ...hotelPatch } = hotelForm;
        tasks.push(
          (async () => {
            const { error } = await supabase
              .from("hotel_settings")
              .update(hotelPatch)
              .eq("id", hotelSettingsQuery.data.id)
              .eq("tenant_id", tenantId);
            if (error) throw error;
          })(),
        );
      }

      if (paramSettings?.id) {
        const paramPatch = {
          company_name: paramForm.company_name,
          phone: paramForm.phone,
          email: paramForm.email,
          address: paramForm.address,
          logo_url: paramForm.logo_url,
          currency: paramForm.currency,
          backup_auto_enabled: paramForm.backup_auto_enabled,
          backup_auto_frequency: paramForm.backup_auto_frequency,
        };
        tasks.push(
          (async () => {
            const { error } = await supabase
              .from("parametres")
              .update(paramPatch)
              .eq("id", paramSettings.id)
              .eq("tenant_id", tenantId);
            if (error) throw error;
          })(),
        );
      }

      if (tasks.length === 0) throw new Error("Paramètres introuvables");
      await Promise.all(tasks);
    },
    onSuccess: () => {
      configureCurrency(paramForm.currency, paramSettings?.decimals);
      toast.success("Paramètres de l'établissement enregistrés");
      refreshHotelSettings();
      qc.invalidateQueries({ queryKey: ["parametres"] });
    },
    onError: (error: unknown) => {
      toast.error(formatSupabaseError(error));
    },
  });

  const isLoading = tenantLoading || hotelSettingsQuery.isLoading || paramsLoading;

  return (
    <HotelAppShell
      title="Paramètres"
      subtitle="Configuration de l'établissement"
      actions={
        // Utilisateurs & accès persiste chaque action immédiatement via ses propres
        // mutations (création/édition/suppression/statut) — ce bouton ne touche que
        // hotelForm/paramForm et n'a aucun effet sur cet onglet, où il ne ferait que
        // prêter à confusion.
        canEdit && activeTab !== "users" && activeTab !== "subscription" ? (
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || isLoading}
            className="gap-2"
          >
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : !canView ? (
        <section className="hotel-panel flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold">Accès restreint</p>
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas la permission de consulter les paramètres de l'établissement.
            </p>
          </div>
        </section>
      ) : hotelSettingsQuery.isError ? (
        <p className="text-sm text-destructive">{formatSupabaseError(hotelSettingsQuery.error)}</p>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-xl bg-muted/60 p-1">
            <TabTrig value="general" icon={<Building2 className="h-4 w-4" />}>
              Général
            </TabTrig>
            <TabTrig value="facturation" icon={<Receipt className="h-4 w-4" />}>
              Facturation
            </TabTrig>
            <TabTrig value="documents" icon={<FileText className="h-4 w-4" />}>
              Documents
            </TabTrig>
            <TabTrig value="subscription" icon={<CalendarClock className="h-4 w-4" />}>
              Abonnement
            </TabTrig>
            {canViewBackups && (
              <TabTrig value="backups" icon={<DatabaseBackup className="h-4 w-4" />}>
                Sauvegardes
              </TabTrig>
            )}
            {canViewUsers && (
              <TabTrig value="users" icon={<Users className="h-4 w-4" />}>
                Utilisateurs & accès
              </TabTrig>
            )}
            <TabTrig value="security" icon={<Shield className="h-4 w-4" />}>
              Sécurité
            </TabTrig>
            <TabTrig value="audit" icon={<ClipboardList className="h-4 w-4" />}>
              Journal d'audit
            </TabTrig>
          </TabsList>

          <TabsContent value="general">
            <GeneralTab
              form={paramForm}
              update={updateParam}
              timezone={hotelForm.timezone}
              onTimezoneChange={(v) => updateHotel("timezone", v)}
              parametresId={paramSettings?.id}
              disabled={!canEdit}
            />
          </TabsContent>

          <TabsContent value="facturation">
            <FacturationTab
              paramForm={paramForm}
              hotelForm={hotelForm}
              update={updateHotel}
              disabled={!canEdit}
              onEditGeneral={() => setActiveTab("general")}
            />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab
              hotelForm={hotelForm}
              paramForm={paramForm}
              update={updateHotel}
              disabled={!canEdit}
            />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionTab
              subscription={hotelSubscriptionQuery.data ?? null}
              loading={hotelSubscriptionQuery.isLoading}
            />
          </TabsContent>

          {canViewBackups && (
            <TabsContent value="backups">
              <BackupsPanel
                permissionView="hotel.backups.view"
                permissionCreate="hotel.backups.create"
                form={paramForm}
                update={(key, value) => updateParam(key, value as never)}
                moduleOptions={backupModulesQuery.data ?? []}
                moduleOptionsLoading={backupModulesQuery.isLoading}
              />
            </TabsContent>
          )}

          {canViewUsers && (
            <TabsContent value="users">
              <HotelUsersAccessTab />
            </TabsContent>
          )}

          <TabsContent value="security">
            <HotelSecurityTab />
          </TabsContent>

          <TabsContent value="audit">
            <HotelAuditLogTab />
          </TabsContent>
        </Tabs>
      )}
    </HotelAppShell>
  );
}

function TabTrig({
  value,
  icon,
  children,
}: {
  value: string;
  icon: ReactNode;
  children: ReactNode;
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

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Non définie";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

function daysRemaining(endsAt?: string | null) {
  if (!endsAt) return "Non définie";
  const end = new Date(endsAt);
  const diff = end.getTime() - new Date().getTime();
  if (Number.isNaN(end.getTime()) || diff <= 0) return "0 jour";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} jour${days > 1 ? "s" : ""}`;
}

function durationLabel(subscription: HotelSubscriptionRow | null) {
  if (!subscription) return "Non définie";
  if (subscription.status === "trial" && subscription.trial_started_at && subscription.trial_ends_at) {
    const days = Math.max(
      0,
      Math.ceil(
        (new Date(subscription.trial_ends_at).getTime() - new Date(subscription.trial_started_at).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    return `${days} jours`;
  }
  if (subscription.starts_at && subscription.ends_at) {
    const days = Math.max(
      0,
      Math.ceil((new Date(subscription.ends_at).getTime() - new Date(subscription.starts_at).getTime()) / (1000 * 60 * 60 * 24)),
    );
    return `${days} jours`;
  }
  return "Non définie";
}

function SubscriptionTab({
  subscription,
  loading,
}: {
  subscription: HotelSubscriptionRow | null;
  loading: boolean;
}) {
  const billingCycle: "monthly" | "quarterly" | "yearly" =
    subscription?.billing_cycle === "quarterly" || subscription?.billing_cycle === "yearly"
      ? subscription.billing_cycle
      : "monthly";
  const fallbackRate = SUBSCRIPTION_FALLBACK_RATES[billingCycle];
  const planLabel = subscription?.status === "trial" ? "Essai gratuit" : subscription?.billing_cycle ? fallbackRate.label : "Non définie";
  const statusKey: "trial" | "active" | "expired" | "suspended" | "missing" =
    subscription?.status === "trial" ||
    subscription?.status === "active" ||
    subscription?.status === "expired" ||
    subscription?.status === "suspended"
      ? subscription.status
      : "missing";
  const status = STATUS_META[statusKey];
  const amountLabel =
    subscription?.amount != null
      ? `${new Intl.NumberFormat("fr-FR").format(Number(subscription.amount))} FCFA`
      : "Non définie";
  const canRenew = false;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="max-w-3xl space-y-2">
        <h3 className="text-xl font-semibold">Abonnement</h3>
        <p className="text-sm text-muted-foreground">
          Consultez votre formule, votre période d’abonnement et son échéance.
        </p>
      </header>

      {!subscription ? (
        <section className="hotel-panel">
          <p className="text-sm text-muted-foreground">Aucune information d’abonnement disponible.</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <CalendarCheck className="size-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold text-foreground">Abonnement en cours</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vue récapitulative de l’abonnement actif de l’établissement.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SubscriptionMeta label="Formule actuelle" value={planLabel} emphasized />
              <SubscriptionMeta
                label="Statut"
                value={<Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.className)}>{status.label}</Badge>}
              />
              <SubscriptionMeta label="Date de début" value={formatDate(subscription.starts_at ?? subscription.trial_started_at)} />
              <SubscriptionMeta label="Date d’expiration" value={formatDate(subscription.ends_at ?? subscription.trial_ends_at)} />
              <SubscriptionMeta label="Durée" value={durationLabel(subscription)} />
              <SubscriptionMeta
                label="Jours restants"
                value={subscription.ends_at || subscription.trial_ends_at ? daysRemaining(subscription.ends_at ?? subscription.trial_ends_at) : "Non définie"}
                emphasized
              />
            </div>
          </section>

          <section className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Receipt className="size-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold text-foreground">Votre formule</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Paramètres de facturation liés à l’abonnement actuel.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SubscriptionMeta label="Périodicité" value={subscription?.billing_cycle ? fallbackRate.label : "Non définie"} />
              <SubscriptionMeta label="Montant de l’abonnement" value={amountLabel} emphasized />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                disabled={!canRenew}
              >
                Renouveler l’abonnement
              </Button>
              {!canRenew && (
                <p className="text-xs text-muted-foreground">Renouvellement bientôt disponible</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SubscriptionMeta({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className={cn("mt-1.5 min-h-6", emphasized && "text-lg font-semibold text-foreground")}>
        {typeof value === "string" ? (
          <p className={cn("leading-6", emphasized ? "text-lg font-semibold text-foreground" : "text-sm font-medium text-foreground")}>{value}</p>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function GeneralTab({
  form,
  update,
  timezone,
  onTimezoneChange,
  parametresId,
  disabled,
}: {
  form: Partial<ParametresRow>;
  update: <K extends keyof ParametresRow>(k: K, v: ParametresRow[K] | null) => void;
  timezone?: string;
  onTimezoneChange: (v: string) => void;
  parametresId?: string;
  disabled: boolean;
}) {
  return (
    <div>
      <Section
        title="Logo de l'établissement"
        description="PNG, JPG ou SVG — 2 Mo max."
        icon={<ImageIcon className="h-4 w-4" />}
      >
        <LogoUploader
          currentPath={form.logo_url ?? null}
          parametresId={parametresId}
          disabled={disabled}
          onChange={(path) => update("logo_url", path)}
        />
      </Section>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <PenLine className="size-4" />
            </div>
            <div>
              <h4 className="font-semibold">Signature</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Signature affichée en bas des documents PDF.
              </p>
            </div>
          </div>
          <div className="mt-4 flex-1">
            <DocumentImageUploader
              currentPath={form.signature_url ?? null}
              parametresId={parametresId}
              disabled={disabled}
              field="signature_url"
              folder="signature"
              altText="Signature"
              successUploadMessage="Signature téléversée"
              successRemoveMessage="Signature supprimée"
              onChange={(path) => update("signature_url", path)}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">PNG ou JPG — 2 Mo max.</p>
        </div>

        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Stamp className="size-4" />
            </div>
            <div>
              <h4 className="font-semibold">Cachet de l'établissement</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cachet affiché en bas des documents PDF.
              </p>
            </div>
          </div>
          <div className="mt-4 flex-1">
            <DocumentImageUploader
              currentPath={form.stamp_url ?? null}
              parametresId={parametresId}
              disabled={disabled}
              field="stamp_url"
              folder="stamp"
              altText="Cachet de l'établissement"
              successUploadMessage="Cachet téléversé"
              successRemoveMessage="Cachet supprimé"
              onChange={(path) => update("stamp_url", path)}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">PNG ou JPG — 2 Mo max.</p>
        </div>
      </div>

      <Section title="Coordonnées" icon={<Building2 className="h-4 w-4" />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nom de l'établissement">
            <Input
              value={form.company_name ?? ""}
              disabled={disabled}
              onChange={(e) => update("company_name", e.target.value)}
            />
          </Field>
          <Field label="Téléphone">
            <Input
              value={form.phone ?? ""}
              disabled={disabled}
              onChange={(e) => update("phone", e.target.value || null)}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email ?? ""}
              disabled={disabled}
              onChange={(e) => update("email", e.target.value || null)}
            />
          </Field>
          <Field label="Devise">
            <Select
              value={form.currency === "FCFA" ? "XOF" : (form.currency ?? "XOF")}
              disabled={disabled}
              onValueChange={(v) => update("currency", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fuseau horaire">
            <Select
              value={timezone ?? "Africa/Abidjan"}
              disabled={disabled}
              onValueChange={onTimezoneChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Adresse">
              <Textarea
                rows={2}
                value={form.address ?? ""}
                disabled={disabled}
                onChange={(e) => update("address", e.target.value || null)}
              />
            </Field>
          </div>
        </div>
      </Section>
    </div>
  );
}

function LegalField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 font-medium", !value && "font-normal italic text-muted-foreground")}>
        {value || "Non renseigné"}
      </dd>
    </div>
  );
}

function CardHeader({
  icon,
  title,
  description,
  badge,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {badge}
    </div>
  );
}

function FacturationTab({
  paramForm,
  hotelForm,
  update,
  disabled,
  onEditGeneral,
}: {
  paramForm: Partial<ParametresRow>;
  hotelForm: Partial<HotelSettingsRow>;
  update: <K extends keyof HotelSettingsRow>(k: K, v: HotelSettingsRow[K]) => void;
  disabled: boolean;
  onEditGeneral: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            Les informations légales proviennent des paramètres généraux de l'établissement.
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pour modifier ces informations, rendez-vous dans l'onglet Général.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEditGeneral}
          className="shrink-0 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Pencil className="h-3.5 w-3.5" /> Aller dans Général
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
          <CardHeader
            icon={<Building2 className="size-5" />}
            title="Identité de facturation"
            description="Informations utilisées automatiquement sur les factures, reçus et documents."
            badge={
              <Badge variant="secondary" className="shrink-0 gap-1 font-medium">
                <Lock className="h-3 w-3" /> Lecture seule
              </Badge>
            }
          />

          <div className="mt-5 flex-1 divide-y divide-border">
            <dl className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2">
              <LegalField label="Raison sociale" value={paramForm.company_name} />
              <LegalField label="Adresse" value={paramForm.address} />
            </dl>
            <dl className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
              <LegalField label="RCCM" value={paramForm.rccm} />
              <LegalField label="NIF / Numéro contribuable" value={paramForm.tax_number} />
            </dl>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-lg bg-primary/5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Ces informations proviennent des paramètres généraux de l'établissement.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEditGeneral}
              className="shrink-0 gap-1.5 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" /> Modifier dans Général
            </Button>
          </div>
        </div>

        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
          <CardHeader
            icon={<Percent className="size-5" />}
            title="Configuration fiscale"
            description="Paramètres fiscaux utilisés pour la facturation de l'établissement."
          />

          <div className="mt-5 flex-1">
            <Field label="Taux de taxe (%)">
              <div className="relative w-full">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={hotelForm.tax_rate ?? 0}
                  disabled={disabled}
                  onChange={(e) => update("tax_rate", Number(e.target.value))}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </Field>
          </div>

          <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5">
            <p className="text-xs text-muted-foreground">
              Taux de référence conservé avec l'établissement. Il n'est pas encore appliqué
              automatiquement au calcul des factures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const FOOTER_MAX_LENGTH = 300;

type DocumentKind = "invoice" | "receipt" | "confirmation" | "certificate";

const DOCUMENT_KINDS: {
  kind: DocumentKind;
  label: string;
  description: string;
  icon: ReactNode;
  prefixField: "invoice_prefix" | "receipt_prefix" | "confirmation_prefix" | "certificate_prefix";
  prefixLabel: string;
}[] = [
  {
    kind: "invoice",
    label: "Facture",
    description: "Émise depuis Facturation.",
    icon: <Receipt className="size-4" />,
    prefixField: "invoice_prefix",
    prefixLabel: "Préfixe Facture",
  },
  {
    kind: "receipt",
    label: "Reçu",
    description: "Émis depuis la Caisse.",
    icon: <FileText className="size-4" />,
    prefixField: "receipt_prefix",
    prefixLabel: "Préfixe Reçu",
  },
  {
    kind: "confirmation",
    label: "Confirmation de réservation",
    description: "Émise depuis Réservations.",
    icon: <CalendarCheck className="size-4" />,
    prefixField: "confirmation_prefix",
    prefixLabel: "Préfixe Confirmation",
  },
  {
    kind: "certificate",
    label: "Certificat d'hébergement",
    description: "Émis depuis la fiche réservation.",
    icon: <FileCheck2 className="size-4" />,
    prefixField: "certificate_prefix",
    prefixLabel: "Préfixe Certificat",
  },
];

function DocumentPreviewDialog({
  open,
  onOpenChange,
  documentKind,
  companyName,
  prefix,
  footerText,
  showLogo,
  showSignature,
  showStamp,
  logoUrl,
  signatureUrl,
  stampUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentKind: (typeof DOCUMENT_KINDS)[number] | null;
  companyName: string;
  prefix: string;
  footerText: string;
  showLogo: boolean;
  showSignature: boolean;
  showStamp: boolean;
  logoUrl: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
}) {
  if (!documentKind) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Aperçu — {documentKind.label}</DialogTitle>
          <DialogDescription>
            Aperçu indicatif avec des données fictives. Aucun document ni numéro définitif n'est
            créé.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-white p-5 text-neutral-800 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-dashed border-border pb-3">
            {showLogo && logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 max-w-[120px] object-contain" />
            ) : (
              <div className="grid h-10 w-24 place-items-center rounded bg-muted text-[10px] text-muted-foreground">
                {showLogo ? "Logo" : "Logo masqué"}
              </div>
            )}
            <div className="text-right">
              <p className="text-sm font-semibold">{companyName || "Votre établissement"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{documentKind.label}</p>
              <p className="text-xs text-muted-foreground">
                N° {(prefix || "PREFIXE").toUpperCase()}-APERCU
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <p>Client : Jean Dupont (exemple)</p>
            <p>Date : 01/01/2026</p>
            <p>Détail de la prestation à titre d'exemple…</p>
          </div>

          <div className="mt-6 flex items-end justify-between gap-3 border-t border-dashed border-border pt-3">
            <p className="max-w-[55%] text-[11px] text-muted-foreground">
              {footerText || "Merci de votre confiance."}
            </p>
            <div className="flex gap-2">
              {showSignature && (
                <div className="grid h-14 w-20 place-items-center rounded border border-dashed border-border p-1 text-center text-[9px] text-muted-foreground">
                  {signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Signature"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    "Signature"
                  )}
                </div>
              )}
              {showStamp && (
                <div className="grid h-14 w-20 place-items-center rounded border border-dashed border-border p-1 text-center text-[9px] text-muted-foreground">
                  {stampUrl ? (
                    <img
                      src={stampUrl}
                      alt="Cachet"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    "Cachet"
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentsTab({
  hotelForm,
  paramForm,
  update,
  disabled,
}: {
  hotelForm: Partial<HotelSettingsRow>;
  paramForm: Partial<ParametresRow>;
  update: <K extends keyof HotelSettingsRow>(k: K, v: HotelSettingsRow[K]) => void;
  disabled: boolean;
}) {
  const logoUrl = useSignedUrl(paramForm.logo_url ?? null);
  const signatureUrl = useSignedUrl(paramForm.signature_url ?? null);
  const stampUrl = useSignedUrl(paramForm.stamp_url ?? null);
  const [previewKind, setPreviewKind] = useState<(typeof DOCUMENT_KINDS)[number] | null>(null);

  const showLogo = hotelForm.show_logo_on_documents ?? true;
  const showSignature = hotelForm.show_signature_on_documents ?? true;
  const showStamp = hotelForm.show_stamp_on_documents ?? true;
  const footerText = hotelForm.document_footer_text ?? "";

  return (
    <div className="max-w-[1000px] space-y-5">
      <Section
        title="Documents disponibles"
        description="Documents actuellement générés par votre établissement."
        icon={<FileText className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DOCUMENT_KINDS.map((doc) => (
            <div
              key={doc.kind}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  {doc.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{doc.label}</p>
                  <p className="text-xs text-muted-foreground">{doc.description}</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPreviewKind(doc)}
                className="h-9 shrink-0 gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" /> Aperçu
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Éléments affichés"
        description="Contrôlez ce qui apparaît sur les documents générés. Réutilise les fichiers déjà configurés dans Général."
        icon={<ImageIcon className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
            <span className="text-sm font-medium">Afficher le logo</span>
            <Switch
              checked={showLogo}
              disabled={disabled}
              onCheckedChange={(v) => update("show_logo_on_documents", v)}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
            <span className="text-sm font-medium">Afficher la signature</span>
            <Switch
              checked={showSignature}
              disabled={disabled}
              onCheckedChange={(v) => update("show_signature_on_documents", v)}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
            <span className="text-sm font-medium">Afficher le cachet</span>
            <Switch
              checked={showStamp}
              disabled={disabled}
              onCheckedChange={(v) => update("show_stamp_on_documents", v)}
            />
          </label>
        </div>
      </Section>

      <Section
        title="Numérotation"
        description="Préfixe affiché devant le numéro de chaque type de document."
        icon={<Receipt className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {DOCUMENT_KINDS.map((doc) => (
            <Field key={doc.kind} label={doc.prefixLabel}>
              <Input
                value={hotelForm[doc.prefixField] ?? ""}
                disabled={disabled}
                maxLength={10}
                onChange={(e) => update(doc.prefixField, e.target.value.toUpperCase())}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section
        title="Pied de page"
        description="Texte affiché en bas des documents générés."
        icon={<PenLine className="h-4 w-4" />}
      >
        <Field label="Texte de pied de page">
          <Textarea
            rows={3}
            value={footerText}
            disabled={disabled}
            maxLength={FOOTER_MAX_LENGTH}
            placeholder="Ex : Merci pour votre confiance."
            onChange={(e) =>
              update("document_footer_text", e.target.value.slice(0, FOOTER_MAX_LENGTH))
            }
          />
        </Field>
        <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
          {footerText.length}/{FOOTER_MAX_LENGTH}
        </p>
      </Section>

      <DocumentPreviewDialog
        open={previewKind !== null}
        onOpenChange={(next) => {
          if (!next) setPreviewKind(null);
        }}
        documentKind={previewKind}
        companyName={paramForm.company_name ?? ""}
        prefix={previewKind ? (hotelForm[previewKind.prefixField] ?? "") : ""}
        footerText={footerText}
        showLogo={showLogo}
        showSignature={showSignature}
        showStamp={showStamp}
        logoUrl={showLogo ? logoUrl : null}
        signatureUrl={showSignature ? signatureUrl : null}
        stampUrl={showStamp ? stampUrl : null}
      />
    </div>
  );
}

function LogoUploader({
  currentPath,
  parametresId,
  disabled,
  onChange,
}: {
  currentPath: string | null;
  parametresId?: string;
  disabled: boolean;
  onChange: (path: string | null) => void;
}) {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useSignedUrl(currentPath);

  // Persiste immédiatement en base : sans ce patch, le nouveau logo n'était
  // visible qu'après un clic sur "Enregistrer" (et perdu si l'utilisateur
  // quittait la page avant), donnant l'impression que "Remplacer" ne
  // fonctionne pas.
  const persistLogo = useCallback(
    async (path: string | null) => {
      if (!tenantId || !parametresId) return;
      const { error } = await supabase
        .from("parametres")
        .update({ logo_url: path })
        .eq("id", parametresId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["parametres"] });
    },
    [tenantId, parametresId, qc],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED.includes(file.type)) return toast.error("Format non supporté (PNG, JPG, SVG)");
      if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Taille max ${MAX_MB} Mo`);
      if (!tenantId || !parametresId) return toast.error("Établissement introuvable");
      setBusy(true);
      try {
        const ext = file.name.split(".").pop() || "png";
        const path = `${tenantId}/logo/${parametresId}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        await persistLogo(path);
        onChange(path);
        toast.success("Logo téléversé");
      } catch (e) {
        toast.error(formatSupabaseError(e));
      } finally {
        setBusy(false);
      }
    },
    [tenantId, parametresId, onChange, persistLogo],
  );

  const remove = async () => {
    if (!currentPath) return;
    setBusy(true);
    try {
      await supabase.storage.from(BUCKET).remove([currentPath]);
      await persistLogo(null);
      onChange(null);
      toast.success("Logo supprimé");
    } catch (e) {
      toast.error(formatSupabaseError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20",
      )}
    >
      {previewUrl ? (
        <div className="flex w-full flex-col items-center gap-3">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
            <img src={previewUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
          </div>
          {!disabled && (
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
          )}
        </div>
      ) : (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-medium">Glissez un fichier ici</p>
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, SVG — max {MAX_MB} Mo</p>
          </div>
          {!disabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              Choisir un fichier
            </Button>
          )}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function DocumentImageUploader({
  currentPath,
  parametresId,
  disabled,
  field,
  folder,
  altText,
  successUploadMessage,
  successRemoveMessage,
  onChange,
}: {
  currentPath: string | null;
  parametresId?: string;
  disabled: boolean;
  field: "signature_url" | "stamp_url";
  folder: "signature" | "stamp";
  altText: string;
  successUploadMessage: string;
  successRemoveMessage: string;
  onChange: (path: string | null) => void;
}) {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useSignedUrl(currentPath);

  // Persiste immédiatement en base, comme LogoUploader : sinon l'image n'est
  // visible sur les PDF qu'après un clic sur "Enregistrer".
  const persist = useCallback(
    async (path: string | null) => {
      if (!tenantId || !parametresId) return;
      const patch: Partial<Pick<ParametresRow, "signature_url" | "stamp_url">> = {
        [field]: path,
      };
      const { error } = await supabase
        .from("parametres")
        .update(patch)
        .eq("id", parametresId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["parametres"] });
    },
    [tenantId, parametresId, qc, field],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_SIGNATURE.includes(file.type))
        return toast.error("Format non supporté (PNG, JPG, JPEG)");
      if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Taille max ${MAX_MB} Mo`);
      if (!tenantId || !parametresId) return toast.error("Établissement introuvable");
      setBusy(true);
      try {
        const ext = file.name.split(".").pop() || "png";
        const path = `${tenantId}/${folder}/${parametresId}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        await persist(path);
        onChange(path);
        toast.success(successUploadMessage);
      } catch (e) {
        toast.error(formatSupabaseError(e));
      } finally {
        setBusy(false);
      }
    },
    [tenantId, parametresId, onChange, persist, folder, successUploadMessage],
  );

  const remove = async () => {
    if (!currentPath) return;
    setBusy(true);
    try {
      await supabase.storage.from(BUCKET).remove([currentPath]);
      await persist(null);
      onChange(null);
      toast.success(successRemoveMessage);
    } catch (e) {
      toast.error(formatSupabaseError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "flex h-[130px] w-full items-center justify-center rounded-xl border-2 border-dashed p-2 transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20",
        )}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={altText} className="max-h-full max-w-full object-contain" />
        ) : busy ? (
          <Loader2 className="size-5 animate-spin text-primary" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Upload className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Glissez un fichier ici</p>
          </div>
        )}
      </div>

      {!disabled && (
        <div className="flex gap-2">
          {previewUrl ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="h-10 flex-1 gap-1.5 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
              >
                <Upload className="h-3.5 w-3.5" /> Remplacer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={remove}
                disabled={busy}
                className="h-10 flex-1 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="h-10 w-full gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" /> Importer un fichier
            </Button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_SIGNATURE.join(",")}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
