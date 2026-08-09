import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Clock,
  Receipt,
  Wallet,
  Users,
  Save,
  Loader2,
  Upload,
  Trash2,
  ShieldAlert,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { HotelUsersAccessTab } from "@/components/hotel/HotelUsersAccessTab";
import { Section } from "@/components/hotel/HotelSettingsUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useSignedUrl } from "@/hooks/use-signed-url";
import {
  useHotelSettings,
  useHotelSettingsRefresh,
  type HotelSettingsRow,
} from "@/hooks/use-hotel-settings";
import { HOTEL_PAYMENT_METHODS } from "@/lib/hotel-payments";
import { configureCurrency } from "@/lib/mms/format";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type ParametresRow = Tables<"parametres">;

const BUCKET = "company-assets";
const MAX_MB = 2;
const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];

const CURRENCIES = ["XOF", "USD", "EUR", "MAD", "GBP"];

const TIMEZONES = [
  { value: "Africa/Abidjan", label: "Abidjan, Accra, Dakar (GMT)" },
  { value: "Africa/Lagos", label: "Lagos, Douala, Libreville (GMT+1)" },
  { value: "Africa/Casablanca", label: "Casablanca (GMT+1)" },
  { value: "Africa/Nairobi", label: "Nairobi (GMT+3)" },
  { value: "Europe/Paris", label: "Paris (GMT+1/+2)" },
  { value: "UTC", label: "UTC" },
];

const PAYMENT_METHOD_OPTIONS = HOTEL_PAYMENT_METHODS.filter((m) => m !== "Autre");

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

  const hotelSettingsQuery = useHotelSettings();
  const refreshHotelSettings = useHotelSettingsRefresh();
  const { settings: paramSettings, isLoading: paramsLoading } = useCompanySettings(tenantId);

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

  const togglePaymentMethod = (method: string, checked: boolean) => {
    setHotelForm((s) => {
      const current = s.payment_methods ?? [];
      const next = checked
        ? [...new Set([...current, method])]
        : current.filter((m) => m !== method);
      return { ...s, payment_methods: next };
    });
  };

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
        canEdit ? (
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
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-xl bg-muted/60 p-1">
            <TabTrig value="general" icon={<Building2 className="h-4 w-4" />}>
              Général
            </TabTrig>
            <TabTrig value="reservations" icon={<Clock className="h-4 w-4" />}>
              Réservations
            </TabTrig>
            <TabTrig value="facturation" icon={<Receipt className="h-4 w-4" />}>
              Facturation
            </TabTrig>
            <TabTrig value="paiements" icon={<Wallet className="h-4 w-4" />}>
              Paiements
            </TabTrig>
            {canViewUsers && (
              <TabTrig value="users" icon={<Users className="h-4 w-4" />}>
                Utilisateurs & accès
              </TabTrig>
            )}
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

          <TabsContent value="reservations">
            <ReservationsTab form={hotelForm} update={updateHotel} disabled={!canEdit} />
          </TabsContent>

          <TabsContent value="facturation">
            <FacturationTab
              paramForm={paramForm}
              hotelForm={hotelForm}
              update={updateHotel}
              disabled={!canEdit}
            />
          </TabsContent>

          <TabsContent value="paiements">
            <PaiementsTab
              methods={hotelForm.payment_methods ?? []}
              onToggle={togglePaymentMethod}
              disabled={!canEdit}
            />
          </TabsContent>

          {canViewUsers && (
            <TabsContent value="users">
              <HotelUsersAccessTab />
            </TabsContent>
          )}
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

function ReservationsTab({
  form,
  update,
  disabled,
}: {
  form: Partial<HotelSettingsRow>;
  update: <K extends keyof HotelSettingsRow>(k: K, v: HotelSettingsRow[K]) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <Section title="Horaires" icon={<Clock className="h-4 w-4" />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Heure de check-in par défaut">
            <Input
              type="time"
              value={(form.check_in_time ?? "14:00:00").slice(0, 5)}
              disabled={disabled}
              onChange={(e) => update("check_in_time", `${e.target.value}:00`)}
            />
          </Field>
          <Field label="Heure de check-out par défaut">
            <Input
              type="time"
              value={(form.check_out_time ?? "12:00:00").slice(0, 5)}
              disabled={disabled}
              onChange={(e) => update("check_out_time", `${e.target.value}:00`)}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Conditions & annulation"
        description="Affichées aux voyageurs lors de la réservation."
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label="Conditions de réservation">
            <Textarea
              rows={3}
              value={form.booking_terms ?? ""}
              disabled={disabled}
              placeholder="Ex. Pièce d'identité obligatoire à l'arrivée, caution demandée…"
              onChange={(e) => update("booking_terms", e.target.value || null)}
            />
          </Field>
          <Field label="Politique d'annulation">
            <Textarea
              rows={3}
              value={form.cancellation_policy ?? ""}
              disabled={disabled}
              placeholder="Ex. Annulation gratuite jusqu'à 24h avant l'arrivée…"
              onChange={(e) => update("cancellation_policy", e.target.value || null)}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}

function FacturationTab({
  paramForm,
  hotelForm,
  update,
  disabled,
}: {
  paramForm: Partial<ParametresRow>;
  hotelForm: Partial<HotelSettingsRow>;
  update: <K extends keyof HotelSettingsRow>(k: K, v: HotelSettingsRow[K]) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <section className="hotel-panel mb-5">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold">Informations sur les factures & reçus</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Identité affichée sur les documents (RCCM, NIF, régime fiscal) — lecture seule ici.
              </p>
            </div>
          </div>
        </header>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Raison sociale</dt>
            <dd className="font-medium">{paramForm.company_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Adresse</dt>
            <dd className="font-medium">{paramForm.address || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">RCCM</dt>
            <dd className="font-medium">{paramForm.rccm || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">NIF</dt>
            <dd className="font-medium">{paramForm.tax_number || "—"}</dd>
          </div>
        </dl>
      </section>

      <Section
        title="Taxe hôtel"
        description="Taux de référence conservé avec l'établissement. Il n'est pas encore appliqué automatiquement au calcul des factures."
      >
        <div className="max-w-xs">
          <Field label="Taux de taxe (%)">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={hotelForm.tax_rate ?? 0}
              disabled={disabled}
              onChange={(e) => update("tax_rate", Number(e.target.value))}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}

function PaiementsTab({
  methods,
  onToggle,
  disabled,
}: {
  methods: string[];
  onToggle: (method: string, checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <Section
      title="Moyens de paiement acceptés"
      description="Sélectionnez les modes de paiement proposés aux clients à la caisse et sur les réservations."
      icon={<Wallet className="h-4 w-4" />}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PAYMENT_METHOD_OPTIONS.map((method) => {
          const checked = methods.includes(method);
          return (
            <label
              key={method}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm font-medium transition-colors",
                !disabled && "cursor-pointer hover:bg-muted/40",
              )}
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(v) => onToggle(method, Boolean(v))}
              />
              {method}
            </label>
          );
        })}
      </div>
    </Section>
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
