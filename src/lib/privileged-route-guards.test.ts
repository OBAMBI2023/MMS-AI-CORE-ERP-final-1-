import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const superAdmin = readFileSync(new URL("./super-admin.server.ts", import.meta.url), "utf8");
const partnerAdmin = readFileSync(new URL("./partner-admin.server.ts", import.meta.url), "utf8");

test("un utilisateur tenant ne suffit pas pour les routes platform ou partner", () => {
  assert.match(superAdmin, /from\("platform_admins"\)[\s\S]*eq\("user_id", context\.userId\)/);
  assert.match(partnerAdmin, /rpc\("current_partner_id"\)/);
  assert.match(partnerAdmin, /from\("partner_users"\)[\s\S]*eq\("user_id", userId\)/);
});
