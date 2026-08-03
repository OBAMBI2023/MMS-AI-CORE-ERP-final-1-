import test from "node:test";
import assert from "node:assert/strict";
import { normalizeIvorianPhone, renderHotelSms } from "./hotel-sms.ts";
test("normalise un numéro ivoirien valide", () => assert.equal(normalizeIvorianPhone("07 01 02 03 04"), "+2250701020304"));
test("refuse un numéro ivoirien invalide", () => assert.throws(() => normalizeIvorianPhone("1234"), /invalide/));
test("rend un modèle de confirmation", () => assert.match(renderHotelSms("Bonjour {client}, {arrivee}", { client: "Awa", arrivee: "10/08/2026" }), /Awa, 10\/08\/2026/));
