export const HOTEL_PAYMENT_METHODS = [
  "Espèces",
  "Wave",
  "Orange Money",
  "MTN Money",
  "Moov Money",
  "Carte",
  "Virement",
  "Autre",
] as const;

export type HotelPaymentMethod = (typeof HOTEL_PAYMENT_METHODS)[number];

export type HotelPaymentStatus = "unpaid" | "partial" | "paid";

export const HOTEL_PAYMENT_STATUS_LABEL: Record<HotelPaymentStatus, string> = {
  unpaid: "Impayée",
  partial: "Partiellement payée",
  paid: "Payée",
};

export const HOTEL_PAYMENT_STATUS_BADGE: Record<HotelPaymentStatus, string> = {
  unpaid: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

export function hotelPaymentStatus(paidTotal: unknown, balanceDue: unknown): HotelPaymentStatus {
  const paid = Number(paidTotal);
  const balance = Number(balanceDue);
  const safePaid = Number.isFinite(paid) ? paid : 0;
  const safeBalance = Number.isFinite(balance) ? balance : 0;
  if (safeBalance <= 0) return "paid";
  return safePaid > 0 ? "partial" : "unpaid";
}
