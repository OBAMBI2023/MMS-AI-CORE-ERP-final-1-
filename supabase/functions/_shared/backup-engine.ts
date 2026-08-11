// Sauvegardes: core export engine shared by create-backup (manual trigger)
// and run-scheduled-backups (pg_cron trigger). Kept as one module so both
// paths use the exact same tenant-filtering/CSV/ZIP/email logic — the one
// piece of code that needs to be reviewed carefully for cross-tenant leakage.

import { zipSync, strToU8 } from "npm:fflate@0.8.3";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.5";
import { BACKUP_MODULES, isBackupModuleCode } from "./backup-modules.ts";

const BATCH_SIZE = 1000;

// House CSV convention, mirrored from src/components/mms/DataExportMenu.tsx:
// semicolon-delimited, UTF-8 BOM prefix, CRLF line endings, values wrapped
// in double quotes with internal quotes doubled.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "﻿aucune donnée";
  const columns = Object.keys(rows[0]);
  const header = columns.map(csvCell).join(";");
  const lines = rows.map((row) => columns.map((c) => csvCell(row[c])).join(";"));
  return "﻿" + [header, ...lines].join("\r\n");
}

// Explicit tenant_id filter is applied on every query regardless of which
// client (RLS-scoped user JWT client, or service_role admin client) is
// passed in. For the user-JWT path this is redundant defense-in-depth on
// top of RLS; for the service_role scheduled path (which bypasses RLS
// entirely) it is the ONLY thing preventing cross-tenant leakage — never
// remove it.
async function fetchAllRows(
  client: SupabaseClient,
  table: string,
  tenantId: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const to = from + BATCH_SIZE - 1;
    const { data, error } = await client
      .from(table)
      .select("*")
      .eq("tenant_id", tenantId)
      .range(from, to);
    if (error) throw new Error(`Lecture de "${table}" impossible: ${error.message}`);
    rows.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
  }
  return rows;
}

export interface ModuleExportResult {
  files: Record<string, Uint8Array>;
  recordCount: number;
}

export async function buildModuleExport(
  client: SupabaseClient,
  tenantId: string,
  moduleCode: string,
): Promise<ModuleExportResult> {
  if (!isBackupModuleCode(moduleCode)) {
    return { files: {}, recordCount: 0 };
  }
  const def = BACKUP_MODULES[moduleCode];
  const files: Record<string, Uint8Array> = {};
  let recordCount = 0;

  for (const table of def.tables) {
    const rows = await fetchAllRows(client, table, tenantId);
    recordCount += rows.length;
    files[`${moduleCode}/${table}.csv`] = strToU8(rowsToCsv(rows));
    files[`${moduleCode}/${table}.json`] = strToU8(JSON.stringify(rows, null, 2));
  }

  return { files, recordCount };
}

export interface BuildManifestParams {
  tenantId: string;
  backupType: "manuel" | "automatique";
  modules: string[];
  moduleRecordCounts: Record<string, number>;
}

// formatVersion is a plain integer bumped whenever the JSON export shape
// changes, so a future Restore feature can branch on it safely.
export function buildManifest(params: BuildManifestParams) {
  return {
    formatVersion: 1,
    tenantId: params.tenantId,
    generatedAt: new Date().toISOString(),
    backupType: params.backupType,
    modules: params.modules,
    recordCounts: params.moduleRecordCounts,
  };
}

export function zipArchive(files: Record<string, Uint8Array>): Uint8Array {
  return zipSync(files, { level: 6 });
}

export interface SendBackupEmailParams {
  to: string;
  tenantName: string;
  signedUrl: string;
  backupDate: string;
  modules: string[];
  recordCount: number;
  expiresAt: string;
}

// Raw fetch to Resend's REST API, no SDK — mirrors the
// TwilioProvider/InfobipProvider raw-fetch pattern in
// src/lib/hotel-sms.server.ts, translated to Deno's native fetch. Never
// sends the archive itself as an attachment — link only.
export async function sendBackupEmail(params: SendBackupEmailParams): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("BACKUP_EMAIL_FROM");
  if (!apiKey || !from) {
    console.warn("RESEND_API_KEY or BACKUP_EMAIL_FROM not configured; skipping backup email");
    return;
  }

  const formattedDate = new Date(params.backupDate).toLocaleString("fr-FR");
  const formattedExpiry = new Date(params.expiresAt).toLocaleString("fr-FR");
  const modulesList = params.modules.map((m) => BACKUP_MODULES[m]?.label ?? m).join(", ");

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>Votre sauvegarde Saovia est prête</h2>
      <p><strong>Entreprise :</strong> ${params.tenantName}</p>
      <p><strong>Date de sauvegarde :</strong> ${formattedDate}</p>
      <p><strong>Modules sauvegardés :</strong> ${modulesList}</p>
      <p><strong>Nombre total d'enregistrements :</strong> ${params.recordCount}</p>
      <p>
        <a href="${params.signedUrl}" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;border-radius:8px;text-decoration:none;">
          Télécharger la sauvegarde
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Ce lien expire le ${formattedExpiry}.</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: "Votre sauvegarde Saovia est prête",
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend a refusé l'envoi (${response.status}): ${body.slice(0, 300)}`);
  }
}

// Keeps only the 10 most recent backups per tenant and drops anything past
// its expiry, removing both the DB row and the storage object so nothing is
// orphaned. Run at the end of every backup attempt (success or failure).
export async function enforceRetention(adminClient: SupabaseClient, tenantId: string): Promise<void> {
  const { data: rows, error } = await adminClient
    .from("tenant_backups")
    .select("id, storage_path, expires_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error || !rows) {
    console.error("enforceRetention: could not list backups", error);
    return;
  }

  const now = Date.now();
  const toRemove = rows.filter(
    (row, index) => index >= 10 || (row.expires_at && new Date(row.expires_at).getTime() < now),
  );
  if (toRemove.length === 0) return;

  const paths = toRemove.map((r) => r.storage_path).filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    const { error: removeError } = await adminClient.storage.from("backup-archives").remove(paths);
    if (removeError) console.error("enforceRetention: storage removal failed", removeError);
  }

  const { error: deleteError } = await adminClient
    .from("tenant_backups")
    .delete()
    .in(
      "id",
      toRemove.map((r) => r.id),
    );
  if (deleteError) console.error("enforceRetention: row deletion failed", deleteError);
}

export interface RunBackupParams {
  adminClient: SupabaseClient;
  readClient: SupabaseClient;
  tenantId: string;
  backupId: string;
  modules: string[];
  backupType: "manuel" | "automatique";
}

export async function runBackup(params: RunBackupParams): Promise<void> {
  const { adminClient, readClient, tenantId, backupId, modules, backupType } = params;

  try {
    await adminClient.from("tenant_backups").update({ status: "en_cours" }).eq("id", backupId);

    const files: Record<string, Uint8Array> = {};
    const moduleRecordCounts: Record<string, number> = {};
    let totalRecordCount = 0;

    for (const moduleCode of modules) {
      const result = await buildModuleExport(readClient, tenantId, moduleCode);
      Object.assign(files, result.files);
      moduleRecordCounts[moduleCode] = result.recordCount;
      totalRecordCount += result.recordCount;
    }

    const manifest = buildManifest({ tenantId, backupType, modules, moduleRecordCounts });
    files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));

    const zipped = zipArchive(files);
    const storagePath = `${tenantId}/${backupId}.zip`;

    const { error: uploadError } = await adminClient.storage
      .from("backup-archives")
      .upload(storagePath, zipped, { contentType: "application/zip", upsert: true });
    if (uploadError) throw new Error(`Téléversement de l'archive impossible: ${uploadError.message}`);

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from("backup-archives")
      .createSignedUrl(storagePath, 48 * 3600);
    if (signedUrlError) throw new Error(`Lien signé impossible: ${signedUrlError.message}`);

    await adminClient
      .from("tenant_backups")
      .update({
        status: "terminee",
        record_count: totalRecordCount,
        storage_path: storagePath,
        completed_at: nowIso,
        expires_at: expiresAt,
      })
      .eq("id", backupId);

    const { data: parametresRow } = await adminClient
      .from("parametres")
      .select("email, company_name")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (parametresRow?.email && signedUrlData?.signedUrl) {
      try {
        await sendBackupEmail({
          to: parametresRow.email,
          tenantName: parametresRow.company_name ?? "Votre entreprise",
          signedUrl: signedUrlData.signedUrl,
          backupDate: nowIso,
          modules,
          recordCount: totalRecordCount,
          expiresAt,
        });
      } catch (emailError) {
        // Best-effort: email failure never fails an otherwise-successful backup.
        console.error("backup email send failed", emailError);
      }
    }

    await adminClient.from("parametres").update({ backup_last_success_at: nowIso }).eq("tenant_id", tenantId);
  } catch (err) {
    console.error("backup run failed", err);
    await adminClient
      .from("tenant_backups")
      .update({
        status: "echec",
        error_message: err instanceof Error ? err.message.slice(0, 500) : "Erreur inconnue",
        completed_at: new Date().toISOString(),
      })
      .eq("id", backupId);
  } finally {
    await enforceRetention(adminClient, tenantId);
  }
}
