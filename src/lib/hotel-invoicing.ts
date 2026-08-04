export type HotelPaymentStatus =
  | "non_paye"
  | "avance_versee"
  | "partiellement_paye"
  | "solde"
  | "rembourse";

export function hotelPaymentStatus(
  total: number,
  paid: number,
  paymentCount: number,
  refunded = false,
): HotelPaymentStatus {
  if (refunded) return "rembourse";
  const safeTotal = Math.max(0, Number(total) || 0);
  const safePaid = Math.max(0, Number(paid) || 0);
  if (safePaid >= safeTotal) return "solde";
  if (safePaid === 0) return "non_paye";
  return paymentCount <= 1 ? "avance_versee" : "partiellement_paye";
}

export const hotelPaymentStatusLabels: Record<HotelPaymentStatus, string> = {
  non_paye: "Non payé",
  avance_versee: "Avance versée",
  partiellement_paye: "Partiellement payé",
  solde: "Soldé",
  rembourse: "Remboursé",
};

