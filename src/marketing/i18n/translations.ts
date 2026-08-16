export type MarketingLanguage = "fr" | "en";

/**
 * Centralized marketing-site dictionary. Only the `footer` namespace is
 * wired up to a component today (see MarketingFooter) — header/hero/section
 * copy stays hardcoded French for now. Add namespaces here as more of the
 * marketing site adopts translations, instead of inlining strings again.
 */
const marketingTranslations = {
  fr: {
    footer: {
      description:
        "Un espace de gestion centralisé pour piloter les opérations de votre entreprise.",
      nav: {
        features: "Fonctionnalités",
        pricing: "Tarifs",
        demo: "Démonstration",
        login: "Connexion",
      },
      legal: {
        terms: "Mentions légales",
        privacy: "Politique de confidentialité",
      },
      country: "Côte d’Ivoire",
      copyright: (year: number) => `© ${year} SAOVIA. Tous droits réservés.`,
    },
    language: {
      french: "Français",
      english: "English",
    },
  },
  en: {
    footer: {
      description:
        "A centralized workspace to run your company's day-to-day operations.",
      nav: {
        features: "Features",
        pricing: "Pricing",
        demo: "Demo",
        login: "Log in",
      },
      legal: {
        terms: "Legal notice",
        privacy: "Privacy policy",
      },
      country: "Côte d’Ivoire",
      copyright: (year: number) => `© ${year} SAOVIA. All rights reserved.`,
    },
    language: {
      french: "Français",
      english: "English",
    },
  },
} as const satisfies Record<MarketingLanguage, unknown>;

export function getMarketingTranslations(language: MarketingLanguage) {
  return marketingTranslations[language];
}
