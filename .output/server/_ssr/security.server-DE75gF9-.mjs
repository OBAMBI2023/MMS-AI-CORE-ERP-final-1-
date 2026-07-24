import { t as supabaseAdmin } from "./client.server-BGGhwBw_.mjs";
import { n as objectType, r as stringType } from "../_libs/zod.mjs";
import { c as createServerFn } from "./createServerFn-CIHAFgYl.mjs";
import { n as getAuth, t as createServerRpc } from "./auth.server-Dl0mng-h.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/security.server-DE75gF9-.js
var changePassword_createServerFn_handler = createServerRpc({
	id: "3277300f023c38aa5dcfcfb37ca93fc768c14158845530dcb67e506002c5b750",
	name: "changePassword",
	filename: "src/lib/security.server.ts"
}, (opts) => changePassword.__executeServer(opts));
var changePassword = createServerFn({ method: "POST" }).validator(objectType({ newPassword: stringType().min(8) })).handler(changePassword_createServerFn_handler, async ({ data }) => {
	const { user } = await getAuth();
	if (!user) throw new Error("Unauthorized");
	const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: data.newPassword });
	if (updateError) throw updateError;
	await supabaseAdmin.from("audit_logs").insert({
		user_id: user.id,
		action: "Modification du mot de passe par l'utilisateur.",
		module: "Sécurité",
		metadata: { userId: user.id }
	});
	return { success: true };
});
//#endregion
export { changePassword_createServerFn_handler };
