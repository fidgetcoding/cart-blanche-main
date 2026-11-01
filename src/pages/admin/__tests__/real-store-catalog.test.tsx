import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const real = vi.hoisted(() => ({
  id: 'real-1', title: 'Real Tee', price: 40, images: [], category: 'essentials', product_type: 'shirt',
  gender: 'unisex', status: 'active', grid_position: { x: 0, y: 0 }, description: '', variants: [],
}));

vi.mock('@/hooks/use-grid-layout', () => ({
  useGridLayout: () => ({
    loading: false,
    layout: null,
    getOrderedProducts: () => [real],
    getAllProductsUnfiltered: () => [real],
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
  it('lists the store\'s products, not the samples', async () => {
    const router = createMemoryRouter([{ path: '/', element: <AdminStylingGuide /> }]);
    render(<RouterProvider router={router} />);
    await screen.findByText('Real Tee');
    expect(screen.queryByText('Cloud Puffer Jacket')).toBeNull();
  });
});
