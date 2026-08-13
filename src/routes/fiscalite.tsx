import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, Loader2, Settings2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useTenant } from "@/providers/TenantProvider";
import { formatCurrency } from "@/lib/mms/format";
import { buildFiscalConfig, estimateFiscalReserve, formatFiscalStatus, getTodayDateInputValue, isValidFutureDueDate } from "@/lib/fiscalite";

type FiscalConfigState = {
  country: string;
  taxRegime: string;
  declarationFrequency: string;
  nextDueDate: string;
};

const STORAGE_KEY = "saovia:fiscalite:v1";

const DEFAULT_STATE: FiscalConfigState = {
  country: "",
  taxRegime: "",
  declarationFrequency: "Mensuelle",
  nextDueDate: "",
};

export const Route = createFileRoute("/fiscalite")({
  component: FiscalitePage,
  head: () => ({
    meta: [
      { title: "Fiscalité — SAOVIA" },
      { name: "description", content: "Estimation simple des obligations fiscales et réserve à anticiper." },
    ],
  }),
});

function FiscalitePage() {
  const { profile, loading: tenantLoading } = useTenant();
  const { settings } = useCompanySettings(profile?.tenant_id);
  const { data: dashboard } = useDashboardData();
  const [form, setForm] = useState<FiscalConfigState>(DEFAULT_STATE);
  const todayDate = useMemo(() => getTodayDateInputValue(), []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<FiscalConfigState>;
      setForm((current) => {
        const mergedNextDueDate = isValidFutureDueDate(parsed.nextDueDate) ? parsed.nextDueDate ?? "" : "";
        return {
          ...current,
          ...parsed,
          nextDueDate: mergedNextDueDate,
        };
      });
    } catch {
      // Ignore malformed local state and fall back to defaults.
    }
  }, []);

  useEffect(() => {
    const seed = buildFiscalConfig(settings, {
      country: form.country || null,
      taxRegime: form.taxRegime || null,
      declarationFrequency: form.declarationFrequency || null,
      nextDueDate: isValidFutureDueDate(form.nextDueDate) ? form.nextDueDate : null,
    });
    setForm({
      country: seed.country ?? "",
      taxRegime: seed.taxRegime ?? "",
      declarationFrequency: seed.declarationFrequency ?? "Mensuelle",
      nextDueDate: seed.nextDueDate ?? "",
    });
  }, [settings]);

  useEffect(() => {
    const persisted = {
      ...form,
      nextDueDate: isValidFutureDueDate(form.nextDueDate) ? form.nextDueDate : "",
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [form]);

  const estimate = useMemo(() => {
    if (!dashboard) return null;
    return estimateFiscalReserve({
      revenue: dashboard.kpis.revenue.value,
      purchases: dashboard.kpis.achats.value,
      expenses: dashboard.kpis.depenses.value,
      companySettings: settings,
      config: {
        country: form.country || null,
        taxRegime: form.taxRegime || null,
        declarationFrequency: form.declarationFrequency || null,
        nextDueDate: form.nextDueDate || null,
      },
    });
  }, [dashboard, form.country, form.declarationFrequency, form.nextDueDate, form.taxRegime, settings]);

  const statusLabel = estimate ? formatFiscalStatus(estimate.status) : "À surveiller";
  const estimatedTaxes = estimate?.estimatedTaxes ?? null;
  const reserveAmount = estimate?.reserveAmount ?? null;

  return (
    <AppShell title="Fiscalité" subtitle="Anticipation des obligations fiscales">
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <Card className="rounded-[24px] border-border bg-card p-6 shadow-sm dark:border-white/5 dark:bg-[#151B2F]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Estimation simple
                </div>
                <h1 className="mt-3 text-2xl font-semibold">Fiscalité</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Cette page aide à anticiper une réserve fiscale à partir des données déjà présentes dans
                  SAOVIA. Elle ne remplace pas une déclaration officielle.
                </p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {statusLabel}
              </Badge>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Summary title="Impôts estimés à ce jour" value={estimatedTaxes} loading={!estimate} />
              <Summary title="Montant conseillé à réserver" value={reserveAmount} loading={!estimate} />
              <Summary
                title="Prochaine échéance fiscale"
                value={estimate?.nextDueDate ? new Date(estimate.nextDueDate).toLocaleDateString("fr-FR") : "Non définie"}
                loading={!estimate}
              />
            </div>

            <Separator className="my-6" />

            <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <p>
                L’estimation se base sur le chiffre d’affaires, les achats et les dépenses déjà enregistrés,
                puis applique le taux fiscal configuré dans les paramètres de l’entreprise lorsqu’il existe.
              </p>
              <p>
                Si le pays, le régime fiscal ou la prochaine échéance ne sont pas renseignés dans
                l’entreprise, vous pouvez les compléter ici sans ressaisir les informations déjà connues.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-muted-foreground">
              Les montants affichés sont des estimations destinées à faciliter l’anticipation. Ils ne
              remplacent pas une déclaration fiscale officielle ni l’avis d’un professionnel.
            </div>
          </Card>

          <Card className="rounded-[24px] border-border bg-card p-6 shadow-sm dark:border-white/5 dark:bg-[#151B2F]">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4 text-primary" />
              Paramètres fiscaux
            </div>
            <div className="mt-4 space-y-4">
              <Field label="Pays">
                <Input
                  value={form.country}
                  onChange={(e) => setForm((current) => ({ ...current, country: e.target.value }))}
                  placeholder={settings?.country?.trim() || "Pays"}
                />
              </Field>
              <Field label="Régime fiscal">
                <Input
                  value={form.taxRegime}
                  onChange={(e) => setForm((current) => ({ ...current, taxRegime: e.target.value }))}
                  placeholder={settings?.tax_regime?.trim() || "Régime fiscal"}
                />
              </Field>
              <Field label="Périodicité des déclarations">
                <Select
                  value={form.declarationFrequency}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, declarationFrequency: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mensuelle">Mensuelle</SelectItem>
                    <SelectItem value="Trimestrielle">Trimestrielle</SelectItem>
                    <SelectItem value="Annuelle">Annuelle</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date de prochaine échéance">
                <Input
                  type="date"
                  min={todayDate}
                  value={form.nextDueDate}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      nextDueDate: isValidFutureDueDate(e.target.value) ? e.target.value : "",
                    }))
                  }
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    country: settings?.country?.trim() || current.country,
                    taxRegime: settings?.tax_regime?.trim() || current.taxRegime,
                  }))
                }
                disabled={tenantLoading}
              >
                {tenantLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Réutiliser les informations de l’entreprise
              </Button>
            </div>
          </Card>
        </section>

        <Card className="rounded-[24px] border-border bg-card p-6 shadow-sm dark:border-white/5 dark:bg-[#151B2F]">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-primary" />
            Lecture rapide
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Info label="Pays" value={form.country || settings?.country || "Non renseigné"} />
            <Info label="Régime fiscal" value={form.taxRegime || settings?.tax_regime || "Non renseigné"} />
            <Info label="Périodicité" value={form.declarationFrequency || "Mensuelle"} />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Architecture prête pour ajouter plus tard des simulations, alertes d’échéance, historique de
            paiements et règles par pays.
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Summary({
  title,
  value,
  loading,
}: {
  title: string;
  value: number | string | null;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-2 text-lg font-semibold">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : typeof value === "number" ? formatCurrency(value) : value ?? "—"}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}
