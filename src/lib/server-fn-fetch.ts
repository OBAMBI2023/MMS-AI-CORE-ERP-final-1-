const SERVER_FN_PREFIX = "/_serverFn/";

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
  return fetch(currentOriginServerFnInput(input, browserOrigin), init);
}
