import { supabase } from "@/integrations/supabase/client";
import { callGemini } from "@/lib/ai-server";

export async function processAssistantRequest(prompt: string) {
  try {
    // 1. Ask Gemini to analyze the request and provide a structure
    const geminiResponse = await callGemini({
      prompt: `Analyze this user request for an ERP system and tell me what data is needed and what query should be executed: "${prompt}". Return a JSON object with 'type' (e.g., 'sales_report', 'client_details') and 'query_params'.`,
    });

    // Note: Now accessing the parsed text directly
    const aiText = geminiResponse.text;

    // 2. Based on the analysis, perform the Supabase query
    if (prompt.toLowerCase().includes("chiffre d'affaires")) {
      const { data, error } = await supabase.from("ventes").select("total");

      if (error) throw error;

      const total = data.reduce((sum, v) => sum + (v.total || 0), 0);
      return `Le chiffre d'affaires total est de ${total.toLocaleString()} FCFA.`;
    }

    return "Je ne suis pas encore capable de répondre à cette question avec des données réelles.";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "Une erreur est survenue lors de la récupération des données.";
  }
}
