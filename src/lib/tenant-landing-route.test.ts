import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types.ts";
import { resolveTenantLandingRoute } from "./tenant-landing-route.server.ts";

type MockProfile = {
  role_id: string | null;
  tenant_id: string;
  roles: { name: string; tenant_id: string } | null;
} | null;

function createMockSupabase(opts: {
  profile: MockProfile;
  rolePermissions?: string[];
  enabledModules?: Set<string>;
  catalogGatedAllowed?: Set<string>;
  rpcDelayMs?: number;
}) {
  const rolePermissions = opts.rolePermissions ?? [];
  const enabledModules = opts.enabledModules ?? new Set<string>();
  const catalogGatedAllowed = opts.catalogGatedAllowed ?? new Set<string>();

  return {
    from(table: string) {
      if (table === "profiles") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({ data: opts.profile, error: null }),
                    };
                  },
                };
              },
            };
          },
        };
      }
      if (table === "role_permissions") {
        return {
          select() {
            return {
              eq: async () => ({
                data: rolePermissions.map((code) => ({ permissions: { code } })),
                error: null,
              }),
            };
          },
        };
      }
      throw new Error(`Table inattendue dans le mock: ${table}`);
    },
    async rpc(name: string, args: Record<string, string>) {
      if (opts.rpcDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, opts.rpcDelayMs));
      }
      if (name === "current_user_module_enabled") {
        return { data: enabledModules.has(args.requested_code), error: null };
      }
      if (name === "current_user_catalog_route_enabled") {
        return { data: catalogGatedAllowed.has(args.requested_path), error: null };
      }
      throw new Error(`RPC inattendue dans le mock: ${name}`);
    },
    // biome-ignore lint: mock volontairement partiel, cast contrôlé ci-dessous
  } as unknown as SupabaseClient<Database>;
}

const TENANT_A = "00000000-0000-4000-8000-00000000000a";
const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const USER_ID = "00000000-0000-4000-8000-0000000000u1";

test("Administrateur est redirigé vers le Dashboard", async () => {
  const supabase = createMockSupabase({
    profile: {
      role_id: "role-admin",
      tenant_id: TENANT_A,
      roles: { name: "Administrateur", tenant_id: TENANT_A },
    },
    enabledModules: new Set(["dashboard"]),
  });

  const destination = await resolveTenantLandingRoute(supabase, USER_ID, TENANT_A);
  assert.equal(destination, "/app");
});

test("Utilisateur secondaire avec accès au Dashboard est redirigé vers le Dashboard", async () => {
  const supabase = createMockSupabase({
    profile: {
      role_id: "role-manager",
      tenant_id: TENANT_A,
      roles: { name: "Manager", tenant_id: TENANT_A },
    },
    rolePermissions: ["dashboard.view"],
    enabledModules: new Set(["dashboard"]),
  });

  const destination = await resolveTenantLandingRoute(supabase, USER_ID, TENANT_A);
  assert.equal(destination, "/app");
});

test("Caissier sans accès Dashboard mais avec Ventes POS atterrit sur /ventes", async () => {
  const supabase = createMockSupabase({
    profile: {
      role_id: "role-caissier",
      tenant_id: TENANT_A,
      roles: { name: "Caissier", tenant_id: TENANT_A },
    },
    rolePermissions: ["ventes.view"],
    enabledModules: new Set(["dashboard", "sales"]),
  });

  const destination = await resolveTenantLandingRoute(supabase, USER_ID, TENANT_A);
  assert.equal(destination, "/ventes");
});

test("Comptable limité aux Dépenses/Rapports atterrit sur /depenses", async () => {
  const supabase = createMockSupabase({
    profile: {
      role_id: "role-comptable",
      tenant_id: TENANT_A,
      roles: { name: "Comptable", tenant_id: TENANT_A },
    },
    rolePermissions: ["ventes.view"],
    enabledModules: new Set(["expenses", "reports"]),
  });

  const destination = await resolveTenantLandingRoute(supabase, USER_ID, TENANT_A);
  assert.equal(destination, "/depenses");
});

test("une réponse RPC en cours de résolution n'est jamais interprétée comme une permission refusée", async () => {
  const supabase = createMockSupabase({
    profile: {
      role_id: "role-manager",
      tenant_id: TENANT_A,
      roles: { name: "Manager", tenant_id: TENANT_A },
    },
    rolePermissions: ["dashboard.view"],
    enabledModules: new Set(["dashboard"]),
    rpcDelayMs: 15,
  });

  const destination = await resolveTenantLandingRoute(supabase, USER_ID, TENANT_A);
  assert.equal(destination, "/app");
});

test("un utilisateur sans aucune permission ni module accessible est redirigé vers /403", async () => {
  const supabase = createMockSupabase({
    profile: {
      role_id: "role-employe",
      tenant_id: TENANT_A,
      roles: { name: "Employé", tenant_id: TENANT_A },
    },
    rolePermissions: [],
    enabledModules: new Set(),
  });

  const destination = await resolveTenantLandingRoute(supabase, USER_ID, TENANT_A);
  assert.equal(destination, "/403");
});

test("isolation multi-tenant : un rôle appartenant à un autre tenant n'accorde aucun droit", async () => {
  const supabase = createMockSupabase({
    profile: {
      role_id: "role-admin-tenant-b",
      tenant_id: TENANT_A,
      // Simule une ligne corrompue/malveillante où le rôle appartient au tenant B.
      roles: { name: "Administrateur", tenant_id: TENANT_B },
    },
    rolePermissions: ["dashboard.view", "ventes.view", "achats.view", "settings.manage"],
    enabledModules: new Set(["dashboard", "sales"]),
  });

  const destination = await resolveTenantLandingRoute(supabase, USER_ID, TENANT_A);
  assert.equal(destination, "/403");
});
