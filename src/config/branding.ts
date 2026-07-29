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
  // A single official vector is currently available. Keep every surface on
  // SAOVIA until dedicated, approved variants are supplied.
  assets: {
    logo: "/branding/saovia-logo.svg",
    logoDark: "/branding/saovia-logo.svg",
    logoVertical: "/branding/saovia-logo.svg",
    icon: "/branding/saovia-logo.svg",
    favicon: "/branding/saovia-logo.svg",
  },
} as const;

export type PlatformBranding = typeof PLATFORM_BRANDING;
