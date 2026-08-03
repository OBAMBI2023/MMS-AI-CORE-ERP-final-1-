import type { ProviderResult } from "./hotel-sms";

export type OrangeSmsConfig = {
  apiUrl: string;
  sender: string;
  apiToken?: string;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  timeoutMs: number;
  maxAttempts: number;
};

export type OrangeFetch = typeof fetch;

export class OrangeSmsError extends Error {
  readonly details: {
    httpStatus?: number;
    code?: string;
    requestId?: string;
    providerMessageId?: string;
    payload?: unknown;
    retryable?: boolean;
  };
  constructor(
    message: string,
    details: {
      httpStatus?: number;
      code?: string;
      requestId?: string;
      providerMessageId?: string;
      payload?: unknown;
      retryable?: boolean;
    } = {},
  ) {
    super(message);
    this.name = "OrangeSmsError";
    this.details = details;
  }
}

const parseResponse = async (response: Response): Promise<any> => {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 2_000) }; }
};

const requestIdOf = (response: Response, payload: any) =>
  response.headers.get("x-request-id") ?? response.headers.get("x-correlation-id") ?? payload?.requestId;

const isRetryableStatus = (status: number) => status === 408 || status === 425 || status === 429 || status >= 500;

async function requestWithRetry(fetcher: OrangeFetch, url: string, init: RequestInit, config: OrangeSmsConfig): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    try {
      const response = await fetcher(url, { ...init, signal: AbortSignal.timeout(config.timeoutMs) });
      if (!isRetryableStatus(response.status) || attempt === config.maxAttempts) return response;
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
      if (attempt === config.maxAttempts) break;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(250 * 2 ** (attempt - 1), 2_000)));
  }
  const timedOut = lastError instanceof Error && (lastError.name === "TimeoutError" || lastError.name === "AbortError");
  throw new OrangeSmsError(timedOut ? "Le service SMS Orange n’a pas répondu à temps." : "Le service SMS Orange est momentanément indisponible.", {
    code: timedOut ? "ORANGE_TIMEOUT" : "ORANGE_NETWORK_ERROR",
    retryable: true,
  });
}

async function accessToken(config: OrangeSmsConfig, fetcher: OrangeFetch): Promise<string> {
  if (config.apiToken) return config.apiToken;
  if (!config.clientId || !config.clientSecret || !config.tokenUrl) {
    throw new OrangeSmsError("Configuration Orange incomplète.", { code: "CONFIGURATION_MISSING" });
  }
  const response = await requestWithRetry(fetcher, config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  }, config);
  const payload = await parseResponse(response);
  if (!response.ok || !payload?.access_token) {
    throw new OrangeSmsError("Authentification Orange impossible.", {
      httpStatus: response.status,
      code: String(payload?.error ?? payload?.code ?? response.status),
      requestId: requestIdOf(response, payload), payload, retryable: isRetryableStatus(response.status),
    });
  }
  return payload.access_token;
}

export async function sendOrangeSms(
  config: OrangeSmsConfig,
  input: { to: string; message: string; idempotencyKey: string },
  fetcher: OrangeFetch = fetch,
): Promise<ProviderResult> {
  const token = await accessToken(config, fetcher);
  const response = await requestWithRetry(fetcher, config.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({ outboundSMSMessageRequest: {
      address: `tel:${input.to}`,
      senderAddress: config.sender,
      outboundSMSTextMessage: { message: input.message },
    } }),
  }, config);
  const payload = await parseResponse(response);
  const providerMessageId = payload?.messageId ?? payload?.resourceURL;
  if (!response.ok) {
    throw new OrangeSmsError(payload?.description ?? payload?.message ?? "Orange a refusé l’envoi du SMS.", {
      httpStatus: response.status,
      code: String(payload?.code ?? payload?.error?.code ?? response.status),
      requestId: requestIdOf(response, payload), providerMessageId, payload,
      retryable: isRetryableStatus(response.status),
    });
  }
  return { status: "sent", providerMessageId, requestId: requestIdOf(response, payload), httpStatus: response.status, payload };
}

export async function testOrangeConnection(config: OrangeSmsConfig, fetcher: OrangeFetch = fetch): Promise<void> {
  await accessToken(config, fetcher);
}
