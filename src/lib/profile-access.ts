export type CanonicalProfileStatus = "active" | "suspended" | "archived";

export function isProfileAccessBlocked(status: string | null | undefined): boolean {
  return status === "suspended" || status === "archived";
}

export function isAccessTokenRevoked(
  issuedAtSeconds: number | null | undefined,
  sessionsRevokedAt: string | null | undefined,
): boolean {
  if (!sessionsRevokedAt) return false;
  const revokedAt = new Date(sessionsRevokedAt).getTime();
  if (!Number.isFinite(revokedAt)) return false;
  return !issuedAtSeconds || issuedAtSeconds * 1000 <= revokedAt;
}
