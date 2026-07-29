export const PLATFORM_BRANDING = {
  name: "SAOVIA",
  productName: "SAOVIA ERP",
  shortName: "SAOVIA",
  alt: "SAOVIA ERP",
  descriptor: "Intelligent Business Platform",
  tagline: "Connecter • Innover • Élever",
  description: "La plateforme ERP intelligente pour piloter votre entreprise.",
  primaryColor: "#0B1F4D",
  accentColor: "#D4AF37",
  products: {
    erp: "SAOVIA ERP",
    ai: "SAOVIA AI",
    pos: "SAOVIA POS",
    booking: "SAOVIA Booking",
    pay: "SAOVIA Pay",
    cloud: "SAOVIA Cloud",
  },
  // TODO: Fournir les variantes vectorielles SAOVIA (logoDark, logoVertical, icon et favicon).
  assets: {
    logo: "/branding/saovia-logo.svg",
    logoDark: "/branding/aurex-logo-dark.svg",
    logoVertical: "/branding/aurex-logo-vertical.svg",
    icon: "/branding/aurex-icon.svg",
    favicon: "/branding/favicon.svg",
  },
} as const;

export type PlatformBranding = typeof PLATFORM_BRANDING;
