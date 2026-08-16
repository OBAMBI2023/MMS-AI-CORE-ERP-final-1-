import test from "node:test";
import assert from "node:assert/strict";
import { computeOccupancyRate, type OccupancyReservationLike } from "./hotel-occupancy.ts";

const reservation = (
  room_id: string,
  check_in: string,
  check_out: string,
  status = "checked_out",
): OccupancyReservationLike => ({ room_id, check_in, check_out, status });

const TEN_DAY_RANGE = { rangeStart: new Date(2026, 7, 1), rangeEndExclusive: new Date(2026, 7, 11) }; // 10 days

test("10 chambres, 10 jours, 50 nuitées occupées -> 50%", () => {
  const reservations = Array.from({ length: 5 }, (_, i) => reservation(`room-${i}`, "2026-08-01", "2026-08-11"));
  const result = computeOccupancyRate({ reservations, roomCount: 10, ...TEN_DAY_RANGE });
  assert.equal(result.occupiedNights, 50);
  assert.equal(result.availableNights, 100);
  assert.equal(result.rate, 50);
});

test("10 chambres, 10 jours, aucune occupation -> 0%", () => {
  const result = computeOccupancyRate({ reservations: [], roomCount: 10, ...TEN_DAY_RANGE });
  assert.equal(result.occupiedNights, 0);
  assert.equal(result.rate, 0);
});

test("10 chambres, 10 jours, toutes occupées chaque nuit -> 100%", () => {
  const reservations = Array.from({ length: 10 }, (_, i) => reservation(`room-${i}`, "2026-08-01", "2026-08-11"));
  const result = computeOccupancyRate({ reservations, roomCount: 10, ...TEN_DAY_RANGE });
  assert.equal(result.occupiedNights, 100);
  assert.equal(result.rate, 100);
});

test("2 voyageurs dans la même chambre 3 nuits -> 3 nuitées-chambres, pas 6", () => {
  // The algorithm has no notion of guest count at all — one reservation row
  // for one room always yields exactly its own nights, regardless of how
  // many travelers are attached to it.
  const reservations = [reservation("room-1", "2026-08-01", "2026-08-04")];
  const result = computeOccupancyRate({
    reservations,
    roomCount: 1,
    rangeStart: new Date(2026, 7, 1),
    rangeEndExclusive: new Date(2026, 7, 11),
  });
  assert.equal(result.occupiedNights, 3);
});

test("réservation annulée de 5 nuits -> 0 nuitée occupée", () => {
  const reservations = [reservation("room-1", "2026-08-01", "2026-08-06", "cancelled")];
  const result = computeOccupancyRate({ reservations, roomCount: 1, ...TEN_DAY_RANGE });
  assert.equal(result.occupiedNights, 0);
});

test("séjour du 30 juillet au 3 août -> seules les nuits d'août comptent", () => {
  const reservations = [reservation("room-1", "2026-07-30", "2026-08-03")];
  const result = computeOccupancyRate({ reservations, roomCount: 1, ...TEN_DAY_RANGE });
  // Full stay nights: Jul30, Jul31, Aug1, Aug2 (Aug3 is checkout, excluded).
  // Only Aug1 and Aug2 fall inside the August range.
  assert.equal(result.occupiedNights, 2);
});

test("deux lignes accidentelles pour la même chambre et la même nuit -> une seule nuitée-chambre", () => {
  const reservations = [
    reservation("room-1", "2026-08-01", "2026-08-02"),
    reservation("room-1", "2026-08-01", "2026-08-02"),
  ];
  const result = computeOccupancyRate({ reservations, roomCount: 1, ...TEN_DAY_RANGE });
  assert.equal(result.occupiedNights, 1);
});

test("réservations checked_out qui se chevauchent sur la même chambre ne dépassent jamais 100%", () => {
  // Regression case for the dashboard's 253% bug: the DB overlap-exclusion
  // constraint only blocks pending/confirmed/checked_in bookings, so
  // overlapping checked_out rows for the same room do occur in real data.
  const reservations = [
    reservation("room-1", "2026-08-01", "2026-08-11", "checked_out"),
    reservation("room-1", "2026-08-01", "2026-08-11", "checked_out"),
    reservation("room-1", "2026-08-05", "2026-08-11", "checked_out"),
  ];
  const result = computeOccupancyRate({ reservations, roomCount: 1, ...TEN_DAY_RANGE });
  assert.equal(result.occupiedNights, 10);
  assert.equal(result.rate, 100);
});
