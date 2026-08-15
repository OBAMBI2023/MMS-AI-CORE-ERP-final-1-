/** Centralized French label mapping for PostHog technical event names.
 *  Used across the Super Admin Analytics UI so a technical name like
 *  `hotel_invoice_payment_recorded` never leaks into a visible label. */
export const EVENT_LABELS: Record<string, string> = {
  quote_created: "Devis créé",
  quote_payment_recorded: "Paiement de devis enregistré",
  invoice_created: "Facture créée",
  invoice_sent: "Facture envoyée",
  invoice_payment_recorded: "Paiement de facture enregistré",
  sale_created: "Vente créée",
  sale_completed: "Vente terminée",
  sale_cancelled: "Vente annulée",
  hotel_reservation_created: "Réservation créée",
  hotel_reservation_updated: "Réservation modifiée",
  hotel_checkin_completed: "Arrivée enregistrée",
  hotel_checkout_completed: "Départ enregistré",
  hotel_payment_recorded: "Paiement de réservation enregistré",
  hotel_invoice_created: "Facture Hôtel créée",
  hotel_invoice_payment_recorded: "Paiement de facture Hôtel enregistré",
  frontend_error: "Erreur frontend",
};

export function getEventLabel(eventName: string): string {
  const known = EVENT_LABELS[eventName];
  if (known) return known;
  if (!eventName) return eventName;
  const readable = eventName.replace(/_/g, " ");
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}
