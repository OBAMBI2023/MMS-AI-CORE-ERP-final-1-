import { supabase } from "./client";
import {
  processPasswordRecoveryCallback,
  readRecoveryCallback,
  type RecoveryCallback,
  type RecoveryResult,
} from "./password-recovery-callback";

const RECOVERY_STORAGE_KEY = "mms:password-recovery";

let recoveryPromise: Promise<RecoveryResult> | null = null;

function browserCallback(): RecoveryCallback | null {
  return typeof window === "undefined" ? null : readRecoveryCallback(window.location.href);
}

export function hasPasswordRecoveryContext(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(RECOVERY_STORAGE_KEY) !== null || browserCallback() !== null;
}

export function hasValidPasswordRecoverySession(): boolean {
  return typeof window !== "undefined" && sessionStorage.getItem(RECOVERY_STORAGE_KEY) === "valid";
}

export async function handlePasswordRecoveryCallback(): Promise<RecoveryResult> {
  if (typeof window === "undefined") return "absent";
  const callback = browserCallback();
  if (!callback) return "absent";
  if (recoveryPromise) return recoveryPromise;

  sessionStorage.setItem(RECOVERY_STORAGE_KEY, "pending");
  recoveryPromise = processPasswordRecoveryCallback(callback, supabase.auth).then((result) => {
    sessionStorage.setItem(RECOVERY_STORAGE_KEY, result === "valid" ? "valid" : "invalid");
    if (result === "valid") cleanPasswordRecoveryUrl();
    return result;
  });
  return recoveryPromise;
}

export function clearPasswordRecoveryContext(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
}

export function cleanPasswordRecoveryUrl(): void {
  if (typeof window === "undefined") return;
  const cleanUrl = new URL("/reset-password", window.location.origin);
  window.history.replaceState(window.history.state, "", cleanUrl);
}
