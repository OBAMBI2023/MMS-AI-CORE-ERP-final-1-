type ErrorRecord = Record<string, unknown>;

export type ErrorDiagnostic = {
  message: string | null;
  name: string | null;
  code: string | null;
  status: number | string | null;
  details: string | null;
  hint: string | null;
  error: unknown;
  cause: unknown;
  data: unknown;
  context: unknown;
};

const NESTED_ERROR_KEYS = ["error", "message", "cause", "data", "context"] as const;
const asRecord = (value: unknown): ErrorRecord | null =>
  value !== null && typeof value === "object" ? value as ErrorRecord : null;

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized !== "{}" && normalized !== "[object Object]" ? normalized : null;
}

function findMessage(value: unknown, seen = new Set<unknown>(), depth = 0): string | null {
  const direct = asText(value);
  const object = asRecord(value);
  if (direct || !object || depth > 8 || seen.has(value)) return direct;
  seen.add(value);
  for (const key of NESTED_ERROR_KEYS) {
    const nested = findMessage(object[key], seen, depth + 1);
    if (nested) return nested;
  }
  return asText(object.details) ?? asText(object.hint) ?? asText(object.code);
}

function diagnosticValue(value: unknown, seen = new Set<unknown>(), depth = 0): unknown {
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (depth > 8) return "[profondeur maximale]";
  if (seen.has(value)) return "[référence circulaire]";
  const object = asRecord(value);
  if (!object) return String(value);
  seen.add(value);
  return Object.fromEntries(Object.entries(object).map(([key, nested]) =>
    [key, diagnosticValue(nested, seen, depth + 1)]));
}

export function extractErrorDiagnostic(error: unknown): ErrorDiagnostic {
  const value = asRecord(error);
  return {
    message: findMessage(error),
    name: asText(value?.name),
    code: asText(value?.code),
    status: typeof value?.status === "number" || typeof value?.status === "string" ? value.status : null,
    details: asText(value?.details),
    hint: asText(value?.hint),
    error: diagnosticValue(value?.error),
    cause: diagnosticValue(value?.cause),
    data: diagnosticValue(value?.data),
    context: diagnosticValue(value?.context),
  };
}

export function safeErrorMessage(error: unknown, fallback: string): string {
  const message = extractErrorDiagnostic(error).message;
  return (message || fallback).replace(/[\r\n\t]+/g, " ").slice(0, 500);
}

export function formatSupabaseError(error: unknown): string {
  const value = extractErrorDiagnostic(error);
  return [
    value.code && `code: ${value.code}`,
    value.message && `message: ${value.message}`,
    value.details && `details: ${value.details}`,
    value.hint && `hint: ${value.hint}`,
  ].filter(Boolean).join(" | ") || "Erreur Supabase inconnue";
}
