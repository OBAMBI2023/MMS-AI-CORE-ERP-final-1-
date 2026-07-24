import { t as supabaseAdmin } from "./client.server-CjzUaBmo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/audit.server-AsKiprSl.js
async function logAction(userId, roleId, action, module, metadata = {}) {
	try {
		await supabaseAdmin.from("audit_logs").insert({
			user_id: userId,
			role_id: roleId,
			action,
			module,
			metadata
		});
	} catch (error) {
		console.error("Failed to log audit action:", error);
	}
}
//#endregion
export { logAction as t };
