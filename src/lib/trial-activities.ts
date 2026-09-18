// Shared between the public trial signup form and its server handler.
// TRIAL_ACTIVITIES is the dropdown shown on the generic ERP /essai-gratuit
// form (erp.saovia.net and every hostname other than hotel.saovia.net) —
// Restaurant and Hôtel / Résidence / Hébergement are deliberately excluded
// from it and must never be exposed as a sector choice there.
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

// Validation-only superset of TRIAL_ACTIVITIES' values, shared by the client
// (react-hook-form) and server (trial-signup.server.ts) Zod schemas. "hotel"
// is never rendered as a dropdown option anywhere — hotel.saovia.net/essai-gratuit
// (HotelTrialSignupPage) sets it implicitly from the portal's hostname, the
// same way create_trial_workspace already resolves it server-side (see
// supabase/migrations/20260809140000_resolve_trial_platform_type_from_activity.sql,
// unchanged) to platform_type = 'HOTEL'.
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
  "hotel",
] as const;
