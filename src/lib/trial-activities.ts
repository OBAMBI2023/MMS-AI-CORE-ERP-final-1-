// Shared between the public trial signup form and its server handler.
// This form provisions only the generic ERP workspace: Restaurant and Hôtel /
// Résidence / Hébergement are deliberately excluded and must never be
// exposed as a sector choice on this page.
export const TRIAL_ACTIVITIES = [
  { value: "commerce", label: "Commerce / Boutique" },
  { value: "imprimerie", label: "Imprimerie" },
  { value: "services", label: "Services" },
  { value: "distribution", label: "Distribution" },
  { value: "btp", label: "BTP / Construction" },
  { value: "agriculture", label: "Agriculture / Agroalimentaire" },
  { value: "transport", label: "Transport / Logistique" },
  { value: "profession_liberale", label: "Profession libérale" },
  { value: "association", label: "Association / Organisation" },
  { value: "autre", label: "Autre" },
] as const;

export const TRIAL_ACTIVITY_CODES = [
  "commerce",
  "imprimerie",
  "services",
  "distribution",
  "btp",
  "agriculture",
  "transport",
  "profession_liberale",
  "association",
  "autre",
] as const;
