import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: null }));
import { useGridLayout } from '../use-grid-layout';
import { resetDemoStore, runDemoQuery } from '@/lib/demo/store';

it('preserves independent edits from overlapping layout consumers', async () => {
  resetDemoStore();
  const a = renderHook(() => useGridLayout());
  const b = renderHook(() => useGridLayout());
  await waitFor(() => expect(a.result.current.loading || b.result.current.loading).toBe(false));
  await act(async () => {
    await Promise.all([
      a.result.current.saveHiddenTags(['outerwear']),
      b.result.current.saveLayout(['p2', 'p1'], ['ALL', 'STREETWEAR']),
    ]);
  });
  const { data } = runDemoQuery('grid_layouts', [['select', ['*']]]);
  expect(data[0]).toMatchObject({ hidden_tags: ['outerwear'], product_order: ['p2', 'p1'] });
  expect(a.result.current.layout).toMatchObject({ hiddenTags: ['outerwear'], productOrder: ['p2', 'p1'] });
  expect(b.result.current.layout).toEqual(a.result.current.layout);
});
