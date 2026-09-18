// Metadata dédiée à l'espace public SAOVIA Hôtel (hotel.saovia.net).
// Deux audiences, deux jeux de tags — volontairement séparés de
// PLATFORM_BRANDING (src/config/branding.ts), qui reste la source pour
// l'ERP : ne jamais faire dépendre ce module de PLATFORM_BRANDING ni
// l'inverse.
// - hotelLandingHeadMeta()  → hotel.saovia.net/    (professionnels)
// - hotelVitrineHeadMeta()  → hotel.saovia.net/sitevitrine (visiteurs)
function buildHeadMeta(title: string, description: string, siteName: string) {
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: siteName },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
}

export const HOTEL_LANDING_TITLE = "SAOVIA HOTEL — Logiciel de gestion pour hôtels et résidences";
export const HOTEL_LANDING_DESCRIPTION =
  "La plateforme SAOVIA pour gérer vos chambres, logements, réservations, clients, disponibilités et revenus depuis un seul espace — pour hôtels, résidences, appart'hôtels et maisons d'hôtes.";

export function hotelLandingHeadMeta() {
  return buildHeadMeta(HOTEL_LANDING_TITLE, HOTEL_LANDING_DESCRIPTION, "SAOVIA HOTEL");
}

export const HOTEL_VITRINE_TITLE = "SAOVIA HOTEL — Hôtels & Résidences en Côte d'Ivoire";
export const HOTEL_VITRINE_DESCRIPTION =
  "Découvrez et réservez des hôtels et résidences partenaires SAOVIA en Côte d'Ivoire : établissements vérifiés, logements publiés en temps réel, réservation directe par WhatsApp ou téléphone.";

export function hotelVitrineHeadMeta() {
  return buildHeadMeta(HOTEL_VITRINE_TITLE, HOTEL_VITRINE_DESCRIPTION, "SAOVIA HOTEL");
}
