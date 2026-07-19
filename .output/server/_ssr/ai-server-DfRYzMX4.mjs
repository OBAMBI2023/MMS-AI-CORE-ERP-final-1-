import { c as createServerFn } from "./createServerFn-CIHAFgYl.mjs";
import { i as stringType, r as objectType } from "../_libs/zod.mjs";
import { n as supabaseAdmin, t as createServerRpc } from "./client.server-nNJHyhnd.mjs";
import { t as GoogleGenerativeAI } from "../_libs/google__generative-ai.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ai-server-DfRYzMX4.js
var callGemini_createServerFn_handler = createServerRpc({
	id: "51501365e6a993db5715029febc2c9f7073a5b6af5ace3730f7c65b50ad8aab0",
	name: "callGemini",
	filename: "src/lib/ai-server.ts"
}, (opts) => callGemini.__executeServer(opts));
var callGemini = createServerFn({ method: "POST" }).validator(objectType({ prompt: stringType() })).handler(callGemini_createServerFn_handler, async ({ data }) => {
	const { data: settings, error } = await supabaseAdmin.from("integration_settings").select("gemini_key, ai_model").limit(1).maybeSingle();
	if (error || !settings?.gemini_key) throw new Error("Gemini API key not configured.");
	const model = new GoogleGenerativeAI(settings.gemini_key).getGenerativeModel({ model: settings.ai_model || "gemini-1.5-flash" });
	try {
		return { text: (await (await model.generateContent(data.prompt)).response).text() };
	} catch (err) {
		throw new Error(`Gemini API error: ${err instanceof Error ? err.message : String(err)}`);
	}
});
//#endregion
export { callGemini_createServerFn_handler };
