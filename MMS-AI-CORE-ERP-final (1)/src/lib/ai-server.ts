import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client.server";

// Architecture note: This structure is prepared for future provider expansion.
// You could create a provider registry or factory here.

export const callGemini = createServerFn({ method: "POST" })
  .validator(z.object({ prompt: z.string() }))
  .handler(async ({ data }) => {
    // 1. Get the current AI provider settings to retrieve the API key.
    // These live in `integration_settings`, not `parametres`: that table has
    // no RLS policy for anon/authenticated, so it's only reachable here,
    // server-side, via the service-role client.
    const { data: settings, error } = await supabase
      .from("integration_settings")
      .select("gemini_key, ai_model")
      .limit(1)
      .maybeSingle();

    if (error || !settings?.gemini_key) {
      throw new Error("Gemini API key not configured.");
    }

    // 2. Initialize the SDK
    const genAI = new GoogleGenerativeAI(settings.gemini_key);
    // Use configured model or default to gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: settings.ai_model || "gemini-1.5-flash" });

    // 3. Call the API
    try {
      // NOTE: Prepared for streaming: model.generateContentStream(data.prompt)
      const result = await model.generateContent(data.prompt);
      const response = await result.response;
      return { text: response.text() };
    } catch (err) {
      throw new Error(`Gemini API error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
