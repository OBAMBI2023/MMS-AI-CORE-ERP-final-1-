import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ParametresForm } from "@/hooks/use-parametres-editor";

type ConfigurationProgressProps = {
  form: ParametresForm;
};

export function ConfigurationProgress({ form }: ConfigurationProgressProps) {
  const items = [
    {
      label: "Informations générales",
      done: Boolean(form.company_name?.trim() && form.phone?.trim() && form.email?.trim()),
    },
    { label: "Logo", done: Boolean(form.logo_url) },
    { label: "Informations légales", done: Boolean(form.rccm?.trim() && form.tax_number?.trim()) },
    { label: "TVA", done: form.vat_rate != null },
    {
      label: "Facturation",
      done: Boolean(form.currency && form.invoice_prefix?.trim() && form.receipt_prefix?.trim()),
    },
    { label: "Administrateur", done: true },
    { label: "Sauvegarde", done: false },
  ];

  const completed = items.filter((item) => item.done).length;
  const percent = Math.round((completed / items.length) * 100);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-semibold">Configuration</h2>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {completed}/{items.length}
        </span>
      </div>
      <div className="space-y-4 p-5">
        <Progress value={percent} />
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
                {item.label}
              </span>
              <span className={item.done ? "text-emerald-600" : "text-muted-foreground"}>
                {item.done ? "Configuré" : "À compléter"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
