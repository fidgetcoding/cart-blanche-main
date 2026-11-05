import { act, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const grid = vi.hoisted(() => ({ setLayout: (_layout: unknown) => {} }));
const fetches = vi.hoisted(() => {
  let open = () => {};
  const firstFetch = new Promise<void>(resolve => { open = resolve; });
  return { products: 0, firstFetch, open: () => open() };
});
const rows = vi.hoisted(() => ['Alpha', 'Beta'].map((name, i) => ({
  id: `real-${i + 1}`, merchant_id: 'm', title: `${name} Tee`, price: 40, description: '', category: 'essentials',
  product_type: 'shirt', gender: 'unisex', colorways: [], images: [], tags: [], status: 'active',
  weight_oz: 0, shipping_type: 'domestic', hs_code: '',
})));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/hooks/use-grid-layout', async () => {
  const { useState } = await import('react');
  const saves = {
    saveHiddenTags: vi.fn(),
    saveHiddenProductIds: vi.fn(),
    saveHiddenGenders: vi.fn(),
    saveDemoProductOverride: vi.fn(),
    saveLayout: vi.fn(),
    getAllProductsUnfiltered: () => [],
  };
  return {
    useGridLayout: () => {
      const [layout, setLayout] = useState<unknown>(null);
      grid.setLayout = setLayout;
      return { layout, ...saves };
    },
  };
});
vi.mock('@/hooks/use-product-waitlist', () => ({
  useProductWaitlist: () => ({ forProduct: () => [], countFor: () => 0, markFulfilled: vi.fn(), deleteSignup: vi.fn() }),
}));
vi.mock('@/lib/demo/client', () => {
  const chain = (load: () => Promise<unknown>) => {
    const c: Record<string, unknown> = {
      select: () => c,
      eq: () => c,
      in: () => c,
      then: (done: (value: unknown) => void) => load().then(data => done({ data, error: null })),
    };
    return c;
  };
  const session = { user: { id: 'm' } };
  return {
    isDemoSession: () => false,
    supabase: {
      auth: { getSession: async () => ({ data: { session } }) },
      from: (table: string) => {
        if (table !== 'products') return chain(async () => []);
        // The first products fetch (the mount fetch) waits until the test lets it land.
        return chain(async () => {
          fetches.products += 1;
          if (fetches.products === 1) await fetches.firstFetch;
          return rows;
        });
      },
    },
  };
});

import AdminInventory from '../AdminInventory';

const layout = {
  productOrder: ['real-2', 'real-1'],
  categoryOrder: [],
  hiddenTags: [],
  hiddenProductTypes: [],
  hiddenProductIds: [],
  hiddenGenders: [],
  demoProductOverrides: {},
};

const betaListedFirst = () =>
  Boolean(screen.getAllByText('Beta Tee')[0].compareDocumentPosition(screen.getAllByText('Alpha Tee')[0])
    & Node.DOCUMENT_POSITION_FOLLOWING);

describe('a saved product order', () => {
  it('still applies when the layout loads while the first fetch is in flight', async () => {
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminInventory /> }])} />);
    await waitFor(() => expect(fetches.products).toBe(1));

    act(() => grid.setLayout(layout));
    await act(async () => fetches.open());

    await waitFor(() => expect(betaListedFirst()).toBe(true));
    expect(fetches.products).toBe(2);

    // Later layout saves don't refetch, so they can't wipe unsaved edits.
    act(() => grid.setLayout({ ...layout, hiddenTags: ['essentials'] }));
    await act(async () => {});
    expect(fetches.products).toBe(2);
  });
});
