import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hook = vi.hoisted(() => ({ loading: false, products: [] as unknown[] }));
const real = vi.hoisted(() => ({
  id: 'real-1', title: 'Real Tee', price: 40, images: [], category: 'essentials', product_type: 'shirt',
  gender: 'unisex', status: 'active', grid_position: { x: 0, y: 0 }, description: '', variants: [],
}));

vi.mock('@/hooks/use-grid-layout', () => ({
  useGridLayout: () => ({
    loading: hook.loading,
    layout: null,
    getOrderedProducts: () => hook.products,
    getAllProductsUnfiltered: () => hook.products,
    getOrderedCategories: () => ['ALL'],
    saveLayout: vi.fn(),
    saveHiddenTags: vi.fn(),
    resetLayout: vi.fn(),
  }),
}));
vi.mock('@/lib/demo/client', () => {
  const chain = { select: () => chain, eq: () => chain, limit: () => chain, maybeSingle: async () => ({ data: null }) };
  return { supabase: { auth: { getUser: async () => ({ data: { user: { id: 'm' } } }) }, from: () => chain } };
});

import AdminStylingGuide from '../AdminStylingGuide';

describe('the look book on a real store', () => {
  beforeEach(() => {
    hook.loading = false;
    hook.products = [real];
  });

  it('lists the store\'s products, not the samples', async () => {
    const router = createMemoryRouter([{ path: '/', element: <AdminStylingGuide /> }]);
    render(<RouterProvider router={router} />);
    await screen.findByText('Real Tee');
    expect(screen.queryByText('Cloud Puffer Jacket')).toBeNull();
  });

  it('lists a product that has no category yet', async () => {
    hook.products = [{ ...real, product_type: '' }];
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminStylingGuide /> }])} />);
    await screen.findByText('Real Tee');
  });

  it('lists them when they arrive after the page opens', async () => {
    hook.loading = true;
    hook.products = [{ ...real, id: 'sample', title: 'Cloud Puffer Jacket' }];
    let refresh = () => {};
    const Host = () => {
      const [, setTick] = useState(0);
      refresh = () => setTick(tick => tick + 1);
      return <AdminStylingGuide />;
    };
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <Host /> }])} />);
    await screen.findByText(/LOADING/i);
    hook.loading = false;
    hook.products = [real];
    act(() => refresh());
    await screen.findByText('Real Tee');
    expect(screen.queryByText('Cloud Puffer Jacket')).toBeNull();
  });
});
