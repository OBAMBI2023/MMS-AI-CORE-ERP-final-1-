import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateEarlyCheckoutDates, findReservationConflict, periodsOverlap, roomIsAvailable } from "./hotel-availability.ts";

test("une arrivée le jour du départ précédent est disponible", () => {
  assert.equal(periodsOverlap("2026-08-05", "2026-08-07", "2026-08-07", "2026-08-10"), false);
});
test("un chevauchement actif bloque le logement", () => {
  assert.equal(
    roomIsAvailable(
      { id: "room-1", status: "available" },
      [{ room_id: "room-1", check_in: "2026-08-05", check_out: "2026-08-08", status: "confirmed" }],
      "2026-08-07",
      "2026-08-10",
    ),
    false,
  );
});
test("seuls pending, confirmed et checked_in bloquent une chambre", () => {
  const ended = [
    { room_id: "room-1", check_in: "2026-08-05", check_out: "2026-08-08", status: "completed" },
  ];
  for (const status of ["cancelled", "no_show", "checked_out", "completed"]) {
    assert.equal(
      roomIsAvailable(
        { id: "room-1", status: "available" },
        [{ ...ended[0], status }],
        "2026-08-07",
        "2026-08-10",
      ),
      true,
    );
  }
  assert.equal(
    roomIsAvailable({ id: "room-1", status: "maintenance" }, [], "2026-08-07", "2026-08-10"),
    false,
  );
});

test("un départ anticipé conserve le check_in et ajuste la date de départ", () => {
  const result = calculateEarlyCheckoutDates("2026-08-01", "2026-08-10", "2026-08-05");
  assert.deepEqual(result, {
    checkIn: "2026-08-01",
    checkOut: "2026-08-05",
    isEarlyDeparture: true,
  });
});

test("la reservation modifiee est exclue de sa propre verification", () => {
  const rows = [
    {
      id: "reservation-1",
      room_id: "room-1",
      check_in: "2026-08-05",
      check_out: "2026-08-08",
      status: "confirmed",
    },
  ];
  assert.equal(
    findReservationConflict(rows, "room-1", "2026-08-06", "2026-08-09", "reservation-1"),
    undefined,
  );
});

test("une réservation peut changer vers une chambre disponible et libère l'ancienne", () => {
  const rows = [
    { id: "current", tenant_id: "tenant-1", room_id: "room-1", check_in: "2026-08-05", check_out: "2026-08-08", status: "confirmed" },
  ];
  assert.equal(findReservationConflict(rows, "room-2", "2026-08-05", "2026-08-08", "current", "tenant-1"), undefined);
  const updated = rows.map((row) => row.id === "current" ? { ...row, room_id: "room-2" } : row);
  assert.equal(updated[0].room_id, "room-2");
  assert.equal(roomIsAvailable({ id: "room-1", tenant_id: "tenant-1", status: "available" }, updated, "2026-08-05", "2026-08-08"), true);
});

test("une chambre occupée refuse le changement et laisse les données intactes", () => {
  const current = { id: "current", tenant_id: "tenant-1", room_id: "room-1", check_in: "2026-08-05", check_out: "2026-08-08", status: "confirmed", nightly_rate: 100 };
  const rows = [current, { id: "other", tenant_id: "tenant-1", room_id: "room-2", check_in: "2026-08-06", check_out: "2026-08-09", status: "pending", nightly_rate: 80 }];
  assert.equal(findReservationConflict(rows, "room-2", "2026-08-07", "2026-08-10", "current", "tenant-1")?.id, "other");
  assert.deepEqual(rows[0], current);
});

test("tarif et dates sans conflit peuvent être modifiés, les dates en conflit sont refusées", () => {
  const rows = [
    { id: "current", tenant_id: "tenant-1", room_id: "room-1", check_in: "2026-08-05", check_out: "2026-08-08", status: "confirmed" },
    { id: "other", tenant_id: "tenant-1", room_id: "room-1", check_in: "2026-08-12", check_out: "2026-08-15", status: "checked_in" },
  ];
  assert.equal(findReservationConflict(rows, "room-1", "2026-08-05", "2026-08-08", "current", "tenant-1"), undefined);
  assert.equal(findReservationConflict(rows, "room-1", "2026-08-08", "2026-08-11", "current", "tenant-1"), undefined);
  assert.equal(findReservationConflict(rows, "room-1", "2026-08-11", "2026-08-13", "current", "tenant-1")?.id, "other");
});

test("les conflits sont strictement isolés par tenant", () => {
  const rows = [
    { id: "other", tenant_id: "tenant-2", room_id: "shared-room-key", check_in: "2026-08-05", check_out: "2026-08-08", status: "confirmed" },
  ];
  assert.equal(findReservationConflict(rows, "shared-room-key", "2026-08-06", "2026-08-07", null, "tenant-1"), undefined);
});

test("la migration additive protège les UPDATE sans comparer la réservation à elle-même", () => {
  const sql = readFileSync(
    new URL("../../supabase/migrations/20260803200000_prevent_hotel_double_booking.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /reservation\.tenant_id\s*=\s*NEW\.tenant_id/i);
  assert.match(sql, /reservation\.room_id\s*=\s*NEW\.room_id/i);
  assert.match(sql, /reservation\.id\s*<>\s*NEW\.id/i);
  assert.match(sql, /reservation\.status IN \('pending', 'confirmed', 'checked_in'\)/i);
  assert.match(sql, /NEW\.check_in\s*<\s*reservation\.check_out/i);
  assert.match(sql, /NEW\.check_out\s*>\s*reservation\.check_in/i);
  assert.match(sql, /BEFORE INSERT OR UPDATE OF tenant_id,room_id,check_in,check_out,status/i);
});
