export const PLATFORM_BRANDING = {
  name: "AUREX ERP",
  shortName: "AUREX",
  alt: "AUREX ERP",
  description: "La plateforme ERP intelligente pour piloter votre entreprise.",
  assets: {
    logo: "/branding/aurex-logo.svg",
    logoDark: "/branding/aurex-logo-dark.svg",
    logoVertical: "/branding/aurex-logo-vertical.svg",
    icon: "/branding/aurex-icon.svg",
    favicon: "/branding/favicon.svg",
  },
} as const;

export type PlatformBranding = typeof PLATFORM_BRANDING;
