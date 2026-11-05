import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const fetch = vi.hoisted(() => {
  let land = () => {};
  const landed = new Promise<void>(resolve => { land = resolve; });
  return { landed, land: () => land() };
});
const rows = vi.hoisted(() => [{
  id: 'real-1', merchant_id: 'm', title: 'Alpha Tee', price: 40, description: '', category: 'essentials',
  product_type: 'shirt', gender: 'unisex', colorways: [], images: [], tags: ['essentials', 'new-arrivals'], status: 'active',
  weight_oz: 0, shipping_type: 'domestic', hs_code: '',
}]);

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/hooks/use-grid-layout', () => ({
  useGridLayout: () => ({
    layout: null,
    loading: false,
    saveHiddenTags: vi.fn(),
    saveHiddenProductIds: vi.fn(),
    saveHiddenGenders: vi.fn(),
    saveDemoProductOverride: vi.fn(),
    saveLayout: vi.fn(),
    getAllProductsUnfiltered: () => [],
  }),
}));
vi.mock('@/hooks/use-product-waitlist', () => ({
  useProductWaitlist: () => ({ forProduct: () => [], countFor: () => 0, markFulfilled: vi.fn(), deleteSignup: vi.fn() }),
}));
vi.mock('@/lib/demo/client', () => {
  const chain = (load: () => Promise<unknown>) => {
    const c: Record<string, unknown> = {
      select: () => c, eq: () => c, in: () => c,
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
        await fetch.landed;
        return rows;
      }),
    },
  };
});

import AdminInventory from '../AdminInventory';

// The tag, type and gender filters are built from the products. Shown before the products
// arrived, they grew when they landed (to two lines at 390px) and pushed the page down: load
// CLS 0.12 on a slow connection. They now appear with the list, in one go.
describe('inventory while its products load', () => {
  it('shows the filters only once there are products to filter', async () => {
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminInventory /> }])} />);
    const placeholder = await screen.findByText('LOADING...');
    expect(screen.queryByPlaceholderText('Search products...')).toBeNull();
    expect(screen.queryByRole('button', { name: 'ALL TYPES' })).toBeNull();

    await act(async () => fetch.land());

    expect(await screen.findByPlaceholderText('Search products...')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'NEW ARRIVALS' })).toBeTruthy();
    expect(screen.queryByText('LOADING...')).toBeNull();
    // The list is a new element. Reusing the placeholder's node made the browser count the list
    // as the placeholder moving down below the filters (CLS 0.07 at 1440, 0.20 at 390).
    expect(placeholder.isConnected).toBe(false);
  });
});
