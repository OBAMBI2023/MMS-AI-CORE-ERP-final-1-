import type { Tables } from "@/integrations/supabase/types";

export type FiscalStatus = "up_to_date" | "watch" | "due_soon";

export type FiscalConfig = {
  country: string | null;
  taxRegime: string | null;
  declarationFrequency: string | null;
  nextDueDate: string | null;
};

export type FiscalEstimateInput = {
  revenue: number;
  purchases: number;
  expenses: number;
  companySettings?: Pick<Tables<"parametres">, "country" | "tax_regime" | "vat_rate" | "currency"> | null;
  config?: FiscalConfig;
  now?: Date;
};

export type FiscalEstimateResult = {
  estimatedTaxes: number | null;
  reserveAmount: number | null;
  nextDueDate: string | null;
  status: FiscalStatus;
  calculationBase: number;
  rateUsed: number | null;
};

const DEFAULT_FREQUENCY = "Mensuelle";
const DUE_SOON_THRESHOLD_DAYS = 15;
const DAY_IN_MS = 86_400_000;

function clampNumber(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function startOfLocalDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function getTodayDateInputValue(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidFutureDueDate(nextDueDate: string | null | undefined, now = new Date()): nextDueDate is string {
  if (!nextDueDate) return false;
  const due = new Date(nextDueDate);
  if (Number.isNaN(due.getTime())) return false;
  return startOfLocalDay(due) >= startOfLocalDay(now);
}

export function getFiscalStatus(nextDueDate: string | null | undefined, now = new Date()): FiscalStatus {
  if (!isValidFutureDueDate(nextDueDate, now)) return "watch";
  const due = new Date(nextDueDate);
  const diffDays = Math.ceil((startOfLocalDay(due) - startOfLocalDay(now)) / DAY_IN_MS);
  if (diffDays <= DUE_SOON_THRESHOLD_DAYS) return "due_soon";
  return "up_to_date";
}

export function buildFiscalConfig(
  companySettings?: FiscalEstimateInput["companySettings"],
  config?: Partial<FiscalConfig>,
): FiscalConfig {
  const now = new Date();
  const nextDueDate = isValidFutureDueDate(config?.nextDueDate ?? null, now) ? config?.nextDueDate ?? null : null;
  return {
    country: config?.country ?? companySettings?.country ?? null,
    taxRegime: config?.taxRegime ?? companySettings?.tax_regime ?? null,
    declarationFrequency: config?.declarationFrequency ?? DEFAULT_FREQUENCY,
    nextDueDate,
  };
}

export function estimateFiscalReserve(input: FiscalEstimateInput): FiscalEstimateResult {
  const now = input.now ?? new Date();
  const config = buildFiscalConfig(input.companySettings, input.config);
  const revenue = clampNumber(input.revenue);
  const purchases = clampNumber(input.purchases);
  const expenses = clampNumber(input.expenses);
  const calculationBase = Math.max(0, revenue - purchases - expenses);
  const rateUsed = typeof input.companySettings?.vat_rate === "number" ? input.companySettings.vat_rate : null;
  const estimatedTaxes = rateUsed == null ? null : calculationBase * (rateUsed / 100);

  return {
    estimatedTaxes,
    reserveAmount: estimatedTaxes,
    nextDueDate: config.nextDueDate,
    status: getFiscalStatus(config.nextDueDate, now),
    calculationBase,
    rateUsed,
  };
}

export function formatFiscalStatus(status: FiscalStatus): string {
  switch (status) {
    case "up_to_date":
      return "À jour";
    case "due_soon":
      return "Échéance proche";
    case "watch":
    default:
      return "À surveiller";
  }
}
