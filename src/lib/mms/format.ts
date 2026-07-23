export function formatCurrency(amount: number): string {
  // Use a regular space instead of the non-breaking space (U+202F or U+00A0) 
  // to ensure compatibility with the PDF generator, which can struggle with these characters.
  return (
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
      .format(Math.round(amount || 0))
      .replace(/\u202F|\u00A0/g, " ") + " FCFA"
  );
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
