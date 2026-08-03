const SERVER_FN_PREFIX = "/_serverFn/";
export const SESSION_EXPIRED_MESSAGE = "Votre session a expiré. Veuillez vous reconnecter.";

type AuthRetryDependencies = {
  fetch: typeof fetch;
  refreshAccessToken: () => Promise<string | null>;
  onSessionExpired: () => Promise<void> | void;
};

/** Keep browser server-function RPCs on the page's current origin. */
export function currentOriginServerFnInput(
  input: RequestInfo | URL,
  browserOrigin?: string,
): RequestInfo | URL {
  if (!browserOrigin) return input;

  const rawUrl = input instanceof Request ? input.url : input.toString();
  let parsed: URL;
  try {
    parsed = new URL(rawUrl, browserOrigin);
  } catch {
    return input;
  }

  if (!parsed.pathname.startsWith(SERVER_FN_PREFIX)) return input;

  const sameOriginUrl = new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, browserOrigin);
  if (input instanceof Request) return new Request(sameOriginUrl, input);
  return sameOriginUrl;
}

export function fetchServerFnFromCurrentOrigin(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const browserOrigin = typeof window === "undefined" ? undefined : window.location.origin;
  const request = new Request(currentOriginServerFnInput(input, browserOrigin), init);
  if (typeof window === "undefined") return fetch(request);

  const originalFetch = window.fetch.bind(window);

  return fetchServerFnWithAuthRetry(request, {
    fetch: originalFetch,
    refreshAccessToken: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.auth.refreshSession();
      return error ? null : data.session?.access_token ?? null;
    },
    onSessionExpired: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      sessionStorage.setItem("mms:auth-message", SESSION_EXPIRED_MESSAGE);
      await supabase.auth.signOut();
      window.location.assign("/login");
    },
  });
}

/** Retry an authenticated server mutation once, and only once, after a 401. */
export async function fetchServerFnWithAuthRetry(
  request: Request,
  dependencies: AuthRetryDependencies,
): Promise<Response> {
  const retryableRequest = request.clone();
  const response = await dependencies.fetch(request);
  if (response.status !== 401) return response;

  const accessToken = await dependencies.refreshAccessToken();
  if (!accessToken) {
    await dependencies.onSessionExpired();
    return response;
  }

  const headers = new Headers(retryableRequest.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return dependencies.fetch(new Request(retryableRequest, { headers }));
}
