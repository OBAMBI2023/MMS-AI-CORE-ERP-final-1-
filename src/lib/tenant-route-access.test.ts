import assert from "node:assert/strict";
import test from "node:test";
import { decideTenantRouteAccess, type TenantAccessFacts } from "./tenant-route-access.ts";

const valid: TenantAccessFacts = {
  profileExists: true, profileStatus: "active", tenantId: "tenant", tenantExists: true,
  tenantActive: true, tenantDeleted: false, licenseStatus: "active",
  licenseExpiresAt: "2099-01-01T00:00:00Z", roleName: "Employé", hasPermission: true,
};

test("session sans profil refusée", () => assert.deepEqual(decideTenantRouteAccess({ ...valid, profileExists: false }, false), { allowed: false, reason: "profile" }));
test("profil sans tenant refusé", () => assert.deepEqual(decideTenantRouteAccess({ ...valid, tenantId: null }, false), { allowed: false, reason: "tenant" }));
test("tenant suspendu refusé", () => assert.deepEqual(decideTenantRouteAccess({ ...valid, tenantActive: false }, false), { allowed: false, reason: "tenant" }));
test("licence expirée refusée", () => assert.deepEqual(decideTenantRouteAccess({ ...valid, licenseExpiresAt: "2020-01-01T00:00:00Z" }, false), { allowed: false, reason: "license" }));
test("permission de route obligatoire", () => assert.deepEqual(decideTenantRouteAccess({ ...valid, hasPermission: false }, true), { allowed: false, reason: "permission" }));
