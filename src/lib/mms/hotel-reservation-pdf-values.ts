export function formatMoney(value: unknown): string {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  const amount = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(safeValue)
    .replace(/[\u00a0\u202f]/g, " ");
  return `${amount} FCFA`;
}

export function reservationPaymentStatus(paidValue: unknown, balanceValue: unknown): string {
  const paid = Number(paidValue);
  const balance = Number(balanceValue);
  const safePaid = Number.isFinite(paid) ? paid : 0;
  const safeBalance = Number.isFinite(balance) ? balance : 0;
  return safeBalance <= 0 ? "Soldé" : safePaid > 0 ? "Partiellement payé" : "Non payé";
}

export function reservationDiscountAmount(value: unknown): string | null {
  const discount = Number(value);
  return Number.isFinite(discount) && discount > 0 ? formatMoney(discount) : null;
}
