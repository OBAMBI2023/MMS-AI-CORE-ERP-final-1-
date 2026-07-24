import { t as supabaseAdmin } from "./client.server-CjzUaBmo.mjs";
import { t as logAction } from "./audit.server-AsKiprSl.mjs";
import { n as objectType, r as stringType, t as enumType } from "../_libs/zod.mjs";
import { c as createServerFn } from "./createServerFn-CIHAFgYl.mjs";
import { n as getAuth, t as createServerRpc } from "./auth.server-DUdg0_IV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/user-management.server-BPyS3pXq.js
var deleteUser_createServerFn_handler = createServerRpc({
	id: "935cb59acf6390e8d25869011e530a73894912a783162c901805416f0611b9b2",
	name: "deleteUser",
	filename: "src/lib/user-management.server.ts"
}, (opts) => deleteUser.__executeServer(opts));
var deleteUser = createServerFn({ method: "POST" }).validator(objectType({ id: stringType().uuid() })).handler(deleteUser_createServerFn_handler, async ({ data }) => {
	const { user: admin } = await getAuth();
	if (!admin) throw new Error("Unauthorized");
	if (admin.id === data.id) throw new Error("Action non autorisée sur son propre compte");
	const { count, error: countError } = await supabaseAdmin.from("profiles").select("id", {
		count: "exact",
		head: true
	}).eq("status", "actif").neq("id", data.id);
	if (countError) throw countError;
	if (count === 0) throw new Error("Impossible de supprimer le dernier administrateur actif.");
	await logAction(admin.id, null, "Suppression d'utilisateur", "utilisateurs", { targetUserId: data.id });
	const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
	if (error) throw error;
	return { success: true };
});
var createUser_createServerFn_handler = createServerRpc({
	id: "295aa6590b3d0b6eff2323a03f201d8130d8d7c4275b92dbc4fc1a03b88398af",
	name: "createUser",
	filename: "src/lib/user-management.server.ts"
}, (opts) => createUser.__executeServer(opts));
var createUser = createServerFn({ method: "POST" }).validator(objectType({
	email: stringType().email(),
	password: stringType().min(6),
	role_id: stringType().uuid(),
	full_name: stringType(),
	username: stringType(),
	phone: stringType().optional(),
	status: enumType(["actif", "suspendu"])
})).handler(createUser_createServerFn_handler, async ({ data }) => {
	const { user: admin } = await getAuth();
	if (!admin) throw new Error("Unauthorized");
	const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
		email: data.email,
		password: data.password,
		email_confirm: true,
		user_metadata: {
			full_name: data.full_name,
			username: data.username,
			phone: data.phone
		}
	});
	if (authError) throw authError;
	const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
		id: authData.user.id,
		email: data.email,
		full_name: data.full_name,
		username: data.username,
		phone: data.phone,
		role_id: data.role_id,
		status: data.status
	});
	if (profileError) {
		await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
		throw profileError;
	}
	await logAction(admin.id, null, "Création d'utilisateur", "utilisateurs", { targetUserId: authData.user.id });
	return { success: true };
});
var updateUser_createServerFn_handler = createServerRpc({
	id: "07ec6017f54e88f2d9e8a23657c08348ba3115eb7bc51a0f5d490cbbdaab284d",
	name: "updateUser",
	filename: "src/lib/user-management.server.ts"
}, (opts) => updateUser.__executeServer(opts));
var updateUser = createServerFn({ method: "POST" }).validator(objectType({
	id: stringType().uuid(),
	role_id: stringType().uuid().optional(),
	status: enumType(["actif", "suspendu"]).optional(),
	full_name: stringType().optional(),
	username: stringType().optional(),
	phone: stringType().optional()
})).handler(updateUser_createServerFn_handler, async ({ data }) => {
	const { user: admin } = await getAuth();
	if (!admin) throw new Error("Unauthorized");
	const { error } = await supabaseAdmin.from("profiles").update({
		role_id: data.role_id,
		status: data.status,
		full_name: data.full_name,
		username: data.username,
		phone: data.phone
	}).eq("id", data.id);
	if (error) throw error;
	await logAction(admin.id, null, "Mise à jour d'utilisateur", "utilisateurs", { targetUserId: data.id });
	return { success: true };
});
var toggleStatus_createServerFn_handler = createServerRpc({
	id: "9b9e6940e1ba401dc272ccc95a359e8297bb36788bf078f53ed788d2fad8ed2a",
	name: "toggleStatus",
	filename: "src/lib/user-management.server.ts"
}, (opts) => toggleStatus.__executeServer(opts));
var toggleStatus = createServerFn({ method: "POST" }).validator(objectType({
	id: stringType().uuid(),
	status: enumType(["actif", "suspendu"])
})).handler(toggleStatus_createServerFn_handler, async ({ data }) => {
	const { user: admin } = await getAuth();
	if (!admin) throw new Error("Unauthorized");
	const { error } = await supabaseAdmin.from("profiles").update({ status: data.status }).eq("id", data.id);
	if (error) throw error;
	await logAction(admin.id, null, "Changement de statut", "utilisateurs", { targetUserId: data.id });
	return { success: true };
});
var resetUserPassword_createServerFn_handler = createServerRpc({
	id: "d28a82b9f282415fc39d3d0e19f94414237137ca65aa3a3dfe28d898cfc29b77",
	name: "resetUserPassword",
	filename: "src/lib/user-management.server.ts"
}, (opts) => resetUserPassword.__executeServer(opts));
var resetUserPassword = createServerFn({ method: "POST" }).validator(objectType({ id: stringType().uuid() })).handler(resetUserPassword_createServerFn_handler, async ({ data }) => {
	const { user: admin } = await getAuth();
	if (!admin) throw new Error("Unauthorized");
	const { data: profile } = await supabaseAdmin.from("profiles").select("email").eq("id", data.id).single();
	if (!profile) throw new Error("Utilisateur non trouvé");
	const { error } = await supabaseAdmin.auth.admin.generateLink({
		type: "recovery",
		email: profile.email
	});
	if (error) throw error;
	await logAction(admin.id, null, "Réinitialisation de mot de passe", "utilisateurs", { targetUserId: data.id });
	return { success: true };
});
//#endregion
export { createUser_createServerFn_handler, deleteUser_createServerFn_handler, resetUserPassword_createServerFn_handler, toggleStatus_createServerFn_handler, updateUser_createServerFn_handler };
