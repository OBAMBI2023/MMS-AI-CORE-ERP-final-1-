import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/env-CnT-4Rb7.js
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
		"VITE_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYmNkYW5tdGliam94dmtlemZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDk2NDYsImV4cCI6MjA5OTg4NTY0Nn0.YraKc66hh5OBfv-li84ERMkKhUF28ArgHcR37gXxF3k",
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
