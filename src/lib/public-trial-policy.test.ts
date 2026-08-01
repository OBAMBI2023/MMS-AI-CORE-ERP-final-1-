import assert from "node:assert/strict";
import test from "node:test";
import { suggestedPackCode, trialRequestSchema } from "./public-trial-policy.ts";

const valid = { companyName: "MMS Test", adminName: "Awa Kone", activity: "Commerce", email: "AWA@EXAMPLE.COM", phone: "0700000000", password: "secret123", confirmation: "secret123", turnstileToken: "token" };
test("valide et normalise une demande complète", () => { assert.equal(trialRequestSchema.parse(valid).email, "awa@example.com"); });
test("refuse deux mots de passe différents", () => { assert.equal(trialRequestSchema.safeParse({ ...valid, confirmation: "different" }).success, false); });
test("refuse une activité non autorisée", () => { assert.equal(trialRequestSchema.safeParse({ ...valid, activity: "Crypto" }).success, false); });
test("suggère un pack selon l’activité", () => { assert.equal(suggestedPackCode("Restaurant"), "restaurant"); assert.equal(suggestedPackCode("Autre"), "commerce"); });
