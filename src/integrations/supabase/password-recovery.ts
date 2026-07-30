import { supabase } from "./client";

const RECOVERY_STORAGE_KEY = "mms:password-recovery";

type RecoveryCallback = {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

let recoveryPromise: Promise<boolean> | null = null;

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
  return sessionStorage.getItem(RECOVERY_STORAGE_KEY) !== null || readRecoveryCallback() !== null;
}

export function hasValidPasswordRecoverySession(): boolean {
  return (
    typeof window !== "undefined" && sessionStorage.getItem(RECOVERY_STORAGE_KEY) === "valid"
  );
}

export async function handlePasswordRecoveryCallback(): Promise<boolean> {
  const callback = readRecoveryCallback();
  if (!callback) return false;
  if (recoveryPromise) return recoveryPromise;

  sessionStorage.setItem(RECOVERY_STORAGE_KEY, "pending");

  recoveryPromise = (async () => {
    if (callback.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(callback.code);
      if (error) console.error("Impossible d’échanger le code de récupération Supabase :", error);
      sessionStorage.setItem(RECOVERY_STORAGE_KEY, data.session && !error ? "valid" : "invalid");
      return true;
    }

    if (callback.tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: callback.tokenHash,
        type: callback.type === "invite" ? "invite" : "recovery",
      });
      if (error) console.error("Impossible de vérifier le jeton de récupération Supabase :", error);
      sessionStorage.setItem(RECOVERY_STORAGE_KEY, data.session && !error ? "valid" : "invalid");
      return true;
    }

    if (callback.accessToken && callback.refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: callback.accessToken,
        refresh_token: callback.refreshToken,
      });
      if (error) console.error("Impossible d’établir la session de récupération Supabase :", error);
      sessionStorage.setItem(RECOVERY_STORAGE_KEY, data.session && !error ? "valid" : "invalid");
    } else {
      sessionStorage.setItem(RECOVERY_STORAGE_KEY, "invalid");
    }

    return true;
  })();

  return recoveryPromise;
}

export function clearPasswordRecoveryContext(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
  }
}
