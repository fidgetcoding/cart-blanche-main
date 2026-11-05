import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const grid = vi.hoisted(() => ({ setLayout: (_layout: unknown) => {}, setLoading: (_loading: boolean) => {} }));
const fetches = vi.hoisted(() => ({ products: 0 }));
const rows = vi.hoisted(() => [{
  id: 'real-1', merchant_id: 'm', title: 'Alpha Tee', price: 40, description: '', category: 'essentials',
  product_type: 'shirt', gender: 'unisex', colorways: [], images: [], tags: [], status: 'active',
  weight_oz: 0, shipping_type: 'domestic', hs_code: '',
}]);

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
      const [loading, setLoading] = useState(true);
      grid.setLayout = setLayout;
      grid.setLoading = setLoading;
      return { layout, loading, ...saves };
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
      from: (table: string) => chain(async () => {
        if (table !== 'products') return [];
        fetches.products += 1;
        return rows;
      }),
    },
  };
});

import AdminInventory from '../AdminInventory';

const layout = {
  productOrder: [],
  categoryOrder: [],
  hiddenTags: [],
  hiddenProductTypes: [],
  hiddenProductIds: ['real-1'],
  hiddenGenders: [],
  demoProductOverrides: {},
};

describe('a store with no saved layout yet', () => {
  it('keeps unsaved edits when its first layout save lands', async () => {
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminInventory /> }])} />);
    fireEvent.click(await screen.findByText('Alpha Tee'));
    // The layout finished loading and there was none, as in the demo.
    act(() => grid.setLoading(false));

    fireEvent.click((await screen.findAllByRole('button', { name: 'Alpha Tee' }))[0]);
    const input = screen.getByDisplayValue('Alpha Tee');
    fireEvent.change(input, { target: { value: 'Alpha Edited' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findAllByText('Alpha Edited');

    // Hiding a product (or any other layout write) creates the first saved layout.
    act(() => grid.setLayout(layout));
    await act(async () => {});

    expect(fetches.products).toBe(1);
    await waitFor(() => expect(screen.getAllByText('Alpha Edited').length).toBeGreaterThan(0));
    expect(screen.queryByText('Alpha Tee')).toBeNull();
  });
});
