import { createFileRoute } from "@tanstack/react-router";
import { TrialSignupPage } from "@/marketing/pages/TrialSignupPage";

export const Route = createFileRoute("/")({
  component: TrialSignupPage,
  head: () => ({
    meta: [
      { title: "SAOVIA — Essayez gratuitement pendant 7 jours" },
      {
        name: "description",
        content:
          "Créez votre espace d'essai SAOVIA gratuitement pendant 7 jours : ERP Entreprise ou Hôtel & Résidences, sans engagement.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});
