//#region node_modules/.nitro/vite/services/ssr/assets/__23tanstack-start-server-fn-resolver-UrTpwkEB.js
var manifest = {
	"07ec6017f54e88f2d9e8a23657c08348ba3115eb7bc51a0f5d490cbbdaab284d": {
		functionName: "updateUser_createServerFn_handler",
		importer: () => import("./_ssr/user-management.server-BPyS3pXq.mjs")
	},
	"295aa6590b3d0b6eff2323a03f201d8130d8d7c4275b92dbc4fc1a03b88398af": {
		functionName: "createUser_createServerFn_handler",
		importer: () => import("./_ssr/user-management.server-BPyS3pXq.mjs")
	},
	"3277300f023c38aa5dcfcfb37ca93fc768c14158845530dcb67e506002c5b750": {
		functionName: "changePassword_createServerFn_handler",
		importer: () => import("./_ssr/security.server-DkP-aYBT.mjs")
	},
	"935cb59acf6390e8d25869011e530a73894912a783162c901805416f0611b9b2": {
		functionName: "deleteUser_createServerFn_handler",
		importer: () => import("./_ssr/user-management.server-BPyS3pXq.mjs")
	},
	"9b9e6940e1ba401dc272ccc95a359e8297bb36788bf078f53ed788d2fad8ed2a": {
		functionName: "toggleStatus_createServerFn_handler",
		importer: () => import("./_ssr/user-management.server-BPyS3pXq.mjs")
	},
	"d28a82b9f282415fc39d3d0e19f94414237137ca65aa3a3dfe28d898cfc29b77": {
		functionName: "resetUserPassword_createServerFn_handler",
		importer: () => import("./_ssr/user-management.server-BPyS3pXq.mjs")
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
