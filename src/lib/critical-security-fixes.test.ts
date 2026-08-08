import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260807140000_fix_critical_multi_tenant_isolation.sql",
  "utf8",
);
const tenantDeletionServer = readFileSync("src/lib/tenant-deletion.server.ts", "utf8");
const userManagementServer = readFileSync("src/lib/user-management.server.ts", "utf8");
const trialSignupServer = readFileSync("src/lib/trial-signup.server.ts", "utf8");

function section(text: string, startMarker: string, endMarker: string): string {
  const start = text.indexOf(startMarker);
  assert.ok(start >= 0, `marker not found: ${startMarker}`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `end marker not found after ${startMarker}: ${endMarker}`);
  return text.slice(start, end);
}

// --- A. v_rapport_mensuel can never mix tenants ------------------------------------

test("v_rapport_mensuel is created with security_invoker so RLS applies to the caller", () => {
  const view = section(
    migration,
    "CREATE OR REPLACE VIEW public.v_rapport_mensuel",
    "REVOKE ALL ON public.v_rapport_mensuel",
  );
  assert.match(view, /WITH \(security_invoker = true\)/);
});

test("every aggregated source in v_rapport_mensuel is explicitly scoped to the caller's tenant", () => {
  const view = section(
    migration,
    "CREATE OR REPLACE VIEW public.v_rapport_mensuel",
    "REVOKE ALL ON public.v_rapport_mensuel",
  );
  assert.match(
    view,
    /FROM public\.ventes\s+WHERE ventes\.tenant_id = public\.current_tenant_id\(\)/,
  );
  assert.match(
    view,
    /FROM public\.achats\s+WHERE achats\.tenant_id = public\.current_tenant_id\(\)/,
  );
  assert.match(
    view,
    /FROM public\.depenses\s+WHERE depenses\.tenant_id = public\.current_tenant_id\(\)/,
  );
});

test("v_rapport_mensuel is not reachable by anon", () => {
  assert.match(
    migration,
    /REVOKE ALL ON public\.v_rapport_mensuel FROM PUBLIC, anon, authenticated;/,
  );
  assert.match(migration, /GRANT SELECT ON public\.v_rapport_mensuel TO authenticated;/);
});

// --- B. tg_handle_new_user can no longer be used for tenant spoofing --------------

test("tg_handle_new_user no longer reads tenant_id from client-controlled signup metadata", () => {
  const fn = section(
    migration,
    "CREATE OR REPLACE FUNCTION public.tg_handle_new_user()",
    "$function$;",
  );
  assert.doesNotMatch(fn, /raw_user_meta_data->>'tenant_id'/);
  assert.doesNotMatch(fn, /raw_user_meta_data->>"tenant_id"/);
  // Every new profile is inserted unattached; tenant assignment happens
  // exclusively through a trusted server-side flow afterward.
  assert.match(fn, /VALUES\s*\(\s*new\.id,\s*NULL,\s*NULL,\s*'active',/);
});

test("legitimate admin-driven user creation still assigns a server-derived tenant_id", () => {
  // createUser derives tenantId from the calling admin's own profile
  // (getAdminTenantContext), never from client input, and re-upserts the
  // profile with it right after auth.admin.createUser() runs -- this must
  // keep working even though the trigger no longer sets tenant_id itself.
  assert.match(userManagementServer, /getAdminTenantContext\(adminId\)/);
  assert.match(
    userManagementServer,
    /\.from\("profiles"\)\.upsert\(\{[\s\S]*?tenant_id: tenantId,/,
  );
});

test("trial signup never puts a tenant_id in the new user's auth metadata", () => {
  const createUserCall = section(trialSignupServer, "supabaseAdmin.auth.admin.createUser({", "});");
  assert.doesNotMatch(createUserCall, /tenant_id/);
});

// --- C. Tenant-deletion RPCs can no longer be triggered by actor-id spoofing ------

const deletionFunctions = [
  "public.start_tenant_deletion",
  "public.delete_tenant_postgres_data",
  "public.delete_tenant_postgres_data_core",
  "public.finalize_tenant_deletion",
];

for (const fnName of deletionFunctions) {
  test(`${fnName} binds requested_actor_id to auth.uid() via is_platform_admin_actor`, () => {
    const fn = section(migration, `CREATE OR REPLACE FUNCTION ${fnName}(`, "$function$;");
    assert.match(fn, /IF NOT public\.is_platform_admin_actor\(requested_actor_id\) THEN/);
    // The old, spoofable check must be gone from this function body.
    assert.doesNotMatch(
      fn,
      /IF NOT EXISTS \(\s*SELECT 1 FROM public\.platform_admins WHERE user_id = requested_actor_id\s*\)/,
    );
  });

  test(`${fnName} EXECUTE is restricted to service_role`, () => {
    const signature =
      fnName === "public.start_tenant_deletion"
        ? `${fnName}(uuid, text, uuid)`
        : `${fnName}(uuid, uuid)`;
    const escaped = signature.replace(/[.()]/g, (c) => `\\${c}`);
    assert.match(
      migration,
      new RegExp(`REVOKE ALL ON FUNCTION ${escaped} FROM PUBLIC, anon, authenticated;`),
    );
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION ${escaped} TO service_role;`));
  });
}

// --- D/E. Server-side defense in depth + regressions ------------------------------

test("startTenantDeletion verifies platform_admins membership before calling the RPC", () => {
  const handler = section(
    tenantDeletionServer,
    "export const startTenantDeletion = createServerFn",
    "export const retryTenantDeletion",
  );
  assert.match(handler, /\.from\("platform_admins"\)/);
  assert.match(handler, /Accès refusé : super administrateur requis\./);
  // The membership check must run before the destructive RPC call.
  const checkIndex = handler.indexOf('.from("platform_admins")');
  const rpcIndex = handler.indexOf('rpc("start_tenant_deletion"');
  assert.ok(checkIndex >= 0 && rpcIndex > checkIndex);
});

test("retryTenantDeletion still guards on platform_admins (unchanged regression check)", () => {
  const startIndex = tenantDeletionServer.indexOf(
    "export const retryTenantDeletion = createServerFn",
  );
  assert.ok(startIndex >= 0);
  const handler = tenantDeletionServer.slice(startIndex);
  assert.match(handler, /\.from\("platform_admins"\)/);
});
