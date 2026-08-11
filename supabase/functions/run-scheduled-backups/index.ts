// Sauvegardes: scheduled backup runner, invoked hourly by pg_cron/pg_net
// (see 20260811164000_enable_pg_cron_backup_scheduler.sql — NOT applied yet,
// this function is not currently reachable by any scheduler), never by the
// browser. There is no interactive user JWT in this path, so it necessarily
// uses the service_role client (bypasses RLS) for both reads and writes —
// every query here (module data, platform_type, enabled modules) carries an
// explicit tenant_id filter, which is the only thing preventing cross-tenant
// leakage in this path. Shares the exact buildModuleExport/runBackup core
// with create-backup rather than re-implementing its own queries, so the
// tenant-isolation-critical code stays in one reviewed place. Platform-aware
// like create-backup: each due tenant's own platform_type (read explicitly
// per-tenant, never assumed) selects the ERP or HOTEL module registry.

import { createClient } from "npm:@supabase/supabase-js@2.110.5";
import { runBackup } from "../_shared/backup-engine.ts";
import { getBackupModuleRegistry, normalizePlatformType } from "../_shared/backup-modules.ts";

const MAX_TENANTS_PER_RUN = 50;

const FREQUENCY_MS: Record<string, number> = {
  quotidienne: 24 * 3600 * 1000,
  hebdomadaire: 7 * 24 * 3600 * 1000,
  mensuelle: 30 * 24 * 3600 * 1000,
};

function isDue(frequency: string | null, lastRunAt: string | null): boolean {
  if (!frequency || !(frequency in FREQUENCY_MS)) return false;
  if (!lastRunAt) return true;
  return Date.now() - new Date(lastRunAt).getTime() >= FREQUENCY_MS[frequency];
}

Deno.serve(async (req: Request) => {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Only the project's own service_role key (as sent by pg_net per the cron
  // job definition) may trigger a run across all tenants — never accept an
  // ordinary user session here.
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Accès refusé." }), { status: 403 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: candidates, error } = await adminClient
      .from("parametres")
      .select("tenant_id, backup_auto_frequency, backup_auto_last_run_at")
      .eq("backup_auto_enabled", true)
      .not("tenant_id", "is", null);
    if (error) throw error;

    const due = (candidates ?? [])
      .filter(
        (row) => row.tenant_id && isDue(row.backup_auto_frequency, row.backup_auto_last_run_at),
      )
      .slice(0, MAX_TENANTS_PER_RUN);

    let processed = 0;
    for (const tenant of due) {
      const tenantId = tenant.tenant_id as string;

      // Explicit per-tenant filter, service_role bypasses RLS.
      const { data: tenantRow } = await adminClient
        .from("tenants")
        .select("platform_type")
        .eq("id", tenantId)
        .single();
      const platformType = normalizePlatformType(tenantRow?.platform_type);
      const registry = getBackupModuleRegistry(platformType);

      const { data: enabledRows } = await adminClient
        .from("tenant_modules")
        .select("enabled, erp_modules!inner(code)")
        .eq("tenant_id", tenantId)
        .eq("enabled", true);
      const enabledCodes = new Set(
        (enabledRows ?? []).flatMap((row) => {
          const rel = row.erp_modules as { code: string } | { code: string }[] | null;
          if (Array.isArray(rel)) return rel.map((r) => r.code);
          return rel ? [rel.code] : [];
        }),
      );
      const modules = Object.keys(registry).filter((m) => enabledCodes.has(m));
      if (modules.length === 0) continue;

      const { data: inserted, error: insertError } = await adminClient
        .from("tenant_backups")
        .insert({ tenant_id: tenantId, backup_type: "automatique", modules, status: "en_attente" })
        .select("id")
        .single();
      if (insertError || !inserted) {
        console.error("run-scheduled-backups: insert failed", tenantId, insertError);
        continue;
      }

      await runBackup({
        adminClient,
        readClient: adminClient,
        tenantId,
        platformType,
        backupId: inserted.id,
        modules,
        backupType: "automatique",
      });

      await adminClient
        .from("parametres")
        .update({ backup_auto_last_run_at: new Date().toISOString() })
        .eq("tenant_id", tenantId);

      processed += 1;
    }

    return new Response(JSON.stringify({ processed, candidates: due.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("run-scheduled-backups failed", err);
    return new Response(JSON.stringify({ error: "Erreur interne." }), { status: 500 });
  }
});
