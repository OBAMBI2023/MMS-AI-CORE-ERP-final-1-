import { z } from "zod";

export const ERP_PACK_CODES = ["commerce", "services", "restaurant", "complet"] as const;
export type ErpPackCode = (typeof ERP_PACK_CODES)[number];

export const trialRequestSchema = z.object({
  companyName: z.string().trim().min(2, "Le nom de l’entreprise est requis.").max(120),
  adminName: z.string().trim().min(2, "Le nom de l’administrateur est requis.").max(120),
  platformType: z.enum(["ERP", "HOTEL"]),
  packCode: z.enum(ERP_PACK_CODES).optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter les conditions." }),
  }),
  email: z.string().trim().email("Adresse e-mail invalide.").max(254).transform((v) => v.toLowerCase()),
  phone: z.string().trim().min(6, "Numéro de téléphone invalide.").max(30),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(72),
  confirmation: z.string(),
  turnstileToken: z.string().min(1, "Veuillez confirmer que vous n’êtes pas un robot."),
}).superRefine((value, context) => {
  if (value.password !== value.confirmation) context.addIssue({ code: "custom", path: ["confirmation"], message: "Les mots de passe ne correspondent pas." });
});

export type TrialRequestInput = z.infer<typeof trialRequestSchema>;

// Kept for compatibility with partner-managed trial configuration.
export function suggestedPackCode(activity: string) {
  if (activity === "Restaurant") return "restaurant";
  if (activity === "Hôtel / Résidence") return "hotel";
  if (activity === "Imprimerie") return "imprimerie";
  if (activity === "Services") return "services";
  return "commerce";
}
