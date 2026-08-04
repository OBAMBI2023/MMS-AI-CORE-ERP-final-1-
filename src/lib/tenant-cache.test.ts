import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { shouldClearTenantScopedCache } from "./tenant-cache.ts";

const DAMAJA_TENANT_ID = "damaja-tenant-id";
const MMS_TENANT_ID = "mms-tenant-id";

function seedDamajaCache(queryClient: QueryClient) {
  queryClient.setQueryData(["parametres", DAMAJA_TENANT_ID], { company_name: "RESIDENCE DAMAJA" });
  queryClient.setQueryData(["tenant-modules", DAMAJA_TENANT_ID], new Set(["hotel_settings"]));
  queryClient.setQueryData(["current-user-permissions", DAMAJA_TENANT_ID], { role: "Administrateur" });
}

test("un changement de tenant (Damaja -> MMS) vide le cache dépendant du tenant", () => {
  const queryClient = new QueryClient();
  seedDamajaCache(queryClient);
  assert.ok(queryClient.getQueryData(["parametres", DAMAJA_TENANT_ID]));

  // The auth listener in __root.tsx fires SIGNED_OUT before a different
  // account (MMS) signs back in — this is the moment the switch happens.
  assert.equal(shouldClearTenantScopedCache("SIGNED_OUT"), true);
  queryClient.clear();

  assert.equal(queryClient.getQueryData(["parametres", DAMAJA_TENANT_ID]), undefined);
  assert.equal(queryClient.getQueryData(["tenant-modules", DAMAJA_TENANT_ID]), undefined);
  assert.equal(queryClient.getQueryData(["current-user-permissions", DAMAJA_TENANT_ID]), undefined);

  queryClient.setQueryData(["parametres", MMS_TENANT_ID], { company_name: "Maguy Multi Services" });
  assert.deepEqual(queryClient.getQueryData(["parametres", MMS_TENANT_ID]), {
    company_name: "Maguy Multi Services",
  });
});

test("USER_UPDATED (mise à jour du tenant_id en métadonnées) vide aussi le cache", () => {
  assert.equal(shouldClearTenantScopedCache("USER_UPDATED"), true);
});

test("les évènements sans changement de compte ne vident pas le cache", () => {
  const queryClient = new QueryClient();
  seedDamajaCache(queryClient);

  assert.equal(shouldClearTenantScopedCache("TOKEN_REFRESHED"), false);
  assert.equal(shouldClearTenantScopedCache("INITIAL_SESSION"), false);

  assert.ok(queryClient.getQueryData(["parametres", DAMAJA_TENANT_ID]));
});
