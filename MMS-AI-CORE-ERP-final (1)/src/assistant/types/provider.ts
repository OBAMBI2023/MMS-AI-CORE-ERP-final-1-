export interface AssistantMessage {
  id: string;
  kind: "user" | "assistant" | "typing" | "analysis" | "invoice";
  text?: string;
  steps?: any[];
  invoice?: any;
}

export interface AssistantProvider {
  name: string;
  generateResponse(messages: AssistantMessage[], prompt: string): Promise<string>;
}
