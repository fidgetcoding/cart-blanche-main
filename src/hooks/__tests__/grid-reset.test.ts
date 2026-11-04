import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
const upsert = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
vi.mock('@/lib/store-merchant', () => ({ resolveStoreMerchantId: async () => null }));
vi.mock('@/lib/demo/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'merchant' } } }) },
  from: () => ({ upsert }),
} }));
import { useGridLayout } from '../use-grid-layout';

it('persists every field reset in memory so reload cannot restore stale settings', async () => {
  const { result } = renderHook(() => useGridLayout());
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { expect(await result.current.resetLayout()).toBe(true); });
  expect(upsert.mock.calls[0][0]).toMatchObject({ hidden_genders: [], demo_product_overrides: {} });
  expect(result.current.layout).toMatchObject({ hiddenGenders: [], demoProductOverrides: {} });
});
