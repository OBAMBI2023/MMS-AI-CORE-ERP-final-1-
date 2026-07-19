import { c as createServerFn } from "./createServerFn-CIHAFgYl.mjs";
import { i as stringType, r as objectType } from "../_libs/zod.mjs";
import { n as supabaseAdmin, t as createServerRpc } from "./client.server-nNJHyhnd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/user-management.server-IxeKo1yH.js
var createUser_createServerFn_handler = createServerRpc({
	id: "295aa6590b3d0b6eff2323a03f201d8130d8d7c4275b92dbc4fc1a03b88398af",
	name: "createUser",
	filename: "src/lib/user-management.server.ts"
}, (opts) => createUser.__executeServer(opts));
var createUser = createServerFn({ method: "POST" }).validator(objectType({
	email: stringType().email(),
	password: stringType().min(8),
	role_id: stringType().uuid(),
	full_name: stringType().optional()
})).handler(createUser_createServerFn_handler, async ({ data }) => {
	const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
		email: data.email,
		password: data.password,
		email_confirm: true,
		user_metadata: { full_name: data.full_name }
	});
	if (authError) throw authError;
	const { error: profileError } = await supabaseAdmin.from("profiles").update({
		role_id: data.role_id,
		full_name: data.full_name
	}).eq("id", authData.user.id);
	if (profileError) throw profileError;
	return { id: authData.user.id };
});
var updateUser_createServerFn_handler = createServerRpc({
	id: "07ec6017f54e88f2d9e8a23657c08348ba3115eb7bc51a0f5d490cbbdaab284d",
	name: "updateUser",
	filename: "src/lib/user-management.server.ts"
}, (opts) => updateUser.__executeServer(opts));
var updateUser = createServerFn({ method: "POST" }).validator(objectType({
	id: stringType().uuid(),
	role_id: stringType().uuid().optional(),
	status: stringType().optional(),
	full_name: stringType().optional()
})).handler(updateUser_createServerFn_handler, async ({ data }) => {
	const { error } = await supabaseAdmin.from("profiles").update({
		role_id: data.role_id,
		status: data.status,
		full_name: data.full_name
	}).eq("id", data.id);
	if (error) throw error;
	return { success: true };
});
var deleteUser_createServerFn_handler = createServerRpc({
	id: "935cb59acf6390e8d25869011e530a73894912a783162c901805416f0611b9b2",
	name: "deleteUser",
	filename: "src/lib/user-management.server.ts"
}, (opts) => deleteUser.__executeServer(opts));
var deleteUser = createServerFn({ method: "POST" }).validator(objectType({ id: stringType().uuid() })).handler(deleteUser_createServerFn_handler, async ({ data }) => {
	const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
	if (error) throw error;
	return { success: true };
});
var resetUserPassword_createServerFn_handler = createServerRpc({
	id: "d28a82b9f282415fc39d3d0e19f94414237137ca65aa3a3dfe28d898cfc29b77",
	name: "resetUserPassword",
	filename: "src/lib/user-management.server.ts"
}, (opts) => resetUserPassword.__executeServer(opts));
var resetUserPassword = createServerFn({ method: "POST" }).validator(objectType({
	id: stringType().uuid(),
	password: stringType().min(8)
})).handler(resetUserPassword_createServerFn_handler, async ({ data }) => {
	const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
	if (error) throw error;
	return { success: true };
});
//#endregion
export { createUser_createServerFn_handler, deleteUser_createServerFn_handler, resetUserPassword_createServerFn_handler, updateUser_createServerFn_handler };
