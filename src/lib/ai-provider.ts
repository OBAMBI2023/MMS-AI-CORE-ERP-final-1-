export interface AIProvider {
  ask(prompt: string): Promise<{ text: string }>;
}

// In the future, this factory will read the configuration to instantiate
// the correct provider (Gemini, OpenAI, Claude, Ollama, etc.)
export function getAIProvider(): AIProvider {
  // For now, it returns a placeholder or the default Gemini implementation
  return {
    async ask(prompt: string) {
      // Import and call the existing Gemini implementation
      const { callGemini } = await import("./ai-server");
      const result = await callGemini({ prompt });
      return { text: result.text };
    },
  };
}
