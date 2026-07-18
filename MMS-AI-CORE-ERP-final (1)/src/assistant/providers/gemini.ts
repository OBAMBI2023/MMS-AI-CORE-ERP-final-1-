import { AssistantMessage, AssistantProvider } from "../types/provider";
import { callGemini } from "@/lib/ai-server";

export class GeminiProvider implements AssistantProvider {
  name = "gemini";

  async generateResponse(messages: AssistantMessage[], prompt: string): Promise<string> {
    // Call the existing server function
    const result = await callGemini({ prompt });
    // Assuming result structure based on previous inspection
    return JSON.stringify(result);
  }
}
