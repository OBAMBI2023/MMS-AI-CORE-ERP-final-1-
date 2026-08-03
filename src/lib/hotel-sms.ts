export const HOTEL_SMS_TYPES = ["confirmation", "arrival_reminder", "departure_reminder", "balance_reminder", "cancellation", "thanks"] as const;
export type HotelSmsType = (typeof HOTEL_SMS_TYPES)[number];
export interface SMSProvider { readonly name: string; send(input: { to: string; message: string; idempotencyKey: string }): Promise<{ status: "sent" | "pending"; providerMessageId?: string }>; }
export function normalizeIvorianPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("225")) digits = digits.slice(3);
  if (digits.length !== 10 || !/^(01|05|07)\d{8}$/.test(digits)) throw new Error("Numéro ivoirien invalide. Format attendu : +225 suivi de 10 chiffres.");
  return `+225${digits}`;
}
export const hotelSmsTemplates: Record<HotelSmsType, string> = {
  confirmation: "Bonjour {client}, votre réservation est confirmée du {arrivee} au {depart}. Chambre {chambre}.",
  arrival_reminder: "Bonjour {client}, rappel : votre arrivée est prévue le {arrivee}. Nous vous attendons avec plaisir.",
  departure_reminder: "Bonjour {client}, rappel : votre départ est prévu le {depart}. Merci pour votre séjour.",
  balance_reminder: "Bonjour {client}, le solde restant de votre séjour est de {solde}.",
  cancellation: "Bonjour {client}, votre réservation du {arrivee} au {depart} a été annulée.",
  thanks: "Bonjour {client}, merci d’avoir séjourné chez nous. Au plaisir de vous accueillir à nouveau.",
};
export function renderHotelSms(template: string, values: Record<string, string>): string { return template.replace(/\{([a-z]+)\}/gi, (token, key: string) => values[key] ?? token); }
