import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWhatsAppReceiptMessage,
  buildWhatsAppShareUrl,
  containsSensitiveData,
  type WhatsAppReceiptData,
} from "./whatsapp-receipt.ts";

const baseTicket: WhatsAppReceiptData = {
  companyName: "SAOVIA FOOD",
  ticketNumber: "VTE-20260806-4885",
  date: "06/08/2026 00:03",
  customerName: "Client comptoir",
  cashierName: "Nom utilisateur",
  items: [{ name: "COCA", quantity: 1, total: 500 }],
  total: 500,
  paymentMethod: "Espèces",
};

test("un ticket normal génère le message attendu", () => {
  const message = buildWhatsAppReceiptMessage(baseTicket);
  assert.equal(
    message,
    [
      "🧾 *SAOVIA FOOD*",
      "",
      "*Ticket : VTE-20260806-4885*",
      "Date : 06/08/2026 00:03",
      "Client : Client comptoir",
      "Caissier : Nom utilisateur",
      "",
      "*Articles*",
      "• COCA × 1 — 500 F CFA",
      "",
      "*TOTAL : 500 F CFA*",
      "Paiement : Espèces",
      "",
      "Merci pour votre visite.",
    ].join("\n"),
  );
});

test("une URL signée de logo Supabase n'apparaît jamais et déclenche le blocage", () => {
  const signedLogoUrl =
    "https://abcxyz.supabase.co/storage/v1/object/sign/company-assets/logo.png?token=eyJhbGciOi.secret";
  const message = buildWhatsAppReceiptMessage(baseTicket);
  assert.equal(message.includes(signedLogoUrl), false);
  assert.equal(message.includes("supabase.co"), false);
  assert.equal(message.includes("token="), false);
  // le garde-fou doit lui-même détecter ce type d'URL s'il venait à être injecté
  assert.equal(containsSensitiveData(signedLogoUrl), true);
  assert.equal(containsSensitiveData(`${message}\n${signedLogoUrl}`), true);
});

test("un objet company complet n'est jamais sérialisé dans le message", () => {
  const message = buildWhatsAppReceiptMessage(baseTicket);
  assert.equal(message.includes("[object Object]"), false);
});

test("les champs optionnels absents ne produisent pas 'undefined'", () => {
  const { customerName, cashierName, ...withoutOptional } = baseTicket;
  const message = buildWhatsAppReceiptMessage(withoutOptional);
  assert.equal(message.includes("undefined"), false);
  assert.equal(message.includes("null"), false);
  assert.equal(message.includes("Client :"), false);
  assert.equal(message.includes("Caissier :"), false);
});

test("les accents, emojis et caractères spéciaux sont correctement encodés dans l'URL", () => {
  const data: WhatsAppReceiptData = {
    ...baseTicket,
    companyName: "Café L'Été & Fils",
    customerName: "Amélie D'Almeida",
  };
  const message = buildWhatsAppReceiptMessage(data);
  const url = buildWhatsAppShareUrl(message, "");
  const encoded = url.split("text=")[1];
  assert.equal(decodeURIComponent(encoded), message);
});

test("le message n'est pas doublement encodé", () => {
  const message = buildWhatsAppReceiptMessage(baseTicket);
  const url = buildWhatsAppShareUrl(message, "");
  const encoded = url.split("text=")[1];
  // un double encodage produirait encodeURIComponent(encodeURIComponent(message)),
  // donc l'unique encodage doit correspondre exactement à un seul passage.
  assert.equal(encoded, encodeURIComponent(message));
  assert.equal(encoded.includes("%25"), false);
});

test("l'ouverture WhatsApp utilise une URL valide avec numéro", () => {
  const message = buildWhatsAppReceiptMessage(baseTicket);
  const url = buildWhatsAppShareUrl(message, "+221 77 123 45 67");
  assert.match(url, /^https:\/\/wa\.me\/221771234567\?text=/);
});

test("l'ouverture WhatsApp reste valide sans numéro configuré (pas de numéro imposé)", () => {
  const message = buildWhatsAppReceiptMessage(baseTicket);
  const url = buildWhatsAppShareUrl(message, "");
  assert.match(url, /^https:\/\/api\.whatsapp\.com\/send\?text=/);
});

test("le bouton fonctionne avec un ticket contenant plusieurs articles", () => {
  const data: WhatsAppReceiptData = {
    ...baseTicket,
    items: [
      { name: "COCA", quantity: 2, total: 1000 },
      { name: "Sandwich Poulet", quantity: 1, total: 1500 },
      { name: "Eau minérale", quantity: 3, total: 900 },
    ],
    total: 3400,
  };
  const message = buildWhatsAppReceiptMessage(data);
  assert.equal(message.includes("• COCA × 2 — 1 000 F CFA"), true);
  assert.equal(message.includes("• Sandwich Poulet × 1 — 1 500 F CFA"), true);
  assert.equal(message.includes("• Eau minérale × 3 — 900 F CFA"), true);
  assert.equal(message.includes("*TOTAL : 3 400 F CFA*"), true);
});

test("la génération du message ne dépend d'aucun rôle : identique pour admin, caissier et commercial", () => {
  for (const cashierName of ["Admin Dupont", "Caissier Ndiaye", "Commercial Diallo"]) {
    const message = buildWhatsAppReceiptMessage({ ...baseTicket, cashierName });
    assert.equal(message.includes(`Caissier : ${cashierName}`), true);
    assert.equal(containsSensitiveData(message), false);
  }
});

test("les données d'un autre tenant n'apparaissent jamais dans le message", () => {
  const tenantA = buildWhatsAppReceiptMessage(baseTicket);
  const tenantB = buildWhatsAppReceiptMessage({
    ...baseTicket,
    companyName: "Boutique Fatou",
    ticketNumber: "VTE-20260806-9999",
    customerName: "Autre Client",
  });
  assert.equal(tenantA.includes("Boutique Fatou"), false);
  assert.equal(tenantA.includes("VTE-20260806-9999"), false);
  assert.equal(tenantB.includes("SAOVIA FOOD"), false);
  assert.equal(tenantB.includes("VTE-20260806-4885"), false);
});
