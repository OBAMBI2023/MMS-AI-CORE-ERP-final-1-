import { useEffect } from "react";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { PLATFORM_BRANDING } from "@/config/branding";

export function DynamicFavicon({ platform = false }: { platform?: boolean }) {
  const { logoUrl, isLoading } = useCompanySettings();

  useEffect(() => {
    if (!platform && isLoading) return;

    const favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (favicon) {
      favicon.href = platform
        ? PLATFORM_BRANDING.assets.favicon
        : (logoUrl ?? PLATFORM_BRANDING.assets.favicon);
      favicon.type = platform || !logoUrl ? "image/png" : "";
    }
    // document.title is centrally managed by useDocumentTitle() (see
    // DocumentTitleManager in __root.tsx) — this component only owns the
    // favicon now. It used to also set document.title = companyName here,
    // which raced with route-based titles and could leave a tab showing
    // just the tenant's raw company name with no page name or brand.
  }, [logoUrl, isLoading, platform]);

  return null;
}
