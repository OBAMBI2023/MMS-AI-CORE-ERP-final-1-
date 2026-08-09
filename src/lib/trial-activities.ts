// Shared between the public trial signup form and its server handler.
// "hotel" is the only activity that provisions platform_type = 'HOTEL' (see
// create_trial_workspace); every other activity maps to the generic ERP
// workspace.
export const TRIAL_ACTIVITIES = [
  { value: "hotel", label: "Hôtel / Résidence / Hébergement" },
  { value: "commerce", label: "Commerce / Boutique" },
  { value: "restaurant", label: "Restaurant" },
  { value: "imprimerie", label: "Imprimerie" },
  { value: "services", label: "Services" },
  { value: "autre", label: "Autre" },
] as const;

export const TRIAL_ACTIVITY_CODES = [
  "hotel",
  "commerce",
  "restaurant",
  "imprimerie",
  "services",
  "autre",
] as const;
