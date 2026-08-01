export type RecoveryCallback = {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

type AuthResult = { data: { session: unknown | null }; error: { code?: string } | null };
export type RecoveryAuth = {
  exchangeCodeForSession(code: string): Promise<AuthResult>;
  verifyOtp(params: { token_hash: string; type: "invite" | "recovery" }): Promise<AuthResult>;
  setSession(params: { access_token: string; refresh_token: string }): Promise<AuthResult>;
  getSession(): Promise<AuthResult>;
};

export type RecoveryResult = "absent" | "valid" | "invalid";

export function isRecoveryRouteAllowed(pathname: string): boolean {
  return pathname === "/reset-password";
}

export function readRecoveryCallback(url: string): RecoveryCallback | null {
  const parsed = new URL(url);
  const query = parsed.searchParams;
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const get = (name: string) => query.get(name) ?? hash.get(name);
  const callback = {
    code: get("code"),
    tokenHash: get("token_hash"),
    type: get("type"),
    accessToken: get("access_token"),
    refreshToken: get("refresh_token"),
  };
  const hasCredentials = Boolean(
    callback.code || callback.tokenHash || callback.accessToken || callback.refreshToken,
  );
  return ["recovery", "invite"].includes(callback.type ?? "") || hasCredentials
    ? callback
    : null;
}

function logSupabaseFailure(operation: string, error: { code?: string } | null): void {
  console.error(`[PasswordSetup] ${operation}`, { code: error?.code ?? "unknown" });
}

export async function processPasswordRecoveryCallback(
  callback: RecoveryCallback | null,
  auth: RecoveryAuth,
): Promise<RecoveryResult> {
  if (!callback) return "absent";
  let result: AuthResult;
  if (callback.code) {
    result = await auth.exchangeCodeForSession(callback.code);
  } else if (callback.tokenHash) {
    result = await auth.verifyOtp({
      token_hash: callback.tokenHash,
      type: callback.type === "invite" ? "invite" : "recovery",
    });
  } else if (callback.accessToken && callback.refreshToken) {
    result = await auth.setSession({
      access_token: callback.accessToken,
      refresh_token: callback.refreshToken,
    });
  } else {
    return "invalid";
  }
  if (result.error || !result.data.session) {
    logSupabaseFailure("Échec de l'établissement de la session Supabase", result.error);
    return "invalid";
  }
  const verified = await auth.getSession();
  if (verified.error || !verified.data.session) {
    logSupabaseFailure("Échec de la vérification de la session Supabase", verified.error);
    return "invalid";
  }
  return "valid";
}
