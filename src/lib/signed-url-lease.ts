export type SignedUrlValue = {
  signedUrl: string | null;
  expiresAt: string | null;
};

type CacheEntry = SignedUrlValue & { expiresAtMs: number };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<SignedUrlValue>>();

export const SIGNED_URL_REFRESH_LEAD_MS = 5 * 60_000;
export const SIGNED_URL_RETRY_MS = 60_000;

export function clearSignedUrlLeaseCache() {
  cache.clear();
  inFlight.clear();
}

export async function getCachedSignedUrl(
  key: string,
  signer: () => Promise<SignedUrlValue>,
  now = Date.now(),
): Promise<SignedUrlValue> {
  const cached = cache.get(key);
  if (cached && (!cached.expiresAt || cached.expiresAtMs - now > SIGNED_URL_REFRESH_LEAD_MS)) {
    return cached;
  }
  const running = inFlight.get(key);
  if (running) return running;
  const request = signer()
    .then((value) => {
      const expiresAtMs = value.expiresAt ? new Date(value.expiresAt).getTime() : Infinity;
      cache.set(key, { ...value, expiresAtMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, request);
  return request;
}

export function refreshDelay(value: SignedUrlValue, now = Date.now()) {
  if (!value.expiresAt) return null;
  return Math.max(1_000, new Date(value.expiresAt).getTime() - now - SIGNED_URL_REFRESH_LEAD_MS);
}

export function createSignedUrlLease({
  key,
  signer,
  onLoading,
  onValue,
  onError,
  now = Date.now,
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancel = (timer) => clearTimeout(timer),
}: {
  key: string;
  signer: () => Promise<SignedUrlValue>;
  onLoading: (loading: boolean) => void;
  onValue: (url: string | null) => void;
  onError: (error: unknown) => void;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
}) {
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const queue = (callback: () => void, delay: number) => {
    if (timer) cancel(timer);
    timer = schedule(callback, delay);
  };
  const refresh = async () => {
    onLoading(true);
    try {
      const value = await getCachedSignedUrl(key, signer, now());
      if (disposed) return;
      onValue(value.signedUrl);
      const delay = refreshDelay(value, now());
      if (delay !== null) queue(() => void refresh(), delay);
    } catch (error) {
      if (disposed) return;
      onValue(null);
      onError(error);
      queue(() => void refresh(), SIGNED_URL_RETRY_MS);
    } finally {
      if (!disposed) onLoading(false);
    }
  };

  void refresh();
  return () => {
    disposed = true;
    if (timer) cancel(timer);
    timer = null;
  };
}
