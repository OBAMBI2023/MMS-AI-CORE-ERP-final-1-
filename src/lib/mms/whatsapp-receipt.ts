import { formatCurrency } from "./format.ts";

export type WhatsAppReceiptItem = {
  name: string;
  quantity: number;
  total: number;
};

export type WhatsAppReceiptData = {
  companyName: string;
  ticketNumber: string;
  date: string;
  customerName?: string | null;
  cashierName?: string | null;
  items: WhatsAppReceiptItem[];
  total: number;
  paymentMethod: string;
};

const SENSITIVE_PATTERNS: RegExp[] = [
  /supabase\.co/i,
  /token=/i,
  /storage\/v1/i,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, // UUID interne
  /https?:\/\//i, // aucun lien technique ne doit apparaître dans le reçu client
];

/** Détecte toute donnée technique/sensible qui n'a rien à faire dans un message client. */
export function containsSensitiveData(text: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

function cleanLine(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Construit le message de reçu WhatsApp à partir du seul DTO minimal (aucune autre donnée n'est acceptée). */
export function buildWhatsAppReceiptMessage(data: WhatsAppReceiptData): string {
  const companyName = cleanLine(data.companyName) || "Reçu";
  const customerName = cleanLine(data.customerName);
  const cashierName = cleanLine(data.cashierName);

  const lines: string[] = [`🧾 *${companyName}*`, ""];
  lines.push(`*Ticket : ${cleanLine(data.ticketNumber)}*`);
  lines.push(`Date : ${cleanLine(data.date)}`);
  if (customerName) lines.push(`Client : ${customerName}`);
  if (cashierName) lines.push(`Caissier : ${cashierName}`);
  lines.push("");
  lines.push("*Articles*");
  for (const item of data.items) {
    const name = cleanLine(item.name) || "Article";
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    lines.push(`• ${name} × ${quantity} — ${formatCurrency(item.total)}`);
  }
  lines.push("");
  lines.push(`*TOTAL : ${formatCurrency(data.total)}*`);
  lines.push(`Paiement : ${cleanLine(data.paymentMethod)}`);
  lines.push("");
  lines.push("Merci pour votre visite.");

  return lines.join("\n");
}

/**
 * Construit l'URL de partage WhatsApp. Le numéro est optionnel : sans numéro configuré,
 * le partage ouvre simplement WhatsApp pour laisser l'utilisateur choisir un destinataire.
 */
export function buildWhatsAppShareUrl(message: string, phone?: string | null): string {
  const encodedMessage = encodeURIComponent(message);
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits
    ? `https://wa.me/${digits}?text=${encodedMessage}`
    : `https://api.whatsapp.com/send?text=${encodedMessage}`;
}
