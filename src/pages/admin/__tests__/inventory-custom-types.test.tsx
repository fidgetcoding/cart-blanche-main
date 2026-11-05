import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ demo: true }));
const rows = vi.hoisted(() => [{
  id: 'real-1', merchant_id: 'm', title: 'Alpha Tee', price: 40, description: '', category: 'essentials',
  product_type: 'shirt', gender: 'unisex', colorways: [], images: [], tags: [], status: 'active',
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
    getAllProductsUnfiltered: () => [{ id: 'sample', title: 'Sample Tee', price: 1, images: [], category: 'essentials', variants: [], description: '' }],
  }),
}));
vi.mock('@/hooks/use-product-waitlist', () => ({
  useProductWaitlist: () => ({ forProduct: () => [], countFor: () => 0, markFulfilled: vi.fn(), deleteSignup: vi.fn() }),
}));
vi.mock('@/lib/demo/client', () => {
  const chain = (data: unknown) => {
    const c: Record<string, unknown> = {
      select: () => c,
      eq: () => c,
      in: () => c,
      then: (done: (value: unknown) => void) => done({ data, error: null }),
    };
    return c;
  };
  const session = { user: { id: 'm' } };
  return {
    isDemoSession: () => store.demo,
    supabase: {
      auth: { getSession: async () => ({ data: { session } }) },
      from: (table: string) => chain(table === 'products' && !store.demo ? rows : []),
    },
  };
});

import AdminInventory from '../AdminInventory';

const KEY = 'cb_custom_product_types';

async function addType(name: string) {
  render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminInventory /> }])} />);
  await screen.findByText(store.demo ? 'Sample Tee' : 'Alpha Tee');
  await new Promise(resolve => setTimeout(resolve, 0));
  fireEvent.click(screen.getByRole('button', { name: '+ ADD' }));
  const input = screen.getByPlaceholderText('new category');
  fireEvent.change(input, { target: { value: name } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(await screen.findByRole('button', { name: name.toUpperCase() })).toBeTruthy();
}

describe('custom product types', () => {
  beforeEach(() => localStorage.clear());

  it('last only for the visit in the demo, like its other changes', async () => {
    store.demo = true;
    await addType('vest');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('ignore types this browser remembers for a real store while in the demo', async () => {
    store.demo = true;
    localStorage.setItem(KEY, JSON.stringify(['cape']));
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminInventory /> }])} />);
    await screen.findByText('Sample Tee');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByRole('button', { name: 'CAPE' })).toBeNull();
  });

  it('are remembered in this browser for a real store', async () => {
    store.demo = false;
    localStorage.setItem(KEY, JSON.stringify(['cape']));
    await addType('vest');
    expect(screen.getByRole('button', { name: 'CAPE' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(['cape', 'vest']);
  });
});
