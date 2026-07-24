import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/env-DW391FDR.js
function readEnvVar(...names) {
	const importMetaEnv = {
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/",
		"VITE_SUPABASE_ANON_KEY": "",
		"VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_xb2OoWulu0jKjT43vCeITA_zRio8geX",
		"VITE_SUPABASE_URL": "https://sobcdanmtibjoxvkezfz.supabase.co"
	};
	for (const name of names) {
		const value = importMetaEnv?.[name];
		if (value) return value;
	}
	if (typeof processModule !== "undefined" && processModule?.env) for (const name of names) {
		const value = processModule.env[name];
		if (value) return value;
	}
}
//#endregion
export { readEnvVar as t };
