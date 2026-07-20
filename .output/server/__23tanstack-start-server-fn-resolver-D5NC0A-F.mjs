//#region node_modules/.nitro/vite/services/ssr/assets/__23tanstack-start-server-fn-resolver-D5NC0A-F.js
var manifest = {
	"5a85795cad4995fdcd35c6381fb5c7855b64b7f42945b72884c432b833d2cfd7": {
		functionName: "saveAiSettings_createServerFn_handler",
		importer: () => import("./_ssr/ai-settings.server-acoiTXZ0.mjs")
	},
	"9a3bc6fc671b55398bf3d21bd82a687b5fb0fb07a99d7449488fae6c2253824a": {
		functionName: "getAiSettings_createServerFn_handler",
		importer: () => import("./_ssr/ai-settings.server-acoiTXZ0.mjs")
	}
};
async function getServerFnById(id, access) {
	const serverFnInfo = manifest[id];
	if (!serverFnInfo) throw new Error("Server function info not found for " + id);
	const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
	if (!fnModule) throw new Error("Server function module not resolved for " + id);
	const action = fnModule[serverFnInfo.functionName];
	if (!action) throw new Error("Server function module export not resolved for serverFn ID: " + id);
	return action;
}
//#endregion
export { getServerFnById as t };
