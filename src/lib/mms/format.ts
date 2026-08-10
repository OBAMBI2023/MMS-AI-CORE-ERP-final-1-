export const DEFAULT_CURRENCY = "XOF";

let activeCurrency = DEFAULT_CURRENCY;
let activeDecimals: number | undefined;

export function normalizeCurrency(currency?: string | null): string {
  const code = currency?.trim().toUpperCase();
  return !code || code === "FCFA" ? DEFAULT_CURRENCY : code;
}

export function configureCurrency(currency?: string | null, decimals?: number | null) {
  activeCurrency = normalizeCurrency(currency);
  activeDecimals = typeof decimals === "number" ? decimals : undefined;
}

export function getCurrency(): string {
  return activeCurrency;
}

export function formatCurrency(
  amount: number,
  currency = activeCurrency,
  decimals = activeDecimals,
): string {
  const normalizedCurrency = normalizeCurrency(currency);
  const fractionDigits = decimals ?? (normalizedCurrency === "XOF" ? 0 : 2);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
    .format(Number.isFinite(Number(amount)) ? Number(amount) : 0)
    .replace(/\u202F|\u00A0/g, " ");
}

/** Joins a compact amount's segments with non-breaking spaces so the unit
 * (k/M/Md) and currency suffix can never end up alone on the next line. */
function joinCompact(...parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

export function formatCurrencyCompact(amount: number, currency = activeCurrency): string {
  const n = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const suffix = normalizeCurrency(currency) === "XOF" ? "FCFA" : normalizeCurrency(currency);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    const value = (abs / 1_000_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    return joinCompact(`${sign}${value}`, "Md", suffix);
  }
  if (abs >= 1_000_000) {
    const value = (abs / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    return joinCompact(`${sign}${value}`, "M", suffix);
  }
  if (abs >= 1_000) {
    const value = (abs / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
    return joinCompact(`${sign}${value}`, "k", suffix);
  }
  return joinCompact(`${sign}${abs.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`, suffix);
}

export function formatNumber(n: number): string {
  return n.toLocaleString("fr-FR");
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function makeNumber(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${y}${m}${day}-${rnd}`;
}
