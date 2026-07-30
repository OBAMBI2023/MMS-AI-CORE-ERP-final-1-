import { useEffect, useState } from "react";
import { getPartnerTenantLogoSignature } from "@/lib/partner-admin.server";
import { createSignedUrlLease } from "@/lib/signed-url-lease";

export function usePartnerTenantLogo(tenantId: string, logoPath: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(logoPath));

  useEffect(() => {
    setUrl(null);
    if (!logoPath) {
      setIsLoading(false);
      return;
    }
    return createSignedUrlLease({
      key: `company-assets:${logoPath}`,
      signer: async () => {
        const result = await getPartnerTenantLogoSignature({ data: { tenantId } });
        if (result.path !== logoPath) {
          throw new Error("Le chemin du logo a changé; actualisez le dashboard.");
        }
        return { signedUrl: result.signedUrl, expiresAt: result.expiresAt };
      },
      onLoading: setIsLoading,
      onValue: setUrl,
      onError: () => {},
    });
  }, [tenantId, logoPath]);

  return { url, isLoading };
}
