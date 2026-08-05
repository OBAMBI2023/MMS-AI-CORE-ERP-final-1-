import { Landmark } from "lucide-react";
import { Field, Panel } from "@/components/settings/tabs/GeneralTab";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ParametresForm } from "@/hooks/use-parametres-editor";

const CURRENCIES = [
  { value: "XOF", label: "Franc CFA (XOF)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "Dollar américain (USD)" },
  { value: "GBP", label: "Livre sterling (GBP)" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "31/12/2026" },
  { value: "MM/DD/YYYY", label: "12/31/2026" },
  { value: "YYYY-MM-DD", label: "2026-12-31" },
];

type BillingTabProps = {
  form: ParametresForm;
  update: <K extends keyof ParametresForm>(key: K, value: ParametresForm[K]) => void;
};

export function BillingTab({ form, update }: BillingTabProps) {
  return (
    <Panel title="Facturation" description="Devise, numérotation et format utilisés sur vos devis, factures et reçus." icon={<Landmark className="h-5 w-5" />}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Devise" required>
          <Select value={form.currency === "FCFA" ? "XOF" : form.currency} onValueChange={(value) => update("currency", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.value} value={currency.value}>{currency.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Décimales">
          <Input
            type="number"
            min={0}
            max={4}
            value={form.decimals}
            onChange={(event) => update("decimals", event.target.value === "" ? 0 : Number(event.target.value))}
          />
        </Field>
        <Field label="Préfixe devis">
          <Input value={form.quote_prefix} onChange={(event) => update("quote_prefix", event.target.value)} />
        </Field>
        <Field label="Préfixe facture">
          <Input value={form.invoice_prefix} onChange={(event) => update("invoice_prefix", event.target.value)} />
        </Field>
        <Field label="Préfixe reçu">
          <Input value={form.receipt_prefix} onChange={(event) => update("receipt_prefix", event.target.value)} />
        </Field>
        <Field label="Format de date">
          <Select value={form.date_format} onValueChange={(value) => update("date_format", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((format) => (
                <SelectItem key={format.value} value={format.value}>{format.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Panel>
  );
}
