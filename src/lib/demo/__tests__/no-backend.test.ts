import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClient = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({ createClient }));
vi.mock('sonner', () => ({ toast }));

async function loadWithEnv(url: string, key: string, merchant = '') {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', url);
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', key);
  vi.stubEnv('VITE_STORE_MERCHANT_ID', merchant);
  const real = await import('@/integrations/supabase/client');
  const demo = await import('../client');
  return { real, demo };
}

describe('with no backend configured', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/demo');
  });

  it.each([
    ['', ''],
    ['https://x.supabase.co', ''],
    ['', 'key'],
  ])('never calls createClient with url=%j key=%j', async (url, key) => {
    const { real } = await loadWithEnv(url, key);
    expect(createClient).not.toHaveBeenCalled();
    expect(real.supabase).toBeNull();
    expect(real.isBackendConfigured).toBe(false);
  });

  it('runs the storefront and admin on demo data', async () => {
    for (const path of ['/demo', '/demo/admin']) {
      window.history.pushState({}, '', path);
      const { demo } = await loadWithEnv('', '');
      expect(await demo.isDemoMode()).toBe(true);
      const { data, error } = await demo.supabase.from('discount_codes').select('*');
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    }
  });

  it('stays on demo data even if a store merchant is set', async () => {
    const { demo } = await loadWithEnv('', '', 'store-merchant');
    expect(await demo.isDemoMode()).toBe(true);
  });

  it('reports no real session and a working auth subscription', async () => {
    const { demo } = await loadWithEnv('', '');
    const { data: { session } } = await demo.realAuth.getSession();
    expect(session).toBeNull();
    const { data: { subscription } } = demo.realAuth.onAuthStateChange(() => {});
    expect(() => subscription.unsubscribe()).not.toThrow();
    await expect(demo.supabase.auth.signOut()).resolves.toEqual({ error: null });
  });

  it('keeps every upload local, including shopper chat images', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:local');
    const { demo } = await loadWithEnv('', '');
    const file = new File(['x'], 'x.png', { type: 'image/png' });
    const { error } = await demo.supabase.storage.from('chat-uploads').upload('a.png', file);
    expect(error).toBeNull();
    expect(demo.supabase.storage.from('chat-uploads').getPublicUrl('a.png').data.publicUrl).toBe('blob:local');
  });

  it('creates the client once both values are set', async () => {
    createClient.mockReturnValue({ auth: {}, storage: { from: vi.fn() } });
    const { real } = await loadWithEnv('https://x.supabase.co', 'key');
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(real.isBackendConfigured).toBe(true);
  });
});
