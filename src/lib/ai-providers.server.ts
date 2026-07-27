export type AiProviderName = "gemini" | "groq" | "openai" | "ollama";

export interface AiProvider {
  readonly name: AiProviderName;
  generateJson(prompt: string): Promise<AiProviderResult>;
}

export type AiProviderResult = {
  data: unknown;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
};

const tokenUsage = (
  input: unknown,
  output: unknown,
  total: unknown,
): AiProviderResult["usage"] => ({
  inputTokens: typeof input === "number" ? input : null,
  outputTokens: typeof output === "number" ? output : null,
  totalTokens: typeof total === "number" ? total : null,
});

function serverEnv(name: string): string | undefined {
  const value = typeof process !== "undefined" ? process.env[name] : undefined;
  return value?.trim() || undefined;
}

function requiredEnv(name: string, provider: AiProviderName): string {
  const value = serverEnv(name);
  if (!value) {
    throw new Error(
      `Le fournisseur IA « ${provider} » est sélectionné, mais ${name} n’est pas configurée côté serveur.`,
    );
  }
  return value;
}

function parseJson(value: string): unknown {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
  return JSON.parse(fenced ?? trimmed);
}

async function readError(response: Response): Promise<string> {
  const body = await response.text();
  if (!body) return `${response.status} ${response.statusText}`;
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof parsed.error === "string") return parsed.error;
    return parsed.error?.message ?? parsed.message ?? body;
  } catch {
    return body;
  }
}

async function postJson(url: string, init: RequestInit): Promise<any> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Le fournisseur IA a refusé la requête : ${await readError(response)}`);
  }
  return response.json();
}

class GeminiProvider implements AiProvider {
  readonly name = "gemini" as const;
  private readonly apiKey = requiredEnv("GEMINI_API_KEY", this.name);
  private readonly model = serverEnv("GEMINI_MODEL") ?? "gemini-2.0-flash";

  async generateJson(prompt: string): Promise<AiProviderResult> {
    const data = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
      },
    );
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") throw new Error("Gemini n’a retourné aucune réponse exploitable.");
    return {
      data: parseJson(text),
      usage: tokenUsage(
        data?.usageMetadata?.promptTokenCount,
        data?.usageMetadata?.candidatesTokenCount,
        data?.usageMetadata?.totalTokenCount,
      ),
    };
  }
}

abstract class OpenAiCompatibleProvider implements AiProvider {
  abstract readonly name: "groq" | "openai";
  protected abstract readonly endpoint: string;
  protected abstract readonly apiKey: string;
  protected abstract readonly model: string;

  async generateJson(prompt: string): Promise<AiProviderResult> {
    const data = await postJson(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new Error(`${this.name} n’a retourné aucune réponse exploitable.`);
    }
    return {
      data: parseJson(text),
      usage: tokenUsage(
        data?.usage?.prompt_tokens,
        data?.usage?.completion_tokens,
        data?.usage?.total_tokens,
      ),
    };
  }
}

class GroqProvider extends OpenAiCompatibleProvider {
  readonly name = "groq" as const;
  protected readonly endpoint = "https://api.groq.com/openai/v1/chat/completions";
  protected readonly apiKey = requiredEnv("GROQ_API_KEY", this.name);
  protected readonly model = serverEnv("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
}

class OpenAiProvider extends OpenAiCompatibleProvider {
  readonly name = "openai" as const;
  protected readonly endpoint = "https://api.openai.com/v1/chat/completions";
  protected readonly apiKey = requiredEnv("OPENAI_API_KEY", this.name);
  protected readonly model = serverEnv("OPENAI_MODEL") ?? "gpt-4o-mini";
}

class OllamaProvider implements AiProvider {
  readonly name = "ollama" as const;
  private readonly baseUrl = (serverEnv("OLLAMA_BASE_URL") ?? "http://127.0.0.1:11434").replace(
    /\/+$/,
    "",
  );
  private readonly model = requiredEnv("OLLAMA_MODEL", this.name);

  async generateJson(prompt: string): Promise<AiProviderResult> {
    const data = await postJson(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        format: "json",
        stream: false,
        options: { temperature: 0 },
      }),
    });
    const text = data?.message?.content;
    if (typeof text !== "string") throw new Error("Ollama n’a retourné aucune réponse exploitable.");
    return {
      data: parseJson(text),
      usage: tokenUsage(
        data?.prompt_eval_count,
        data?.eval_count,
        typeof data?.prompt_eval_count === "number" && typeof data?.eval_count === "number"
          ? data.prompt_eval_count + data.eval_count
          : null,
      ),
    };
  }
}

export function getAiProvider(): AiProvider {
  const configured = serverEnv("AI_PROVIDER")?.toLowerCase();
  if (!configured) {
    throw new Error(
      "Aucun fournisseur IA n’est configuré. Définissez AI_PROVIDER (gemini, groq, openai ou ollama) et la configuration serveur correspondante.",
    );
  }
  switch (configured) {
    case "gemini":
      return new GeminiProvider();
    case "groq":
      return new GroqProvider();
    case "openai":
      return new OpenAiProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      throw new Error(
        `Fournisseur IA « ${configured} » inconnu. Valeurs acceptées, par priorité : gemini, groq, openai, ollama.`,
      );
  }
}
