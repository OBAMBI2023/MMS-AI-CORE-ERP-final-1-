import assert from "node:assert/strict";
import test from "node:test";
import { safeHotelPdfNumber, safeHotelPdfText, validHotelPdfDate } from "./hotel-pdf-values.ts";

test("neutralise les montants invalides", () => {
  for (const value of [Number.NaN, Infinity, -Infinity, null, undefined, "montant invalide"]) {
    assert.equal(safeHotelPdfNumber(value), 0);
  }
});

test("accepte les montants avec séparateurs français", () => {
  assert.equal(safeHotelPdfNumber("125 000"), 125000);
});

test("neutralise les textes et dates corrompus", () => {
  for (const value of [null, undefined, Number.NaN, Infinity, "undefined", "null"]) assert.equal(safeHotelPdfText(value), "—");
  assert.equal(validHotelPdfDate("date-invalide"), null);
});
