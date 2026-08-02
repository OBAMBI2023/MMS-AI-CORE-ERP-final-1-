import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const superAdmin = readFileSync(new URL("./super-admin.server.ts", import.meta.url), "utf8");
const partnerAdmin = readFileSync(new URL("./partner-admin.server.ts", import.meta.url), "utf8");
const rootRoute = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");

test("un utilisateur tenant ne suffit pas pour les routes platform ou partner", () => {
  assert.match(
    superAdmin,
    /readPlatformAdminMembership\(userId: string\)[\s\S]*from\("platform_admins"\)[\s\S]*eq\("user_id", userId\)/,
  );
  assert.match(superAdmin, /readPlatformAdminMembership\(context\.userId\)/);
  assert.match(partnerAdmin, /rpc\("current_partner_id"\)/);
  assert.match(partnerAdmin, /from\("partner_users"\)[\s\S]*eq\("user_id", userId\)/);
});

test("le garde plateforme est résolu avant tout accès tenant", () => {
  const platformGuard = rootRoute.indexOf("await getPlatformAdminAccess()");
  const tenantGuard = rootRoute.indexOf("await getTenantRouteAccess(");

  assert.notEqual(platformGuard, -1);
  assert.notEqual(tenantGuard, -1);
  assert.ok(platformGuard < tenantGuard);
  assert.match(
    rootRoute,
    /if \(isPlatformAdmin\) \{[\s\S]*if \(!isPlatformRoute\(location\.pathname\)[\s\S]*return;[\s\S]*const \{ isPartnerAdmin \}/,
  );
});

test("les portails privilégiés ne montent pas le TenantProvider", () => {
  assert.match(
    rootRoute,
    /isPlatformRoute\(location\.pathname\) \|\| isPartnerRoute\(location\.pathname\)/,
  );
  assert.match(
    rootRoute,
    /\{isPlatformArea \|\| isPublicArea \? \([\s\S]*?<Outlet \/>[\s\S]*?\) : \([\s\S]*?<TenantProvider>/,
  );
});
