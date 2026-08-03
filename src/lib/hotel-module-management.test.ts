import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  executeManageHotelTenantModule,
  type ManageHotelTenantModuleContext,
  type SuperAdminGuard,
} from "./hotel-module-management.ts";

const tenantId = "10000000-0000-0000-0000-000000000001";
const moduleId = "20000000-0000-0000-0000-000000000002";
const actorId = "30000000-0000-0000-0000-000000000003";

type RpcCall = { name: string; args: Record<string, unknown> };

function createHarness(rpcError: unknown = null) {
  const calls: RpcCall[] = [];
  const context = {
    userId: actorId,
    supabase: {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return { data: undefined, error: rpcError };
      },
    },
  } as unknown as ManageHotelTenantModuleContext;
  const authorize: SuperAdminGuard = async () => undefined;
  return { calls, context, authorize };
}

for (const enabled of [true, false]) {
  test(`appelle le RPC Hôtel avec requested_enabled=${enabled}`, async () => {
    const { calls, context, authorize } = createHarness();

    const result = await executeManageHotelTenantModule(
      context,
      { tenantId, moduleId, enabled },
      authorize,
    );

    assert.deepEqual(result, { success: true });
    assert.deepEqual(calls, [{
      name: "manage_hotel_tenant_module",
      args: {
        requested_tenant_id: tenantId,
        requested_module_id: moduleId,
        requested_enabled: enabled,
        requested_actor_id: actorId,
      },
    }]);
  });
}

test("remonte une erreur RPC formatée", async () => {
  const { context, authorize } = createHarness({
    code: "PGRST202",
    message: "RPC indisponible",
  });

  await assert.rejects(
    executeManageHotelTenantModule(
      context,
      { tenantId, moduleId, enabled: true },
      authorize,
    ),
    /code: PGRST202 \| message: RPC indisponible/,
  );
});

test("refuse un utilisateur non Super Admin avant l'appel RPC", async () => {
  const { calls, context } = createHarness();
  const deny: SuperAdminGuard = async () => {
    throw new Error("Accès refusé : super administrateur requis.");
  };

  await assert.rejects(
    executeManageHotelTenantModule(
      context,
      { tenantId, moduleId, enabled: true },
      deny,
    ),
    /Accès refusé/,
  );
  assert.equal(calls.length, 0);
});

test("l'implémentation du RPC Hôtel ne contient aucun cast any", () => {
  const source = readFileSync(
    new URL("./hotel-module-management.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /\bas\s+any\b|<any>/);
});

test("la modale synchronise immédiatement et restaure le module ciblé", () => {
  const source = readFileSync(
    new URL("../components/super-admin/SuperAdminDashboard.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /checked=\{module\.enabled\}/);
  assert.doesNotMatch(source, /defaultChecked=\{module\.enabled\}/);
  assert.match(source, /disabled=\{pendingModules\.has\(module\.id\)\}/);
  assert.match(source, /module\.id === moduleId \? \{ \.\.\.module, enabled \} : module/);
  assert.match(source, /module\.id === moduleId \? \{ \.\.\.module, enabled: previousEnabled \} : module/);
  assert.match(source, /tenantModulesQueryKey\(tenant\.id\)/);
});
import "./tenant-module-management-security.test.ts";
