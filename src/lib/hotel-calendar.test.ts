import test from "node:test";
import assert from "node:assert/strict";
import { isTenantCalendarReservation, reservationCrossesPeriod, reservationOccupiesDay } from "./hotel-calendar.ts";

const reservation = { id: "r1", tenant_id: "tenant-a", room_id: "room-1", guest_id: "g1", check_in: "2026-08-10", check_out: "2026-08-12", status: "confirmed" };
test("l'arrivée est occupée et le départ libère le logement", () => {
  assert.equal(reservationOccupiesDay(reservation, "2026-08-10"), true);
  assert.equal(reservationOccupiesDay(reservation, "2026-08-11"), true);
  assert.equal(reservationOccupiesDay(reservation, "2026-08-12"), false);
});
test("les réservations annulées et no-show ne bloquent pas", () => {
  assert.equal(reservationOccupiesDay({ ...reservation, status: "cancelled" }, "2026-08-10"), false);
  assert.equal(reservationOccupiesDay({ ...reservation, status: "no_show" }, "2026-08-10"), false);
});
test("la période ne conserve que les séjours qui la croisent", () => {
  assert.equal(reservationCrossesPeriod(reservation, "2026-08-01", "2026-09-01"), true);
  assert.equal(reservationCrossesPeriod(reservation, "2026-08-12", "2026-09-01"), false);
});
test("les données restent isolées par tenant", () => {
  assert.equal(isTenantCalendarReservation(reservation, "tenant-a"), true);
  assert.equal(isTenantCalendarReservation(reservation, "tenant-b"), false);
});
