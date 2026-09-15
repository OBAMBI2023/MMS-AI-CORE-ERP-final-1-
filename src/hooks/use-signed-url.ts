import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_TTL_SECONDS = 60 * 60;
// Signed URLs stay valid 1h server-side. Re-signing a few minutes early
// (rather than at the exact expiry) keeps every consumer safely inside the
// URL's real validity window while still deduplicating the identical
// (bucket, path) request that several components (sidebar logo, mobile
// sidebar logo, avatar in desktop + mobile UserMenu, ...) previously issued
// independently on every mount.
const SIGNED_URL_STALE_TIME = 55 * 60 * 1000;

export function useSignedUrlState(
  path: string | null,
  bucket: string = "company-assets",
  refreshKey: number = 0,
) {
  const { data, isLoading } = useQuery({
    queryKey: ["signed-url", bucket, path, refreshKey],
    queryFn: async () => {
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path as string, SIGNED_URL_TTL_SECONDS);
      return data?.signedUrl ?? null;
    },
    enabled: Boolean(path),
    staleTime: SIGNED_URL_STALE_TIME,
    gcTime: SIGNED_URL_STALE_TIME + 5 * 60 * 1000,
  });

  return {
    url: path ? (data ?? null) : null,
    isLoading: Boolean(path) && isLoading,
  };
}

export function useSignedUrl(
  path: string | null,
  bucket: string = "company-assets",
  refreshKey: number = 0,
) {
  return useSignedUrlState(path, bucket, refreshKey).url;
}
