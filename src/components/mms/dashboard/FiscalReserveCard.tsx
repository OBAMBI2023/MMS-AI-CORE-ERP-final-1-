import { Link } from "@tanstack/react-router";
import { Landmark, ArrowRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/mms/format";
import type { FiscalEstimateResult } from "@/lib/fiscalite";
import { formatFiscalStatus } from "@/lib/fiscalite";

export function FiscalReserveCard({
  data,
  isLoading,
  currency,
}: {
  data: FiscalEstimateResult | null;
  isLoading?: boolean;
  currency?: string | null;
}) {
  const reserve = data?.reserveAmount ?? null;
  const taxes = data?.estimatedTaxes ?? null;

  return (
    <Card className="rounded-[24px] border-border bg-card p-5 shadow-sm dark:border-white/5 dark:bg-[#151B2F]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Landmark className="h-3.5 w-3.5" />
            Réserve fiscale
          </div>
          <h3 className="mt-3 text-base font-semibold">Anticipation des obligations</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Vue rapide du montant à mettre de côté à partir des données déjà enregistrées.
          </p>
        </div>
        <Badge variant="outline" className="rounded-full">
          {data ? formatFiscalStatus(data.status) : "—"}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Impôts estimés" value={isLoading ? null : taxes} currency={currency} />
        <Metric label="Montant à réserver" value={isLoading ? null : reserve} currency={currency} />
        <Metric
          label="Prochaine échéance"
          value={data?.nextDueDate ? new Date(data.nextDueDate).toLocaleDateString("fr-FR") : null}
        />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Les montants affichés sont des estimations destinées à faciliter l’anticipation. Ils ne remplacent
          pas une déclaration fiscale officielle ni l’avis d’un professionnel.
        </p>
        <Button asChild type="button" variant="outline" className="gap-2">
          <Link to="/fiscalite" className="inline-flex items-center gap-2">
            Voir la fiscalité
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  currency,
}: {
  label: string;
  value: number | string | null;
  currency?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">
        {typeof value === "number" ? formatCurrency(value, currency ?? undefined) : value ?? "—"}
      </p>
    </div>
  );
}
