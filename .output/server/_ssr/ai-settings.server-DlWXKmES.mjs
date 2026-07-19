import { c as createServerFn } from "./createServerFn-CIHAFgYl.mjs";
import { i as stringType, n as numberType, r as objectType, t as booleanType } from "../_libs/zod.mjs";
import { n as supabaseAdmin, t as createServerRpc } from "./client.server-nNJHyhnd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ai-settings.server-DlWXKmES.js
var aiSettingsSchema = objectType({
	openai_key: stringType().nullable().optional(),
	gemini_key: stringType().nullable().optional(),
	claude_key: stringType().nullable().optional(),
	ai_model: stringType().nullable().optional(),
	ai_temperature: numberType().min(0).max(1).nullable().optional(),
	ai_max_tokens: numberType().int().positive().max(32e3).nullable().optional(),
	ai_enabled: booleanType().optional()
});
var getAiSettings_createServerFn_handler = createServerRpc({
	id: "9a3bc6fc671b55398bf3d21bd82a687b5fb0fb07a99d7449488fae6c2253824a",
	name: "getAiSettings",
	filename: "src/lib/mms/ai-settings.server.ts"
}, (opts) => getAiSettings.__executeServer(opts));
var getAiSettings = createServerFn({ method: "GET" }).handler(getAiSettings_createServerFn_handler, async () => {
	const { data, error } = await supabaseAdmin.from("integration_settings").select("openai_key, gemini_key, claude_key, ai_model, ai_temperature, ai_max_tokens, ai_enabled").limit(1).maybeSingle();
	if (error) throw new Error(error.message);
	return data ?? {
		openai_key: null,
		gemini_key: null,
		claude_key: null,
		ai_model: "Gemini",
		ai_temperature: .7,
		ai_max_tokens: 2048,
		ai_enabled: true
	};
});
var saveAiSettings_createServerFn_handler = createServerRpc({
	id: "5a85795cad4995fdcd35c6381fb5c7855b64b7f42945b72884c432b833d2cfd7",
	name: "saveAiSettings",
	filename: "src/lib/mms/ai-settings.server.ts"
}, (opts) => saveAiSettings.__executeServer(opts));
var saveAiSettings = createServerFn({ method: "POST" }).validator(aiSettingsSchema).handler(saveAiSettings_createServerFn_handler, async ({ data }) => {
	const { data: existing, error: e1 } = await supabaseAdmin.from("integration_settings").select("id").limit(1).maybeSingle();
	if (e1) throw new Error(e1.message);
	if (existing?.id) {
		const { error } = await supabaseAdmin.from("integration_settings").update(data).eq("id", existing.id);
		if (error) throw new Error(error.message);
	} else {
		const { error } = await supabaseAdmin.from("integration_settings").insert(data);
		if (error) throw new Error(error.message);
	}
	return { success: true };
});
//#endregion
export { getAiSettings_createServerFn_handler, saveAiSettings_createServerFn_handler };
