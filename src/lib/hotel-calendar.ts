import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { BLOCKING_RESERVATION_STATUSES } from "./hotel-availability.ts";

export type HotelCalendarView = "month" | "week";
export type CalendarReservation = { id: string; tenant_id: string; room_id: string; guest_id: string | null; check_in: string; check_out: string; status: string };

export function calendarPeriod(date: Date, view: HotelCalendarView) {
  const start = view === "month" ? startOfMonth(date) : startOfWeek(date, { weekStartsOn: 1 });
  const endInclusive = view === "month" ? endOfMonth(date) : endOfWeek(date, { weekStartsOn: 1 });
  return { start, endExclusive: addDays(endInclusive, 1), days: eachDayOfInterval({ start, end: endInclusive }) };
}
export function isoDay(date: Date) { return format(date, "yyyy-MM-dd"); }
export function periodTitle(date: Date, view: HotelCalendarView) {
  if (view === "month") return format(date, "MMMM yyyy", { locale: fr });
  const { start, endExclusive } = calendarPeriod(date, view);
  return `${format(start, "d MMM", { locale: fr })} – ${format(addDays(endExclusive, -1), "d MMM yyyy", { locale: fr })}`;
}
export function reservationOccupiesDay(reservation: CalendarReservation, day: string) {
  return BLOCKING_RESERVATION_STATUSES.has(reservation.status) && reservation.check_in <= day && reservation.check_out > day;
}
export function reservationForDay(reservations: CalendarReservation[], roomId: string, day: string) {
  return reservations.find((reservation) => reservation.room_id === roomId && reservationOccupiesDay(reservation, day));
}
export function reservationCrossesPeriod(reservation: CalendarReservation, start: string, endExclusive: string) {
  return reservation.check_in < endExclusive && reservation.check_out > start;
}
export function isTenantCalendarReservation(reservation: CalendarReservation, tenantId: string) { return reservation.tenant_id === tenantId; }
