/**
 * Room-nights occupancy calculation shared by the Hotel Rapports page.
 * Mirrors the method used for "Taux d'occupation du mois" on the Hotel
 * Dashboard (src/routes/hotel.index.tsx), generalized to an arbitrary
 * [rangeStart, rangeEndExclusive) window and to a single room subset so it
 * can also drive the per-room breakdown in "Performance des logements".
 */

export const OCCUPANCY_STATUSES = new Set(["confirmed", "checked_in", "checked_out", "completed"]);

export type OccupancyReservationLike = {
  room_id: string;
  check_in: string;
  check_out: string;
  status: string;
};

export function parseIsoDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y || 0, (m || 1) - 1, d || 1);
}

/**
 * Room-nights occupied in `[rangeStart, rangeEndExclusive)`, deduplicated per
 * (room, calendar night). A room can only be occupied once per night no
 * matter how many reservation rows reference it — and the DB's overlap
 * exclusion constraint only blocks `pending`/`confirmed`/`checked_in`
 * bookings, so overlapping `checked_out`/`completed` rows for the same room
 * do exist in practice (duplicate/erroneous bookings, back-to-back stays
 * logged twice, etc.). Summing each reservation's nights independently
 * double-counts those nights and can push occupancy past 100%; unioning the
 * covered nights per room guarantees occupiedNights for a room never exceeds
 * the number of nights in the range, so the resulting rate is mathematically
 * bounded to [0, 100] without needing an artificial clamp.
 */
export function computeOccupancyRate(params: {
  reservations: OccupancyReservationLike[];
  roomCount: number;
  rangeStart: Date;
  rangeEndExclusive: Date;
}): { occupiedNights: number; availableNights: number; rate: number } {
  const { reservations, roomCount, rangeStart, rangeEndExclusive } = params;
  const occupiedRoomNights = new Set<string>();
  for (const r of reservations) {
    if (!OCCUPANCY_STATUSES.has(r.status)) continue;
    const inDate = parseIsoDate(r.check_in);
    const outDate = parseIsoDate(r.check_out);
    const start = inDate < rangeStart ? rangeStart : inDate;
    const end = outDate > rangeEndExclusive ? rangeEndExclusive : outDate;
    const startDayIndex = Math.round((start.getTime() - rangeStart.getTime()) / 86_400_000);
    const endDayIndex = Math.round((end.getTime() - rangeStart.getTime()) / 86_400_000);
    for (let day = startDayIndex; day < endDayIndex; day++) {
      occupiedRoomNights.add(`${r.room_id}#${day}`);
    }
  }
  const occupiedNights = occupiedRoomNights.size;
  const days = Math.max(0, Math.round((rangeEndExclusive.getTime() - rangeStart.getTime()) / 86_400_000));
  const availableNights = roomCount * days;
  const rate = availableNights > 0 ? Math.round((occupiedNights / availableNights) * 100) : 0;
  return { occupiedNights, availableNights, rate };
}
