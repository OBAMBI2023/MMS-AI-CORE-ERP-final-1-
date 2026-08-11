// Sauvegardes: manual backup trigger, shared by both the ERP and HOTEL
// platforms. Called from the browser via
// supabase.functions.invoke('create-backup', { body: { modules } }), which
// auto-attaches the caller's session access token as the Authorization
// header — so this function has the same "who is the tenant" information a
// createServerFn handler would via requireSupabaseAuth, just in Deno.
//
// Security: tenant_id AND platform_type are NEVER taken from the request
// body. Both are resolved server-side from the caller's JWT — tenant_id via
// current_tenant_id(), platform_type via an RLS-scoped read of the caller's
// own tenants row (see tenants_read_own_profile_tenant policy). The right
// backup.create / hotel.backups.create permission (matching the resolved
// platform) is re-checked server-side even though the frontend also gates
// its button on the same permission — a bypassed frontend check must still
// be rejected here. Requested module keys are filtered against the
// platform-appropriate registry only, so a HOTEL tenant can never trigger an
// export of ERP tables (or vice versa) even by hand-crafting the request.

import { createClient } from "npm:@supabase/supabase-js@2.110.5";
import { corsHeaders } from "../_shared/cors.ts";
import { runBackup } from "../_shared/backup-engine.ts";
import { getBackupModuleRegistry, normalizePlatformType } from "../_shared/backup-modules.ts";

// Ambient Deno Edge Runtime global (not part of the standard Deno lib types
// this project's tsconfig resolves) — declared narrowly instead of casting
// through `any` at the call site.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

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

    // platform_type is read through the caller's own RLS-scoped client
    // (tenants_read_own_profile_tenant policy: a user may read only their
    // own tenant row) — never accepted from the request body.
    const { data: tenantRow, error: tenantRowError } = await userClient
      .from("tenants")
      .select("platform_type")
      .eq("id", tenantId)
      .single();
    if (tenantRowError) {
      return jsonResponse({ error: "Impossible de déterminer la plateforme du tenant." }, 500);
    }
    const platformType = normalizePlatformType(tenantRow?.platform_type);
    const requiredPermission = platformType === "HOTEL" ? "hotel.backups.create" : "backup.create";

    const { data: allowed, error: permError } = await userClient.rpc("has_permission", {
      required_permission: requiredPermission,
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

    // Only module keys that (a) exist in the registry for THIS tenant's
    // resolved platform and (b) are actually enabled for this tenant are
    // kept. A module key belonging to the other platform is silently
    // dropped here (ERP and HOTEL registry keys are disjoint strings), which
    // is what rejects a manually crafted cross-platform request.
    const registry = getBackupModuleRegistry(platformType);
    const modules = requestedModules.filter(
      (m) => Object.prototype.hasOwnProperty.call(registry, m) && enabledCodes.has(m),
    );
    if (modules.length === 0) {
      return jsonResponse({ error: "Aucun module valide sélectionné pour cette plateforme." }, 400);
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
    EdgeRuntime?.waitUntil(
      runBackup({
        adminClient,
        readClient: userClient,
        tenantId,
        platformType,
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
