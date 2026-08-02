import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMoney,
  reservationDiscountAmount,
  reservationPaymentStatus,
} from "./hotel-reservation-pdf-values.ts";

test("formate les montants en FCFA sans valeur corrompue", () => {
  assert.equal(formatMoney(20000), "20 000 FCFA");
  assert.equal(formatMoney(Number.NaN), "0 FCFA");
  assert.equal(formatMoney(null), "0 FCFA");
  assert.equal(formatMoney(undefined), "0 FCFA");
});

test("distingue les trois situations de paiement", () => {
  assert.equal(reservationPaymentStatus(0, 20000), "Non payé");
  assert.equal(reservationPaymentStatus(5000, 15000), "Partiellement payé");
  assert.equal(reservationPaymentStatus(20000, 0), "Soldé");
});

test("n’affiche la remise que lorsqu’elle est positive", () => {
  assert.equal(reservationDiscountAmount(0), null);
  assert.equal(reservationDiscountAmount(-1000), null);
  assert.equal(reservationDiscountAmount(Number.NaN), null);
  assert.equal(reservationDiscountAmount(2500), "2 500 FCFA");
});
