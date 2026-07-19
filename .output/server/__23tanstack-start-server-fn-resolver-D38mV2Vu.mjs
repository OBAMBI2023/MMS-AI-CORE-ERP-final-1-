//#region node_modules/.nitro/vite/services/ssr/assets/__23tanstack-start-server-fn-resolver-D38mV2Vu.js
var manifest = {
	"07ec6017f54e88f2d9e8a23657c08348ba3115eb7bc51a0f5d490cbbdaab284d": {
		functionName: "updateUser_createServerFn_handler",
		importer: () => import("./_ssr/user-management.server-IxeKo1yH.mjs")
	},
	"295aa6590b3d0b6eff2323a03f201d8130d8d7c4275b92dbc4fc1a03b88398af": {
		functionName: "createUser_createServerFn_handler",
		importer: () => import("./_ssr/user-management.server-IxeKo1yH.mjs")
	},
	"51501365e6a993db5715029febc2c9f7073a5b6af5ace3730f7c65b50ad8aab0": {
		functionName: "callGemini_createServerFn_handler",
		importer: () => import("./_ssr/ai-server-DfRYzMX4.mjs")
	},
	"5a85795cad4995fdcd35c6381fb5c7855b64b7f42945b72884c432b833d2cfd7": {
		functionName: "saveAiSettings_createServerFn_handler",
		importer: () => import("./_ssr/ai-settings.server-DlWXKmES.mjs")
	},
	"935cb59acf6390e8d25869011e530a73894912a783162c901805416f0611b9b2": {
		functionName: "deleteUser_createServerFn_handler",
		importer: () => import("./_ssr/user-management.server-IxeKo1yH.mjs")
	},
	"9a3bc6fc671b55398bf3d21bd82a687b5fb0fb07a99d7449488fae6c2253824a": {
		functionName: "getAiSettings_createServerFn_handler",
		importer: () => import("./_ssr/ai-settings.server-DlWXKmES.mjs")
	},
	"d28a82b9f282415fc39d3d0e19f94414237137ca65aa3a3dfe28d898cfc29b77": {
		functionName: "resetUserPassword_createServerFn_handler",
		importer: () => import("./_ssr/user-management.server-IxeKo1yH.mjs")
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
