import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/use-grid-layout', () => {
  const catalog = { loading: false, getAllProductsUnfiltered: () => [], getOrderedCategories: () => [] };
  return { useGridLayout: () => catalog };
});
vi.mock('@/components/admin/StyleGuideCanvas', () => ({ default: () => null }));
vi.mock('@/lib/demo/client', () => {
  const read: Record<string, unknown> = {
    select: () => read, eq: () => read, order: () => read, limit: () => read,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  return { supabase: { auth: { getUser: async () => ({ data: { user: { id: 'm' } } }) }, from: () => read } };
});

import AdminStylingGuide from '../AdminStylingGuide';

const classesOf = (element: Element | null) => (element?.className ?? '').split(/\s+/);

// The product list is 384px wide, so beside the matches on a phone it pushed them off screen and the
// page scrolled sideways. Below md the list sits above the matches instead.
describe('the look book on a phone', () => {
  it('stacks the product list above the matches', async () => {
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminStylingGuide /> }])} />);
    const list = (await screen.findByPlaceholderText('Search products...')).closest('.liquid-glass');
    expect(classesOf(list)).toEqual(expect.arrayContaining(['w-full', 'md:w-96']));
    expect(classesOf(list!.parentElement)).toEqual(expect.arrayContaining(['flex-col', 'md:flex-row']));
  });

  it('lets the view switches wrap under the title', async () => {
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminStylingGuide /> }])} />);
    const header = (await screen.findByRole('heading', { name: 'Look Book' })).parentElement;
    expect(classesOf(header)).toContain('flex-wrap');
    expect(classesOf(screen.getByRole('button', { name: 'LIST' }).parentElement!.parentElement)).toContain('flex-wrap');
  });
});
