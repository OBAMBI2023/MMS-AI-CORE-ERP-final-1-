// Shared between the public trial signup form and its server handler.
// Every activity maps to the generic ERP workspace today (see
// create_trial_workspace); hôtel-like activities are the seam for a future
// dedicated HOTEL platform_type without changing this contract again.
export const TRIAL_ACTIVITIES = [
  { value: "hotel", label: "Hôtel" },
  { value: "residence_meublee", label: "Résidence meublée" },
  { value: "auberge", label: "Auberge" },
  { value: "hebergement", label: "Hébergement" },
  { value: "location_courte_duree", label: "Location courte durée" },
  { value: "commerce", label: "Commerce" },
  { value: "boutique", label: "Boutique" },
  { value: "supermarche", label: "Supermarché" },
  { value: "restaurant", label: "Restaurant" },
  { value: "imprimerie", label: "Imprimerie" },
  { value: "services", label: "Services" },
  { value: "autre", label: "Autre" },
] as const;

export const TRIAL_ACTIVITY_CODES = [
  "hotel",
  "residence_meublee",
  "auberge",
  "hebergement",
  "location_courte_duree",
  "commerce",
  "boutique",
  "supermarche",
  "restaurant",
  "imprimerie",
  "services",
  "autre",
] as const;
