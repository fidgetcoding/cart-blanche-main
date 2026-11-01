import { beforeEach, describe, expect, it, vi } from 'vitest';

const realAuth = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
}));
const realFrom = vi.hoisted(() => vi.fn());
const realRpc = vi.hoisted(() => vi.fn());
const realStorageFrom = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: realAuth, from: realFrom, rpc: realRpc, storage: { from: realStorageFrom } },
}));
vi.mock('sonner', () => ({ toast }));

import { DEMO_TOAST, isDemoMode, isDemoSession, supabase } from '../client';
import { DEMO_MERCHANT_ID, resetDemoStore } from '../store';

const REAL_SESSION = { access_token: 'real-token', user: { id: 'real-merchant' } };

function setPath(path: string) {
  window.history.pushState({}, '', path);
}

/** A stand-in postgrest builder that records its chain and resolves when awaited. */
function fakeBuilder(result: unknown) {
  const calls: [string, unknown[]][] = [];
  const builder = new Proxy({} as Record<string, unknown>, {
    get(_t, prop) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(result);
      return (...args: unknown[]) => {
        calls.push([String(prop), args]);
        return builder;
      };
    },
  });
  return { builder, calls };
}

describe('demo-aware client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    resetDemoStore();
    setPath('/admin');
    realAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    realStorageFrom.mockReturnValue({ upload: vi.fn().mockResolvedValue({ data: { path: 'real' }, error: null }), getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://real/x' } })) });
    URL.createObjectURL = vi.fn(() => 'blob:demo');
  });

  describe('with no session on /admin', () => {
    it('serves reads from the demo store without touching the real client', async () => {
      const { data } = await supabase.from('discount_codes').select('*').eq('merchant_id', DEMO_MERCHANT_ID);
      expect(data!.length).toBeGreaterThan(0);
      expect(realFrom).not.toHaveBeenCalled();
    });

    it('keeps writes in memory and tells the visitor', async () => {
      const { error } = await supabase.from('discount_codes').delete().eq('id', 'demo-code-1');
      expect(error).toBeNull();
      expect(realFrom).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith(DEMO_TOAST, { id: 'demo-mode' });
    });

    it('does not toast for reads or chat history', async () => {
      await supabase.from('orders').select('*');
      await supabase.from('conversations').insert({ merchant_id: DEMO_MERCHANT_ID, title: 'x' });
      expect(toast).not.toHaveBeenCalled();
    });

    it('returns a demo session and user', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      expect(isDemoSession(session)).toBe(true);
      expect(user?.id).toBe(DEMO_MERCHANT_ID);
      expect(realAuth.getUser).not.toHaveBeenCalled();
    });

    it('turns uploads into local object URLs', async () => {
      const file = new File(['x'], 'x.png', { type: 'image/png' });
      const { error } = await supabase.storage.from('product-media').upload('images/x.png', file);
      const { data } = supabase.storage.from('product-media').getPublicUrl('images/x.png');
      expect(error).toBeNull();
      expect(data.publicUrl).toBe('blob:demo');
      expect(realStorageFrom.mock.results[0].value.upload).not.toHaveBeenCalled();
    });

    it('answers validate_discount locally', async () => {
      const { data } = await supabase.rpc('validate_discount', { p_merchant_id: DEMO_MERCHANT_ID, p_code: 'welcome10' });
      expect(data[0].status).toBe('ok');
      expect(realRpc).not.toHaveBeenCalled();
    });

    it('stays in demo on /admin even when a store merchant is configured', async () => {
      vi.stubEnv('VITE_STORE_MERCHANT_ID', 'store-merchant');
      expect(await isDemoMode()).toBe(true);
    });
  });

  describe('with a real session', () => {
    beforeEach(() => {
      realAuth.getSession.mockResolvedValue({ data: { session: REAL_SESSION }, error: null });
      realAuth.getUser.mockResolvedValue({ data: { user: REAL_SESSION.user }, error: null });
    });

    it('replays the exact chain on the real client', async () => {
      const { builder, calls } = fakeBuilder({ data: [{ id: 1 }], error: null });
      realFrom.mockReturnValue(builder);
      const result = await supabase.from('products').select('*').eq('merchant_id', 'real-merchant').order('created_at');
      expect(realFrom).toHaveBeenCalledWith('products');
      expect(calls).toEqual([
        ['select', ['*']],
        ['eq', ['merchant_id', 'real-merchant']],
        ['order', ['created_at']],
      ]);
      expect(result.data).toEqual([{ id: 1 }]);
    });

    it('sends writes to the real client with no demo toast', async () => {
      const { builder, calls } = fakeBuilder({ data: null, error: null });
      realFrom.mockReturnValue(builder);
      await supabase.from('products').update({ title: 'x' } as never).eq('id', 'p');
      expect(calls[0]).toEqual(['update', [{ title: 'x' }]]);
      expect(toast).not.toHaveBeenCalled();
    });

    it('passes auth, rpc and storage through', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBe(REAL_SESSION);
      expect(isDemoSession(session)).toBe(false);
      await supabase.auth.getUser();
      expect(realAuth.getUser).toHaveBeenCalled();
      await supabase.auth.signOut();
      expect(realAuth.signOut).toHaveBeenCalled();
      realRpc.mockResolvedValue({ data: [], error: null });
      await supabase.rpc('validate_discount', { p_merchant_id: 'm', p_code: 'c' });
      expect(realRpc).toHaveBeenCalled();
      const file = new File(['x'], 'x.png');
      const { data } = await supabase.storage.from('product-media').upload('a.png', file);
      expect(data?.path).toBe('real');
    });
  });

  describe('anonymous on the storefront', () => {
    beforeEach(() => setPath('/'));

    it('uses demo data and stays quiet when no store merchant is configured', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      expect(user?.id).toBe(DEMO_MERCHANT_ID);
      await supabase.from('subscribers').insert({ merchant_id: DEMO_MERCHANT_ID, email: 'new@example.com' });
      expect(realFrom).not.toHaveBeenCalled();
      expect(toast).not.toHaveBeenCalled();
    });

    it('goes to the real client when a store merchant is configured', async () => {
      vi.stubEnv('VITE_STORE_MERCHANT_ID', 'store-merchant');
      realAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
      const { builder } = fakeBuilder({ data: [], error: null });
      realFrom.mockReturnValue(builder);
      await supabase.from('products').select('*');
      expect(realFrom).toHaveBeenCalledWith('products');
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    });

    it('keeps shopper chat image uploads real so the assistant can read them', async () => {
      const file = new File(['x'], 'x.png', { type: 'image/png' });
      const { data } = await supabase.storage.from('chat-uploads').upload('a.png', file);
      expect(data?.path).toBe('real');
      expect(toast).not.toHaveBeenCalled();
    });
  });
});
