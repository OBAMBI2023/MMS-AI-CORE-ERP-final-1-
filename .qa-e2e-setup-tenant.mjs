// TEMPORARY one-off script for a manual QA E2E test. Not part of the app,
// not committed. Deleted at the end of the test session.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const envText = readFileSync(new URL("./.env", import.meta.url), "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ts = Date.now();
const adminEmail = `qa.rolefix.admin.${ts}@mms-test.invalid`;
const adminPassword = crypto.randomBytes(18).toString("base64url");
const companyName = `ZZZ_QA_TEST_ROLE_FIX_${ts}`;

async function main() {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: "QA Test Admin RoleFix", phone: "+00000000" },
  });
  if (authError) throw new Error("createUser admin: " + JSON.stringify(authError));

  const adminUserId = authData.user.id;

  const { data: workspace, error: rpcError } = await supabaseAdmin.rpc("create_trial_workspace", {
    p_user_id: adminUserId,
    p_company_name: companyName,
    p_full_name: "QA Test Admin RoleFix",
    p_email: adminEmail,
    p_phone: "+00000000",
    p_activity: null,
  });
  if (rpcError) {
    await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    throw new Error("create_trial_workspace: " + JSON.stringify(rpcError));
  }

  console.log(JSON.stringify({
    adminUserId,
    adminEmail,
    adminPassword,
    companyName,
    tenantId: workspace.tenantId,
    slug: workspace.slug,
    loginUrl: workspace.loginUrl,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
