import assert from "node:assert/strict";
import test from "node:test";
import { platformTypeForSector, suggestedPackCode, trialRequestSchema } from "./public-trial-policy.ts";

const valid = { companyName: "MMS Test", adminName: "Awa Kone", sector: "Commerce", termsAccepted: true, email: "AWA@EXAMPLE.COM", phone: "0700000000", password: "secret123", confirmation: "secret123", turnstileToken: "token" } as const;
test("valide et normalise une demande complète", () => { assert.equal(trialRequestSchema.parse(valid).email, "awa@example.com"); });
test("refuse deux mots de passe différents", () => { assert.equal(trialRequestSchema.safeParse({ ...valid, confirmation: "different" }).success, false); });
test("refuse un secteur non autorisé", () => { assert.equal(trialRequestSchema.safeParse({ ...valid, sector: "Crypto" }).success, false); });
test("refuse l’absence de secteur", () => { assert.equal(trialRequestSchema.safeParse({ ...valid, sector: undefined }).success, false); });
test("exige l’acceptation des conditions", () => { assert.equal(trialRequestSchema.safeParse({ ...valid, termsAccepted: false }).success, false); });
test("suggère un pack selon l’activité", () => { assert.equal(suggestedPackCode("Restaurant"), "restaurant"); assert.equal(suggestedPackCode("Autre"), "commerce"); });

test("dérive ERP pour les secteurs non hôteliers", () => {
  assert.equal(platformTypeForSector("Commerce"), "ERP");
  assert.equal(platformTypeForSector("Services"), "ERP");
  assert.equal(platformTypeForSector("Restaurant"), "ERP");
});
test("dérive HOTEL pour le secteur Hôtel / Résidence / Hébergement", () => {
  assert.equal(platformTypeForSector("Hôtel / Résidence / Hébergement"), "HOTEL");
});
