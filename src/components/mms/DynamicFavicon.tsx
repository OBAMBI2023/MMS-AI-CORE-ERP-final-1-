import { useEffect } from "react";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { PLATFORM_BRANDING } from "@/config/branding";

export function DynamicFavicon({ platform = false }: { platform?: boolean }) {
  const { logoUrl, companyName, isLoading } = useCompanySettings();

  useEffect(() => {
    if (!platform && isLoading) return;

    const favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (favicon) {
      favicon.href = platform
        ? PLATFORM_BRANDING.assets.favicon
        : (logoUrl ?? PLATFORM_BRANDING.assets.favicon);
      favicon.type = platform || !logoUrl ? "image/svg+xml" : "";
    }

    if (!platform && companyName) document.title = companyName;
  }, [logoUrl, companyName, isLoading, platform]);

  return null;
}
