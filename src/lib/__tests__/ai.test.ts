import { afterEach, describe, expect, it, vi } from 'vitest';
import { AI_NOT_CONFIGURED, DEFAULT_AI_BASE_URL, DEFAULT_AI_MODEL, aiFailure, chatCompletions, readAiConfig } from '../../../supabase/functions/_shared/ai.ts';

const envOf = (values: Record<string, string>) => (name: string) => values[name];

describe('readAiConfig', () => {
  it('returns null without a key, even with the other settings', () => {
    expect(readAiConfig(envOf({}))).toBeNull();
    expect(readAiConfig(envOf({ AI_API_KEY: '   ', AI_MODEL: 'm' }))).toBeNull();
  });

  it('falls back to the default provider and model', () => {
    expect(readAiConfig(envOf({ AI_API_KEY: 'k' }))).toEqual({ apiKey: 'k', baseUrl: DEFAULT_AI_BASE_URL, model: DEFAULT_AI_MODEL });
  });

  it('honours overrides and trims a trailing slash', () => {
    expect(readAiConfig(envOf({ AI_API_KEY: 'k', AI_BASE_URL: 'https://x.test/v1/', AI_MODEL: 'm' })))
      .toEqual({ apiKey: 'k', baseUrl: 'https://x.test/v1', model: 'm' });
  });
});

describe('chatCompletions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts the OpenAI-compatible shape with the configured model and key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await chatCompletions({ apiKey: 'k', baseUrl: 'https://x.test/v1', model: 'm' }, { messages: [], max_tokens: 5 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://x.test/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer k');
    expect(JSON.parse(init.body)).toEqual({ model: 'm', messages: [], max_tokens: 5 });
  });
});

describe('aiFailure', () => {
  it.each([
    [429, 429, 'ai_rate_limited'],
    [402, 402, 'ai_credits_exhausted'],
    [401, 502, 'ai_key_rejected'],
    [403, 502, 'ai_key_rejected'],
    [500, 502, 'ai_provider_error'],
    [404, 502, 'ai_provider_error'],
  ])('maps provider %i to %i %s', (provider, status, code) => {
    const failure = aiFailure(provider);
    expect(failure.status).toBe(status);
    expect(failure.body.code).toBe(code);
  });

  it('never echoes provider text', () => {
    expect(JSON.stringify(aiFailure(500))).not.toContain('sk-');
  });
});

describe('AI_NOT_CONFIGURED', () => {
  it('carries the code the storefront looks for', () => {
    expect(AI_NOT_CONFIGURED.code).toBe('ai_not_configured');
  });
});
