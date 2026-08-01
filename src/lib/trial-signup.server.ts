import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { trialRequestSchema } from "@/lib/public-trial-policy";
import { readEnvVar } from "@/integrations/supabase/env";

async function verifyTurnstile(token: string, ip: string) {
  const secret = readEnvVar("TURNSTILE_SECRET_KEY");
  if (!secret) throw new Error("La vérification anti-robot n’est pas configurée.");
  const body = new URLSearchParams({ secret, response: token, remoteip: ip });
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const result = await response.json() as { success?: boolean };
  if (!response.ok || !result.success) throw new Error("La vérification anti-robot a échoué. Veuillez réessayer.");
}

export const createTrialWorkspace = createServerFn({ method: "POST" })
  .validator(trialRequestSchema)
  .handler(async ({ data }) => {
    const request = getRequest();
    const ip = request?.headers.get("cf-connecting-ip") ?? request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    await verifyTurnstile(data.turnstileToken, ip);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: allowed, error: rateError } = await (supabaseAdmin as any).rpc("consume_trial_signup_attempt", { p_ip_address: ip, p_email: data.email, p_max_attempts: 5, p_window: "1 hour" });
    if (rateError) throw new Error("Impossible de vérifier la limite d’inscription.");
    if (!allowed) throw new Error("Trop de tentatives. Veuillez réessayer dans une heure.");

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { full_name: data.adminName },
    });
    if (authError || !created.user) {
      if (/already|registered|exists/i.test(authError?.message ?? "")) throw new Error("Cette adresse e-mail est déjà utilisée.");
      throw new Error("Impossible de créer le compte pour le moment.");
    }
    const { data: tenantId, error } = await (supabaseAdmin as any).rpc("create_pending_trial_request", {
      p_user_id: created.user.id, p_company_name: data.companyName, p_full_name: data.adminName,
      p_activity: data.activity, p_email: data.email, p_phone: data.phone,
    });
    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      if (error.code === "23505") throw new Error("Cette entreprise ou cette adresse e-mail possède déjà une demande.");
      throw new Error(error.message || "Impossible de créer la demande.");
    }
    const { data: session, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({ email: data.email, password: data.password });
    if (sessionError || !session.session) throw new Error("Demande créée. Connectez-vous pour suivre sa validation.");
    return { ok: true as const, tenantId, accessToken: session.session.access_token, refreshToken: session.session.refresh_token };
  });
