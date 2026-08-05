import { Building2, Image as ImageIcon } from "lucide-react";
import { FileDropUploader } from "@/components/settings/FileDropUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParametresForm } from "@/hooks/use-parametres-editor";

type GeneralTabProps = {
  form: ParametresForm;
  tenantId: string;
  update: <K extends keyof ParametresForm>(key: K, value: ParametresForm[K]) => void;
};

export function GeneralTab({ form, tenantId, update }: GeneralTabProps) {
  return (
    <div className="space-y-6">
      <Panel title="Logo de l’entreprise" description="PNG, JPG ou SVG — 2 Mo max." icon={<ImageIcon className="h-5 w-5" />}>
        <FileDropUploader
          currentPath={form.logo_url}
          tenantId={tenantId}
          folder="logo"
          label="Logo de l’entreprise"
          onChange={(path) => update("logo_url", path)}
        />
      </Panel>

      <Panel title="Coordonnées" description="Ces informations apparaissent sur vos documents commerciaux." icon={<Building2 className="h-5 w-5" />}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Raison sociale" required className="sm:col-span-2">
            <Input value={form.company_name} onChange={(event) => update("company_name", event.target.value)} placeholder="Nom de votre entreprise" />
          </Field>
          <Field label="Secteur d’activité" className="sm:col-span-2">
            <Input
              value={form.business_sector ?? ""}
              onChange={(event) => update("business_sector", event.target.value || null)}
              placeholder="Champ facultatif"
            />
            <p className="text-xs text-muted-foreground">Champ facultatif</p>
          </Field>
          <Field label="Téléphone">
            <Input type="tel" value={form.phone ?? ""} onChange={(event) => update("phone", event.target.value || null)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email ?? ""} onChange={(event) => update("email", event.target.value || null)} />
          </Field>
          <Field label="Site web">
            <Input value={form.website ?? ""} onChange={(event) => update("website", event.target.value || null)} placeholder="exemple.com" />
          </Field>
          <Field label="Ville">
            <Input value={form.city ?? ""} onChange={(event) => update("city", event.target.value || null)} />
          </Field>
          <Field label="Pays">
            <Input value={form.country ?? ""} onChange={(event) => update("country", event.target.value || null)} />
          </Field>
          <Field label="Adresse" className="sm:col-span-2">
            <Input value={form.address ?? ""} onChange={(event) => update("address", event.target.value || null)} />
          </Field>
        </div>
      </Panel>
    </div>
  );
}

export function Panel({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex gap-3 border-b px-5 py-4 sm:px-6">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
