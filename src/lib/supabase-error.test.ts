import assert from "node:assert/strict";
import test from "node:test";
import { extractErrorDiagnostic, safeErrorMessage } from "./supabase-error.ts";

test("extractErrorDiagnostic preserves structured server error fields", () => {
  assert.deepEqual(extractErrorDiagnostic({
    message: "Le profil existe déjà",
    name: "AuthApiError",
    code: "23505",
    status: 409,
    details: "duplicate key",
    hint: "use another email",
  }), {
    message: "Le profil existe déjà",
    name: "AuthApiError",
    code: "23505",
    status: 409,
    details: "duplicate key",
    hint: "use another email",
    error: undefined,
    cause: undefined,
    data: undefined,
    context: undefined,
  });
});

test("extractErrorDiagnostic recursively unwraps object messages and causes", () => {
  const error = { message: { error: { cause: { data: { message: "Adresse déjà utilisée" } } } } };
  assert.equal(extractErrorDiagnostic(error).message, "Adresse déjà utilisée");
  assert.equal(safeErrorMessage(error, "Échec"), "Adresse déjà utilisée");
});

test("safeErrorMessage rejects an empty serialized object message", () => {
  assert.equal(safeErrorMessage(new Error("{}"), "Échec sécurisé"), "Échec sécurisé");
  assert.equal(
    safeErrorMessage({ message: "{}", cause: { message: "Cause conservée" } }, "Échec sécurisé"),
    "Cause conservée",
  );
});

test("safeErrorMessage returns only a normalized message", () => {
  assert.equal(
    safeErrorMessage({ message: "Erreur\ncontrôlée", details: "secret" }, "Échec"),
    "Erreur contrôlée",
  );
  assert.equal(safeErrorMessage({}, "Échec sécurisé"), "Échec sécurisé");
});
