// Server functions for the AI provider settings (OpenAI / Gemini / Claude keys).
//
// These values live in `public.integration_settings`, a table with NO RLS
// policy for anon/authenticated roles — it is unreachable from the browser
// even with the public anon key. The only way to read or write it is through
// these TanStack Start server functions, which run on the server and use the
// service-role client (`supabaseAdmin`).
//
// This keeps the Paramètres > Assistant IA tab working exactly as before
// (same fields, same "Enregistrer" button) while the secrets themselves
// never transit through the anon Supabase client.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface AiSettings {
  openai_key: string | null;
  gemini_key: string | null;
  claude_key: string | null;
  ai_model: string | null;
  ai_temperature: number | null;
  ai_max_tokens: number | null;
  ai_enabled: boolean;
}

const aiSettingsSchema = z.object({
  openai_key: z.string().nullable().optional(),
  gemini_key: z.string().nullable().optional(),
  claude_key: z.string().nullable().optional(),
  ai_model: z.string().nullable().optional(),
  ai_temperature: z.number().min(0).max(1).nullable().optional(),
  ai_max_tokens: z.number().int().positive().max(32000).nullable().optional(),
  ai_enabled: z.boolean().optional(),
});

export const getAiSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<AiSettings> => {
    const { data, error } = await supabaseAdmin
      .from("integration_settings")
      .select(
        "openai_key, gemini_key, claude_key, ai_model, ai_temperature, ai_max_tokens, ai_enabled",
      )
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (
      data ?? {
        openai_key: null,
        gemini_key: null,
        claude_key: null,
        ai_model: "Gemini",
        ai_temperature: 0.7,
        ai_max_tokens: 2048,
        ai_enabled: true,
      }
    );
  },
);

export const saveAiSettings = createServerFn({ method: "POST" })
  .validator(aiSettingsSchema)
  .handler(async ({ data }) => {
    const { data: existing, error: e1 } = await supabaseAdmin
      .from("integration_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (e1) throw new Error(e1.message);

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("integration_settings")
        .update(data)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("integration_settings").insert(data);
      if (error) throw new Error(error.message);
    }
    return { success: true as const };
  });
