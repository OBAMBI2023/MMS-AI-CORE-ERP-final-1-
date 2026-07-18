import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSignedUrl(path: string | null, bucket: string = "company-assets") {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (alive) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [path, bucket]);
  return url;
}
