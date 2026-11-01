import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_MERCHANT_ID } from '@/lib/demo/store';

const rpc = vi.hoisted(() => vi.fn());
const resolveStoreMerchantId = vi.hoisted(() => vi.fn());

vi.mock('@/lib/demo/client', () => ({ supabase: { rpc } }));
vi.mock('@/lib/store-merchant', () => ({ resolveStoreMerchantId }));

import { useStoreName } from '../use-store-name';

describe('useStoreName', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the name a real store saved', async () => {
    resolveStoreMerchantId.mockResolvedValue('real');
    rpc.mockResolvedValue({ data: 'My Store', error: null });
    const { result } = renderHook(() => useStoreName('CART BLANCHE'));
    await waitFor(() => expect(result.current).toBe('My Store'));
    expect(rpc).toHaveBeenCalledWith('store_name', { p_merchant_id: 'real' });
  });

  it('keeps the fallback when the store has no name', async () => {
    resolveStoreMerchantId.mockResolvedValue('real');
    rpc.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useStoreName('CART BLANCHE'));
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(result.current).toBe('CART BLANCHE');
  });

  it('never asks for a name in the demo', async () => {
    resolveStoreMerchantId.mockResolvedValue(DEMO_MERCHANT_ID);
    const { result } = renderHook(() => useStoreName('CART BLANCHE'));
    await waitFor(() => expect(resolveStoreMerchantId).toHaveBeenCalled());
    expect(rpc).not.toHaveBeenCalled();
    expect(result.current).toBe('CART BLANCHE');
  });
});
