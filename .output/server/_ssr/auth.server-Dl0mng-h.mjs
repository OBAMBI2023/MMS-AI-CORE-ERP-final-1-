import { t as supabaseAdmin } from "./client.server-BGGhwBw_.mjs";
import { i as TSS_SERVER_FUNCTION } from "./createServerFn-CIHAFgYl.mjs";
import { t as getRequest } from "./request-response-BEPp1C2k.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth.server-Dl0mng-h.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
async function getAuth() {
	const authHeader = getRequest()?.headers?.get("authorization");
	if (!authHeader) throw new Error("Unauthorized");
	const token = authHeader.replace("Bearer ", "");
	const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
	if (error || !user) throw new Error("Unauthorized");
	return { user };
}
//#endregion
export { getAuth as n, createServerRpc as t };
