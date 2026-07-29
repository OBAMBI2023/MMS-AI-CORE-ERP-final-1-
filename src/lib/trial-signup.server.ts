import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { readEnvVar } from "@/integrations/supabase/env";
import { formatSupabaseError } from "@/lib/supabase-error";

const trialSignupSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(6).max(30),
  password: z.string().min(8).max(72),
  turnstileToken: z.string().min(1),
});

type TurnstileVerification = {
  success: boolean;
  "error-codes"?: string[];
  hostname?: string;
  action?: string;
};

type SupabaseErrorFields = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

function logSupabaseError(error: unknown): void {
  const value = error && typeof error === "object" ? (error as SupabaseErrorFields) : {};
  console.error({
    code: value.code ?? null,
    message: value.message ?? null,
    details: value.details ?? null,
    hint: value.hint ?? null,
  });
}

function createIsolatedAuthClient() {
  const url = readEnvVar("VITE_SUPABASE_URL", "SUPABASE_URL");
  const key = readEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("Configuration Supabase incomplète.");

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function verifyTurnstile(token: string, ipAddress: string): Promise<void> {
  const secret = readEnvVar("TURNSTILE_SECRET_KEY");
  if (!secret) throw new Error("La protection anti-robot n'est pas configurée.");

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  });
  if (ipAddress !== "unknown") body.set("remoteip", ipAddress);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });
  const result = (await response.json()) as TurnstileVerification;
  // Journal temporaire de diagnostic. Ne contient ni le secret ni le token.
  console.info("Réponse Cloudflare Turnstile siteverify :", {
    success: result.success,
    "error-codes": result["error-codes"] ?? [],
    hostname: result.hostname ?? null,
    action: result.action ?? null,
  });

  const errorCodes = result["error-codes"] ?? [];
  if (!response.ok || !result.success) {
    const exactError = errorCodes.length > 0 ? errorCodes.join(", ") : `HTTP ${response.status}`;
    throw new Error(`Cloudflare Turnstile : ${exactError}`);
  }
}

async function rollbackSignup(userId: string, workspaceCreated: boolean): Promise<void> {
  if (workspaceCreated) {
    const { data: rolledBack, error } = await supabaseAdmin.rpc("rollback_trial_workspace", {
      p_user_id: userId,
    });
    if (error || !rolledBack) {
      if (error) logSupabaseError(error);
      throw new Error("L'annulation de l'espace d'essai a échoué.");
    }
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (!error) return;
    logSupabaseError(error);
    lastError = new Error(formatSupabaseError(error));
  }
  throw lastError ?? new Error("Le nettoyage du compte a échoué.");
}

export const createTrialWorkspace = createServerFn({ method: "POST" })
  .validator(trialSignupSchema)
  .handler(async ({ data }) => {
    const request = getRequest();
    const ipAddress =
      request?.headers.get("cf-connecting-ip") ??
      request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    await verifyTurnstile(data.turnstileToken, ipAddress);

    const { data: rateLimitAllowed, error: rateLimitError } = await supabaseAdmin.rpc(
      "consume_trial_signup_attempt",
      {
        p_ip_address: ipAddress,
        p_email: data.email,
      },
    );
    if (rateLimitError) {
      logSupabaseError(rateLimitError);
      throw new Error("Impossible de vérifier la limite d'inscription.");
    }
    if (!rateLimitAllowed) {
      throw new Error("Trop de tentatives. Réessayez dans une heure.");
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        phone: data.phone,
      },
    });

    if (authError) {
      logSupabaseError(authError);
      throw new Error(formatSupabaseError(authError));
    }

    const userId = authData.user.id;
    let workspaceCreated = false;

    try {
      const { data: workspace, error: onboardingError } = await supabaseAdmin.rpc("create_trial_workspace", {
        p_user_id: userId,
        p_company_name: data.companyName,
        p_full_name: data.fullName,
        p_email: data.email,
        p_phone: data.phone,
      });

      if (onboardingError) {
        logSupabaseError(onboardingError);
        throw new Error(formatSupabaseError(onboardingError));
      }
      const createdWorkspace = workspace as { loginUrl: string } | null;
      if (!createdWorkspace?.loginUrl) {
        throw new Error("L'espace d'essai ne contient pas d'URL de connexion.");
      }
      workspaceCreated = true;

      const isolatedAuth = createIsolatedAuthClient();
      const { data: sessionData, error: sessionError } = await isolatedAuth.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (sessionError || !sessionData.session) {
        if (sessionError) logSupabaseError(sessionError);
        throw new Error(
          "La connexion automatique a échoué. La création de l'espace a été annulée.",
        );
      }

      return {
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
        loginUrl: createdWorkspace.loginUrl,
      };
    } catch (error: unknown) {
      try {
        await rollbackSignup(userId, workspaceCreated);
      } catch (rollbackError: unknown) {
        console.error("Échec du rollback de l'inscription :", rollbackError);
        throw new Error(
          "L'inscription a échoué et son annulation est incomplète. Contactez le support.",
        );
      }
      throw error;
    }
  });
