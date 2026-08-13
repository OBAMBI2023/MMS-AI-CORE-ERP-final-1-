import { supabase } from "./client";

const RECOVERY_STORAGE_KEY = "mms:password-recovery";
const AUTH_CALLBACK_STORAGE_KEY = "mms:supabase-auth-callback";

type RecoveryCallback = {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

type SupabaseCallbackKind = "recovery" | "generic";

let recoveryPromise: Promise<SupabaseCallbackKind | null> | null = null;

function readRecoveryCallback(): RecoveryCallback | null {
  if (typeof window === "undefined") return null;

  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const get = (name: string) => query.get(name) ?? hash.get(name);
  const callback = {
    code: get("code"),
    tokenHash: get("token_hash"),
    type: get("type"),
    accessToken: get("access_token"),
    refreshToken: get("refresh_token"),
  };

  const hasRecoveryCredentials =
    Boolean(callback.code) ||
    Boolean(callback.tokenHash) ||
    Boolean(callback.accessToken) ||
    Boolean(callback.refreshToken);

  return ["recovery", "invite"].includes(callback.type ?? "") || hasRecoveryCredentials
    ? callback
    : null;
}

export function hasPasswordRecoveryContext(): boolean {
  if (typeof window === "undefined") return false;
  return (
    sessionStorage.getItem(RECOVERY_STORAGE_KEY) !== null ||
    sessionStorage.getItem(AUTH_CALLBACK_STORAGE_KEY) !== null ||
    readRecoveryCallback() !== null
  );
}

export function hasValidPasswordRecoverySession(): boolean {
  return (
    typeof window !== "undefined" && sessionStorage.getItem(RECOVERY_STORAGE_KEY) === "valid"
  );
}

export async function handlePasswordRecoveryCallback(): Promise<boolean> {
  const handled = await handleSupabaseAuthCallback();
  return handled === "recovery";
}

export async function handleSupabaseAuthCallback(): Promise<SupabaseCallbackKind | null> {
  const callback = readRecoveryCallback();
  if (!callback) return null;
  if (recoveryPromise) return recoveryPromise;

  const callbackKind: SupabaseCallbackKind =
    ["recovery", "invite"].includes(callback.type ?? "") ? "recovery" : "generic";
  sessionStorage.setItem(
    callbackKind === "recovery" ? RECOVERY_STORAGE_KEY : AUTH_CALLBACK_STORAGE_KEY,
    "pending",
  );

  recoveryPromise = (async () => {
    if (callback.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(callback.code);
      if (error) console.error("Impossible d’échanger le code de récupération Supabase :", error);
      sessionStorage.setItem(
        callbackKind === "recovery" ? RECOVERY_STORAGE_KEY : AUTH_CALLBACK_STORAGE_KEY,
        data.session && !error ? "valid" : "invalid",
      );
      return callbackKind;
    }

    if (callback.tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: callback.tokenHash,
        type: callback.type === "invite" ? "invite" : "recovery",
      });
      if (error) console.error("Impossible de vérifier le jeton de récupération Supabase :", error);
      sessionStorage.setItem(
        callbackKind === "recovery" ? RECOVERY_STORAGE_KEY : AUTH_CALLBACK_STORAGE_KEY,
        data.session && !error ? "valid" : "invalid",
      );
      return callbackKind;
    }

    if (callback.accessToken && callback.refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: callback.accessToken,
        refresh_token: callback.refreshToken,
      });
      if (error) console.error("Impossible d’établir la session de récupération Supabase :", error);
      sessionStorage.setItem(
        callbackKind === "recovery" ? RECOVERY_STORAGE_KEY : AUTH_CALLBACK_STORAGE_KEY,
        data.session && !error ? "valid" : "invalid",
      );
    } else {
      sessionStorage.setItem(
        callbackKind === "recovery" ? RECOVERY_STORAGE_KEY : AUTH_CALLBACK_STORAGE_KEY,
        "invalid",
      );
    }

    return callbackKind;
  })();

  return recoveryPromise;
}

export function clearPasswordRecoveryContext(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
  }
}

export function cleanPasswordRecoveryUrl(): void {
  if (typeof window === "undefined") return;

  const cleanUrl = new URL("/reset-password", window.location.origin);
  window.history.replaceState(window.history.state, "", cleanUrl);
}
