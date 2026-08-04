import assert from "node:assert/strict";
import test from "node:test";
import { hotelPaymentStatus } from "./hotel-invoicing.ts";

test("calcule les statuts de paiement sans sélection manuelle", () => {
  assert.equal(hotelPaymentStatus(100, 0, 0), "non_paye");
  assert.equal(hotelPaymentStatus(100, 25, 1), "avance_versee");
  assert.equal(hotelPaymentStatus(100, 50, 2), "partiellement_paye");
  assert.equal(hotelPaymentStatus(100, 100, 2), "solde");
  assert.equal(hotelPaymentStatus(100, 120, 3), "solde");
  assert.equal(hotelPaymentStatus(100, 0, 1, true), "rembourse");
});
