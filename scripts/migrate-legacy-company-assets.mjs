import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const COMPANY_ASSETS_BUCKET = "company-assets";
export const COMPANY_ASSET_FIELDS = ["logo_url", "signature_url", "stamp_url"];

function legacyPathFor(settings, field) {
  const value = settings[field];
  const kind = field.replace("_url", "");
  return typeof value === "string" && value.startsWith(`${kind}/${settings.id}-`)
    ? value
    : null;
}

function resumableLegacyPath(settings, field) {
  const value = settings[field];
  const prefix = `${settings.tenant_id}/`;
  if (typeof value !== "string" || !value.startsWith(prefix)) return null;
  let candidate = value.slice(prefix.length);
  if (/^migrated-[a-f0-9]{12}(?:-\d+)?\//.test(candidate)) {
    candidate = candidate.slice(candidate.indexOf("/") + 1);
  }
  const kind = field.replace("_url", "");
  return candidate.startsWith(`${kind}/${settings.id}-`) ? candidate : null;
}

async function fingerprint(blob) {
  const bytes = Buffer.from(await blob.arrayBuffer());
  return {
    size: bytes.byteLength,
    hash: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function sameContent(left, right) {
  const [a, b] = await Promise.all([fingerprint(left), fingerprint(right)]);
  return a.size === b.size && a.hash === b.hash;
}

function hashedCandidate(preferredPath, hash, attempt = 0) {
  const separator = preferredPath.indexOf("/");
  if (separator < 1) throw new Error("Chemin company-assets tenant-scoped invalide.");
  const tenantPrefix = preferredPath.slice(0, separator);
  const legacyPath = preferredPath.slice(separator + 1);
  return `${tenantPrefix}/migrated-${hash.slice(0, 12)}${attempt ? `-${attempt}` : ""}/${legacyPath}`;
}

async function chooseDestination(storage, preferredPath, sourceBlob) {
  const preferred = await storage.downloadIfExists(preferredPath);
  if (!preferred) return { path: preferredPath, exists: false, conflict: false };
  if (await sameContent(sourceBlob, preferred)) {
    return { path: preferredPath, exists: true, conflict: false };
  }

  const sourceHash = (await fingerprint(sourceBlob)).hash;
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = hashedCandidate(preferredPath, sourceHash, attempt);
    const existing = await storage.downloadIfExists(candidate);
    if (!existing) return { path: candidate, exists: false, conflict: true };
    if (await sameContent(sourceBlob, existing)) {
      return { path: candidate, exists: true, conflict: true };
    }
  }
  throw new Error("Impossible de trouver un chemin company-assets non conflictuel.");
}

export function parseMigrationMode(args) {
  const dryRun = args.includes("--dry-run");
  const apply = args.includes("--apply");
  if (dryRun === apply) {
    throw new Error("Choisissez exactement une option : --dry-run ou --apply.");
  }
  return apply ? "apply" : "dry-run";
}

export async function migrateLegacyCompanyAssets({
  rows,
  storage,
  updateReference,
  mode,
  log = () => {},
}) {
  if (!["dry-run", "apply"].includes(mode)) throw new Error("Mode de migration invalide.");
  const results = [];

  for (const settings of rows) {
    for (const field of COMPANY_ASSET_FIELDS) {
      const oldPath = legacyPathFor(settings, field);
      const resumedOldPath = oldPath ? null : resumableLegacyPath(settings, field);

      // Resume the final cleanup after a prior successful SQL update.
      if (resumedOldPath) {
        const [oldBlob, currentBlob] = await Promise.all([
          storage.downloadIfExists(resumedOldPath),
          storage.downloadIfExists(settings[field]),
        ]);
        if (!oldBlob) continue;
        if (!currentBlob || !(await sameContent(oldBlob, currentBlob))) {
          throw new Error(`Reprise refusée : destination non vérifiable pour ${field}.`);
        }
        const operation = {
          tenant: settings.tenant_id, field, source: resumedOldPath,
          destination: settings[field], conflict: false, action: "cleanup",
        };
        log(operation);
        if (mode === "apply") await storage.remove(resumedOldPath);
        results.push(operation);
        continue;
      }

      if (!oldPath) continue;
      const sourceBlob = await storage.downloadIfExists(oldPath);
      if (!sourceBlob) throw new Error(`Objet source introuvable pour ${field}.`);
      const preferredPath = `${settings.tenant_id}/${oldPath}`;
      const destination = await chooseDestination(storage, preferredPath, sourceBlob);
      const operation = {
        tenant: settings.tenant_id, field, source: oldPath,
        destination: destination.path, conflict: destination.conflict,
        action: destination.exists ? "reuse" : "upload",
      };
      log(operation);
      if (mode === "dry-run") {
        results.push(operation);
        continue;
      }

      if (!destination.exists) {
        await storage.upload(destination.path, sourceBlob);
      }
      const verified = await storage.downloadIfExists(destination.path);
      if (!verified || !(await sameContent(sourceBlob, verified))) {
        throw new Error(`Vérification du nouvel objet échouée pour ${field}.`);
      }

      const updated = await updateReference({
        settingsId: settings.id,
        tenantId: settings.tenant_id,
        field,
        oldPath,
        newPath: destination.path,
      });
      if (!updated) {
        throw new Error(`Référence modifiée concurremment pour ${field}; source conservée.`);
      }

      // This is deliberately last. A failed delete is safely resumed next run.
      await storage.remove(oldPath);
      settings[field] = destination.path;
      results.push(operation);
    }
  }
  return results;
}

function safeOperationLog(operation) {
  process.stdout.write(
    `${operation.action}${operation.conflict ? " conflict" : ""} tenant=${operation.tenant}`
    + ` field=${operation.field} source=${operation.source} destination=${operation.destination}\n`,
  );
}

async function runCli() {
  const mode = parseMigrationMode(process.argv.slice(2));
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  }
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: rows, error } = await supabase
    .from("parametres")
    .select("id, tenant_id, logo_url, signature_url, stamp_url")
    .not("tenant_id", "is", null);
  if (error) throw error;

  const storage = {
    async downloadIfExists(path) {
      const result = await supabase.storage.from(COMPANY_ASSETS_BUCKET).download(path);
      if (!result.error) return result.data;
      if (result.error.statusCode === "404" || /not found/i.test(result.error.message)) return null;
      throw result.error;
    },
    async upload(path, blob) {
      const { error: uploadError } = await supabase.storage
        .from(COMPANY_ASSETS_BUCKET)
        .upload(path, blob, { upsert: false, contentType: blob.type });
      if (uploadError) throw uploadError;
    },
    async remove(path) {
      const { error: removeError } = await supabase.storage
        .from(COMPANY_ASSETS_BUCKET)
        .remove([path]);
      if (removeError) throw removeError;
    },
  };

  await migrateLegacyCompanyAssets({
    rows: rows ?? [],
    storage,
    mode,
    log: safeOperationLog,
    async updateReference({ settingsId, tenantId, field, oldPath, newPath }) {
      const { data, error: updateError } = await supabase
        .from("parametres")
        .update({ [field]: newPath })
        .eq("id", settingsId)
        .eq("tenant_id", tenantId)
        .eq(field, oldPath)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      return Boolean(data);
    },
  });
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  runCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Migration échouée."}\n`);
    process.exitCode = 1;
  });
}
