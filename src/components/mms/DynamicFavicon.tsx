import { useEffect } from "react";
import { useCompanySettings } from "@/hooks/use-company-settings";

export function DynamicFavicon() {
  const { logoUrl, companyName, isLoading } = useCompanySettings();

  useEffect(() => {
    if (isLoading) return;

    // Update Favicon
    const favicon = document.querySelector("link[rel~='icon']");
    if (favicon && logoUrl) {
      favicon.setAttribute("href", logoUrl);
    }

    // Update Title
    if (companyName) {
      document.title = companyName;
    }
  }, [logoUrl, companyName, isLoading]);

  return null;
}
