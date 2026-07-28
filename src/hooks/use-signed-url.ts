import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SignedUrlState = {
  path: string | null;
  url: string | null;
};

export function useSignedUrlState(path: string | null, bucket: string = "company-assets") {
  const [state, setState] = useState<SignedUrlState>({ path: null, url: null });

  useEffect(() => {
    let alive = true;
    if (!path) {
      setState({ path: null, url: null });
      return;
    }
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (alive) setState({ path, url: data?.signedUrl ?? null });
      });
    return () => {
      alive = false;
    };
  }, [path, bucket]);

  return {
    url: state.path === path ? state.url : null,
    isLoading: Boolean(path) && state.path !== path,
  };
}

export function useSignedUrl(path: string | null, bucket: string = "company-assets") {
  return useSignedUrlState(path, bucket).url;
}
