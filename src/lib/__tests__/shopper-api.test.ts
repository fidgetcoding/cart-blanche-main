import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const configured = vi.hoisted(() => ({ value: true }));
vi.mock('@/integrations/supabase/client', () => ({
  get isBackendConfigured() {
    return configured.value;
  },
}));

import { submitStoreSignup, uploadChatImage } from '../shopper-api';

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('shopper api', () => {
  beforeEach(() => {
    configured.value = true;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('posts signups to the store-signup function', async () => {
    fetchMock.mockResolvedValue(json({ ok: true }));
    const signup = { kind: 'subscriber' as const, merchant_id: 'm', email: 'a@example.com' };
    await expect(submitStoreSignup(signup)).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://x.supabase.co/functions/v1/store-signup');
    expect(JSON.parse(init.body)).toEqual(signup);
  });

  it('passes the function\'s error back, and survives a network failure', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'Too many tries.' }, 429));
    const signup = { kind: 'subscriber' as const, merchant_id: 'm', email: 'a@example.com' };
    await expect(submitStoreSignup(signup)).resolves.toEqual({ ok: false, error: 'Too many tries.' });
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(submitStoreSignup(signup)).resolves.toEqual({ ok: false });
  });

  it('uploads chat images through the function and builds the public URL', async () => {
    fetchMock.mockResolvedValue(json({ path: '1-a.png' }));
    const file = new File(['x'], 'x.png', { type: 'image/png' });
    await expect(uploadChatImage(file)).resolves.toBe('https://x.supabase.co/storage/v1/object/public/chat-uploads/1-a.png');
    expect(fetchMock.mock.calls[0][0]).toBe('https://x.supabase.co/functions/v1/chat-upload');
  });

  it('surfaces upload refusals', async () => {
    fetchMock.mockResolvedValue(json({ error: 'Too many uploads.' }, 429));
    await expect(uploadChatImage(new File(['x'], 'x.png'))).rejects.toThrow('Too many uploads.');
  });

  it('keeps the photo in the browser with no backend', async () => {
    configured.value = false;
    URL.createObjectURL = vi.fn(() => 'blob:local');
    await expect(uploadChatImage(new File(['x'], 'x.png'))).resolves.toBe('blob:local');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
