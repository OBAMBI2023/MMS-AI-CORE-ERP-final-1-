import assert from "node:assert/strict";
import test from "node:test";
import { hotelStayTotals } from "./hotel-calculations.ts";
test("calcule nuits, remise, extras et solde", () =>
  assert.deepEqual(hotelStayTotals("2026-08-01", "2026-08-04", 100, 20, 30, 110), {
    nights: 3,
    accommodationTotal: 280,
    grandTotal: 310,
    balanceDue: 200,
  }));
test("sans avance, le solde correspond au total", () =>
  assert.equal(hotelStayTotals("2026-08-01", "2026-08-03", 50000, 0, 0, 0).balanceDue, 100000));
test("une avance partielle réduit le solde", () =>
  assert.equal(hotelStayTotals("2026-08-01", "2026-08-03", 50000, 0, 0, 40000).balanceDue, 60000));
test("une réservation soldée a un solde nul", () =>
  assert.equal(hotelStayTotals("2026-08-01", "2026-08-03", 50000, 0, 0, 100000).balanceDue, 0));
test("la remise est déduite avant l’avance", () =>
  assert.deepEqual(hotelStayTotals("2026-08-01", "2026-08-04", 50000, 10000, 0, 40000), {
    nights: 3,
    accommodationTotal: 140000,
    grandTotal: 140000,
    balanceDue: 100000,
  }));
test("une période invalide ne produit pas de nuits négatives", () =>
  assert.equal(hotelStayTotals("2026-08-04", "2026-08-01", 100).nights, 0));
