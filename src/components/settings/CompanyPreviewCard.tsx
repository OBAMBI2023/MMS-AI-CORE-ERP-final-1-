import { Building2, Globe, Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { useSignedUrl } from "@/hooks/use-signed-url";
import type { ParametresForm } from "@/hooks/use-parametres-editor";

type CompanyPreviewCardProps = {
  form: ParametresForm;
};

/**
 * Live preview of the company identity, kept visible across every settings tab
 * (Général, Légal, Facturation, Documents…) so edits in any tab are reflected
 * immediately without needing to save first.
 */
export function CompanyPreviewCard({ form }: CompanyPreviewCardProps) {
  const logo = useSignedUrl(form.logo_url);
  const location = [form.city, form.country].filter(Boolean).join(", ");
  const chips = [
    form.rccm ? { label: "RCCM", value: form.rccm } : null,
    form.tax_number ? { label: "NIF", value: form.tax_number } : null,
    form.vat_rate != null ? { label: "TVA", value: `${form.vat_rate}%` } : null,
    { label: "Devise", value: form.currency },
  ].filter((chip): chip is { label: string; value: string } => Boolean(chip));

  return (
    <aside className="h-fit overflow-hidden rounded-2xl border bg-card shadow-sm lg:sticky lg:top-6">
      <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
      <div className="-mt-10 px-5 pb-5">
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border bg-background p-2 shadow-sm">
          {logo ? (
            <BrandLogo context="dashboard" src={logo} alt="Logo" />
          ) : (
            <Building2 className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <h3 className="mt-3 truncate text-lg font-semibold">
          {form.company_name || "Votre entreprise"}
        </h3>
        {form.trade_name && (
          <p className="text-sm text-muted-foreground">{form.trade_name}</p>
        )}

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {location && (
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{[form.address, location].filter(Boolean).join(", ")}</span>
            </li>
          )}
          {form.phone && (
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{form.phone}</span>
            </li>
          )}
          {form.email && (
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{form.email}</span>
            </li>
          )}
          {form.website && (
            <li className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{form.website}</span>
            </li>
          )}
        </ul>

        {chips.length > 0 && (
          <>
            <div className="my-4 h-px bg-border" />
            <div className="grid grid-cols-2 gap-3 text-sm">
              {chips.map((chip) => (
                <div key={chip.label}>
                  <p className="text-xs text-muted-foreground">{chip.label}</p>
                  <p className="font-medium">{chip.value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
