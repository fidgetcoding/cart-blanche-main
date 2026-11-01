// OpenAI-compatible chat completions, so any provider with that API works.
// No Deno APIs here, so src/lib/__tests__/ai.test.ts can run it under vitest.

// Model ID checked against https://platform.claude.com/docs/en/api/openai-sdk on 2026-11-01.
export const DEFAULT_AI_BASE_URL = "https://api.anthropic.com/v1";
export const DEFAULT_AI_MODEL = "claude-opus-5-5";

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const AI_NOT_CONFIGURED = {
  error: "The AI assistant isn't set up yet. Set AI_API_KEY on this function.",
  code: "ai_not_configured",
};

export function readAiConfig(env: (name: string) => string | undefined): AiConfig | null {
  const apiKey = env("AI_API_KEY")?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (env("AI_BASE_URL")?.trim() || DEFAULT_AI_BASE_URL).replace(/\/+$/, ""),
    model: env("AI_MODEL")?.trim() || DEFAULT_AI_MODEL,
  };
}

export function chatCompletions(config: AiConfig, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: config.model, ...body }),
  });
}

/** What a caller should see when the provider answers with an error status. */
export function aiFailure(providerStatus: number): { status: number; body: { error: string; code: string } } {
  if (providerStatus === 429) {
    return { status: 429, body: { error: "Rate limit exceeded. Please try again in a moment.", code: "ai_rate_limited" } };
  }
  if (providerStatus === 402) {
    return { status: 402, body: { error: "AI credits exhausted.", code: "ai_credits_exhausted" } };
  }
  if (providerStatus === 401 || providerStatus === 403) {
    return { status: 502, body: { error: "The AI provider rejected this key. Check AI_API_KEY.", code: "ai_key_rejected" } };
  }
  return { status: 502, body: { error: "The AI provider returned an error. Please try again.", code: "ai_provider_error" } };
}
