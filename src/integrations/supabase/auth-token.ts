export function readBearerToken(authorization: string | null | undefined): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer ([^\s]+)$/);
  return match?.[1] ?? null;
}

export function readJwtIssuedAt(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded)) as { iat?: unknown };
    return typeof decoded.iat === "number" ? decoded.iat : null;
  } catch {
    return null;
  }
}
