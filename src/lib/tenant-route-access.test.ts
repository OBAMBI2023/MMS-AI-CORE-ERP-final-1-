import assert from "node:assert/strict";
import test from "node:test";
import { decideTenantRouteAccess, decidePlatformRedirect, type TenantAccessFacts } from "./tenant-route-access.ts";

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

test("MMS (ERP) ouvre /parametres sans redirection", () => {
  assert.equal(decidePlatformRedirect("ERP", "/parametres"), null);
});

test("MMS (ERP) ne peut pas charger /hotel/parametres : redirection forcée", () => {
  assert.equal(decidePlatformRedirect("ERP", "/hotel/parametres"), "/app");
});

test("Damaja (HOTEL) ouvre /hotel/parametres sans redirection", () => {
  assert.equal(decidePlatformRedirect("HOTEL", "/hotel/parametres"), null);
});

test("Damaja (HOTEL) est redirigé hors de /parametres (route ERP)", () => {
  assert.equal(decidePlatformRedirect("HOTEL", "/parametres"), "/hotel");
});

test("hotel/sms reste accessible aux tenants ERP pour la découverte Premium", () => {
  assert.equal(decidePlatformRedirect("ERP", "/hotel/sms"), null);
});
