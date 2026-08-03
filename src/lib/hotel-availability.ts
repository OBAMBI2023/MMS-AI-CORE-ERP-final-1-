export const BLOCKING_RESERVATION_STATUSES = new Set(["pending", "confirmed", "checked_in"]);

type ReservationPeriod = {
  id?: string;
  tenant_id?: string;
  room_id: string;
  check_in: string;
  check_out: string;
  status: string;
};

export function periodsOverlap(
  firstArrival: string,
  firstDeparture: string,
  secondArrival: string,
  secondDeparture: string,
) {
  return firstArrival < secondDeparture && firstDeparture > secondArrival;
}

export function roomIsAvailable(
  room: { id: string; status: string; tenant_id?: string },
  reservations: ReservationPeriod[],
  arrival: string,
  departure: string,
  ignoredReservationId?: string | null,
) {
  if (["maintenance", "out_of_service"].includes(room.status)) return false;
  if (!arrival || !departure || departure <= arrival) return true;
  return !reservations.some(
    (reservation) =>
      reservation.room_id === room.id &&
      (!room.tenant_id || !reservation.tenant_id || reservation.tenant_id === room.tenant_id) &&
      (!ignoredReservationId || reservation.id !== ignoredReservationId) &&
      BLOCKING_RESERVATION_STATUSES.has(reservation.status) &&
      periodsOverlap(arrival, departure, reservation.check_in, reservation.check_out),
  );
}

export function findReservationConflict(
  reservations: ReservationPeriod[],
  roomId: string,
  arrival: string,
  departure: string,
  ignoredReservationId?: string | null,
  tenantId?: string | null,
) {
  if (!roomId || !arrival || !departure || departure <= arrival) return undefined;
  return reservations.find(
    (reservation) =>
      reservation.room_id === roomId &&
      (!tenantId || !reservation.tenant_id || reservation.tenant_id === tenantId) &&
      (!ignoredReservationId || reservation.id !== ignoredReservationId) &&
      BLOCKING_RESERVATION_STATUSES.has(reservation.status) &&
      periodsOverlap(arrival, departure, reservation.check_in, reservation.check_out),
  );
}
