import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeCsvCell } from "./hotel-reports-csv.ts";

for (const [input, expected] of [
  ["=SUM(A1:A2)", "'=SUM(A1:A2)"],
  ["+CMD", "'+CMD"],
  ["-1+2", "'-1+2"],
  ["@HYPERLINK(\"https://example.test\")", "\"'@HYPERLINK(\"\"https://example.test\"\")\""],
] as const) {
  test(`neutralise la formule CSV ${input[0]}`, () => {
    assert.equal(sanitizeCsvCell(input), expected);
  });
}

test("détecte une formule après espaces et caractères de contrôle", () => {
  assert.equal(sanitizeCsvCell("  \t\r\n=HYPERLINK(x)"), "\"'  \t\r\n=HYPERLINK(x)\"");
});

test("conserve les textes normaux", () => {
  assert.equal(sanitizeCsvCell("Hébergement"), "Hébergement");
});

test("échappe guillemets, virgules et retours à la ligne", () => {
  assert.equal(sanitizeCsvCell('Chambre "Luxe", étage\n2'), '"Chambre ""Luxe"", étage\n2"');
});

test("ne transforme pas les nombres négatifs en texte", () => {
  assert.equal(sanitizeCsvCell(-12.5), "-12.5");
  assert.equal(sanitizeCsvCell(42), "42");
});

test("conserve les dates générées", () => {
  assert.equal(sanitizeCsvCell("2026-08-02"), "2026-08-02");
});
