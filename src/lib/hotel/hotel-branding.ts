// Favicon / PWA / theme identity for hotel.saovia.net, kept independent from
// PLATFORM_BRANDING (src/config/branding.ts) — same rule as hotel-seo.ts:
// never make this module depend on PLATFORM_BRANDING nor the reverse, since
// erp.saovia.net and hotel.saovia.net must be able to evolve their identity
// (colors, manifest, icons) independently even though they share one
// deployment. Consumed by src/routes/__root.tsx, conditionally, only when
// the request host is hotel.saovia.net.

// Same navy/gold pair already hardcoded throughout the hotel UI (see
// HotelLandingHeader, HotelLandingPage, HotelLoginPage, HotelAppShell) —
// reused here, not reinvented, so the PWA theme color matches what the app
// itself already looks like.
export const HOTEL_THEME_COLOR = "#0B1F4D";
export const HOTEL_BACKGROUND_COLOR = "#0B1F4D";

export const HOTEL_BRANDING_ASSETS = {
  icon: "/branding/hotel/saovia-hotel-icon.png",
  lockup: "/branding/hotel/saovia-hotel-lockup.png",
  splash: "/splash/hotel/saovia-hotel-splash-premium.png",
  favicon16: "/icons/hotel/favicon-16x16.png",
  favicon32: "/icons/hotel/favicon-32x32.png",
  favicon48: "/icons/hotel/favicon-48x48.png",
  faviconIco: "/favicon-hotel.ico",
  appleTouchIcon: "/icons/hotel/apple-touch-icon.png",
  manifest: "/manifest-hotel.webmanifest",
} as const;

// <link> tags for the <head>. Deliberately NOT deduped against
// PLATFORM_BRANDING's own favicon/apple-touch-icon/manifest links by
// TanStack Router (it only dedupes `meta` by name/property, never `link` by
// rel) — src/routes/__root.tsx avoids the conflict by omitting the default
// links entirely whenever the request host is hotel.saovia.net, rather than
// relying on override/dedupe behavior that link tags don't have.
export function hotelBrandingHeadLinks() {
  return [
    { rel: "icon", href: HOTEL_BRANDING_ASSETS.faviconIco, sizes: "any" },
    { rel: "icon", type: "image/png", sizes: "16x16", href: HOTEL_BRANDING_ASSETS.favicon16 },
    { rel: "icon", type: "image/png", sizes: "32x32", href: HOTEL_BRANDING_ASSETS.favicon32 },
    { rel: "icon", type: "image/png", sizes: "48x48", href: HOTEL_BRANDING_ASSETS.favicon48 },
    { rel: "apple-touch-icon", href: HOTEL_BRANDING_ASSETS.appleTouchIcon },
    { rel: "manifest", href: HOTEL_BRANDING_ASSETS.manifest },
  ];
}

// og:image / twitter:image meta for hotel pages, plus the theme-color meta
// (also host-conditional for the same reason — `meta` dedupes by
// name/property so this one DOES safely override PLATFORM_BRANDING's, but
// it's grouped here for a single source of truth per host).
export function hotelBrandingHeadMeta(absoluteImageUrl: string) {
  return [
    { name: "theme-color", content: HOTEL_THEME_COLOR },
    { property: "og:image", content: absoluteImageUrl },
    { name: "twitter:image", content: absoluteImageUrl },
  ];
}
