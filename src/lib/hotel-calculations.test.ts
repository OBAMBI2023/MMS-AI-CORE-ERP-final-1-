import assert from "node:assert/strict";import test from "node:test";import {hotelStayTotals} from "./hotel-calculations.ts";
test("calcule nuits, remise, extras et solde",()=>assert.deepEqual(hotelStayTotals("2026-08-01","2026-08-04",100,20,30,110),{nights:3,accommodationTotal:280,grandTotal:310,balanceDue:200}));
test("une période invalide ne produit pas de nuits négatives",()=>assert.equal(hotelStayTotals("2026-08-04","2026-08-01",100).nights,0));
