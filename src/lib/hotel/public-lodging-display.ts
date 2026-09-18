// Helpers d'affichage partagés entre les cartes de logement de la vitrine
// (accueil, catalogue, page établissement) — évite de dupliquer les libellés
// de type et la construction du lien WhatsApp à chaque endroit.
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  studio: "Studio",
  chambre: "Chambre",
  appartement: "Appartement",
  suite: "Suite",
  villa: "Villa",
  maison: "Maison",
  autre: "Logement",
};

export function propertyTypeLabel(propertyType: string | null): string | null {
  if (!propertyType) return null;
  return PROPERTY_TYPE_LABELS[propertyType] ?? propertyType;
}

export function lodgingWhatsappHref(whatsapp: string, hotelName: string, lodgingName?: string) {
  const digits = whatsapp.replace(/[^\d]/g, "");
  const message = lodgingName
    ? `Bonjour, je souhaite réserver "${lodgingName}" à ${hotelName}.`
    : `Bonjour, je souhaite obtenir des informations sur ${hotelName}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
