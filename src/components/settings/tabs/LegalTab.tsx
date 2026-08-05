import { FileText } from "lucide-react";
import { Field, Panel } from "@/components/settings/tabs/GeneralTab";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ParametresForm } from "@/hooks/use-parametres-editor";

const TAX_REGIMES = [
  "Réel normal",
  "Réel simplifié",
  "Taxe d’État de l’entreprenant",
  "Microentreprise",
];

type LegalTabProps = {
  form: ParametresForm;
  update: <K extends keyof ParametresForm>(key: K, value: ParametresForm[K]) => void;
};

export function LegalTab({ form, update }: LegalTabProps) {
  return (
    <Panel title="Informations légales" description="Ces informations apparaissent sur vos factures et documents officiels." icon={<FileText className="h-5 w-5" />}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="RCCM">
          <Input value={form.rccm ?? ""} onChange={(event) => update("rccm", event.target.value || null)} placeholder="CI-ABJ-01-2026-B00-00000" />
        </Field>
        <Field label="Numéro fiscal (NIF)">
          <Input value={form.tax_number ?? ""} onChange={(event) => update("tax_number", event.target.value || null)} />
        </Field>
        <Field label="Régime fiscal">
          <Select value={form.tax_regime ?? "unset"} onValueChange={(value) => update("tax_regime", value === "unset" ? null : value)}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un régime" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Non renseigné</SelectItem>
              {TAX_REGIMES.map((regime) => (
                <SelectItem key={regime} value={regime}>{regime}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Taux TVA (%)">
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={form.vat_rate ?? ""}
              onChange={(event) => update("vat_rate", event.target.value === "" ? null : Number(event.target.value))}
              className="pr-8"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground">Laisser vide si non applicable</p>
        </Field>
      </div>
    </Panel>
  );
}
