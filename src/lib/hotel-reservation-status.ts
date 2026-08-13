export type HotelReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "checked_out"
  | "cancelled"
  | "canceled"
  | "no_show"
  | "expired";

const HOTEL_RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  checked_in: "En séjour",
  in_progress: "En séjour",
  completed: "Terminée",
  checked_out: "Terminée",
  cancelled: "Annulée",
  canceled: "Annulée",
  no_show: "Non présentée",
  expired: "Expirée",
};

const HOTEL_RESERVATION_STATUS_BADGES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  checked_in: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  in_progress: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  checked_out: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  canceled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  no_show: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  expired: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
};

export function getHotelReservationStatusLabel(status: string | null | undefined): string {
  if (!status) return "Statut inconnu";
  return HOTEL_RESERVATION_STATUS_LABELS[status] ?? "Statut inconnu";
}

export function getHotelReservationStatusBadgeClass(status: string | null | undefined): string {
  if (!status) return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300";
  return HOTEL_RESERVATION_STATUS_BADGES[status] ?? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300";
}

