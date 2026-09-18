// Metadata dédiée à l'espace public SAOVIA Hôtel (hotel.saovia.net).
// Deux audiences, deux jeux de tags — volontairement séparés de
// PLATFORM_BRANDING (src/config/branding.ts), qui reste la source pour
// l'ERP : ne jamais faire dépendre ce module de PLATFORM_BRANDING ni
// l'inverse.
// - hotelLandingHeadMeta()  → hotel.saovia.net/    (professionnels)
// - hotelVitrineHeadMeta()  → hotel.saovia.net/sitevitrine (visiteurs)
function buildHeadMeta(
  title: string,
  description: string,
  siteName: string,
  og?: { title: string; description: string },
) {
  const ogTitle = og?.title ?? title;
  const ogDescription = og?.description ?? description;
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: siteName },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: ogDescription },
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

// hotelTrialSignupHeadMeta() → hotel.saovia.net/essai-gratuit (inscription professionnels)
export const HOTEL_TRIAL_SIGNUP_TITLE = "Essai gratuit 7 jours | SAOVIA HOTEL";
export const HOTEL_TRIAL_SIGNUP_DESCRIPTION =
  "Créez votre espace SAOVIA HOTEL et gérez simplement votre hôtel ou votre résidence. Essai gratuit 7 jours, sans carte bancaire.";
// OG/Twitter volontairement distincts du title/description (formulés pour le
// partage social plutôt que pour l'onglet du navigateur).
export const HOTEL_TRIAL_SIGNUP_OG_TITLE = "SAOVIA HOTEL — Essai gratuit 7 jours";
export const HOTEL_TRIAL_SIGNUP_OG_DESCRIPTION =
  "Une plateforme simple et centralisée pour gérer votre hôtel, vos chambres, vos réservations et votre activité.";

export function hotelTrialSignupHeadMeta() {
  return buildHeadMeta(HOTEL_TRIAL_SIGNUP_TITLE, HOTEL_TRIAL_SIGNUP_DESCRIPTION, "SAOVIA HOTEL", {
    title: HOTEL_TRIAL_SIGNUP_OG_TITLE,
    description: HOTEL_TRIAL_SIGNUP_OG_DESCRIPTION,
  });
}

// hotelLoginHeadMeta() → hotel.saovia.net/login (connexion professionnels)
export const HOTEL_LOGIN_TITLE = "Connexion | SAOVIA HOTEL";
export const HOTEL_LOGIN_DESCRIPTION =
  "Connectez-vous à votre espace de gestion SAOVIA HOTEL pour piloter vos chambres, réservations, clients et revenus.";

export function hotelLoginHeadMeta() {
  return buildHeadMeta(HOTEL_LOGIN_TITLE, HOTEL_LOGIN_DESCRIPTION, "SAOVIA HOTEL");
}
