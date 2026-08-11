// Sauvegardes: manual backup trigger. Called from the browser via
// supabase.functions.invoke('create-backup', { body: { modules } }), which
// auto-attaches the caller's session access token as the Authorization
// header — so this function has the same "who is the tenant" information a
// createServerFn handler would via requireSupabaseAuth, just in Deno.
//
// Security: tenant_id is NEVER taken from the request body. It is resolved
// server-side from the caller's JWT via current_tenant_id(), and
// backup.create is re-checked server-side via has_permission() even though
// the frontend also gates the button on the same permission — a bypassed
// frontend check must still be rejected here.

import { createClient } from "npm:@supabase/supabase-js@2.110.5";
import { corsHeaders } from "../_shared/cors.ts";
import { runBackup } from "../_shared/backup-engine.ts";
import { BACKUP_MODULE_CODES } from "../_shared/backup-modules.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonResponse = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentification requise." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // RLS-enforced client, scoped to the caller's own JWT — used for all
    // reads of module data so tenant isolation is guaranteed by RLS itself,
    // not just application logic.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    // Service-role client, used only for writing tenant_backups rows,
    // storage, and sending the notification email — never exposed to the
    // frontend, only used inside this trusted server-side function.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: tenantId, error: tenantError } = await userClient.rpc("current_tenant_id");
    if (tenantError || !tenantId) {
      return jsonResponse({ error: "Locataire introuvable pour cette session." }, 401);
    }

    const { data: allowed, error: permError } = await userClient.rpc("has_permission", {
      required_permission: "backup.create",
    });
    if (permError || !allowed) {
      return jsonResponse({ error: "Permission refusée." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const requestedModules: string[] = Array.isArray(body?.modules) ? body.modules : [];

    const { data: enabledRows, error: modulesError } = await userClient
      .from("tenant_modules")
      .select("enabled, erp_modules!inner(code)")
      .eq("enabled", true);
    if (modulesError) {
      return jsonResponse({ error: "Impossible de lire les modules activés." }, 500);
    }
    const enabledCodes = new Set(
      (enabledRows ?? []).flatMap((row) => {
        const rel = row.erp_modules as { code: string } | { code: string }[] | null;
        if (Array.isArray(rel)) return rel.map((r) => r.code);
        return rel ? [rel.code] : [];
      }),
    );

    const modules = requestedModules.filter(
      (m) => BACKUP_MODULE_CODES.includes(m) && enabledCodes.has(m),
    );
    if (modules.length === 0) {
      return jsonResponse({ error: "Aucun module valide sélectionné." }, 400);
    }

    const { data: inserted, error: insertError } = await adminClient
      .from("tenant_backups")
      .insert({
        tenant_id: tenantId,
        created_by: (await userClient.auth.getUser()).data.user?.id ?? null,
        backup_type: "manuel",
        modules,
        status: "en_attente",
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      return jsonResponse({ error: "Impossible de créer la sauvegarde." }, 500);
    }

    // Respond immediately; the actual export continues in the background so
    // the UI never blocks on a potentially large export.
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil(
      runBackup({
        adminClient,
        readClient: userClient,
        tenantId,
        backupId: inserted.id,
        modules,
        backupType: "manuel",
      }),
    );

    return jsonResponse({ id: inserted.id }, 202);
  } catch (err) {
    console.error("create-backup failed", err);
    return jsonResponse({ error: "Erreur interne." }, 500);
  }
});
