type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export function formatSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return error instanceof Error ? error.message : String(error);
  }

  const value = error as SupabaseErrorLike;
  return [
    value.code && `code: ${value.code}`,
    value.message && `message: ${value.message}`,
    value.details && `details: ${value.details}`,
    value.hint && `hint: ${value.hint}`,
  ]
    .filter(Boolean)
    .join(" | ");
}
