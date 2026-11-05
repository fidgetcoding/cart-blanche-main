import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const rows = vi.hoisted(() => [['Alpha Tee', 'shirt', 'men'], ['Beta Pant', 'pants', 'women'], ['Gamma Tee', 'shirt', 'women']]
  .map(([title, type, gender], i) => ({
    id: `real-${i + 1}`, merchant_id: 'm', title, price: 40, description: '', category: 'essentials',
    product_type: type, gender, colorways: [], images: [], tags: [], status: 'active',
    weight_oz: 0, shipping_type: 'domestic', hs_code: '',
  })));

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
    isDemoSession: () => false,
    supabase: {
      auth: { getSession: async () => ({ data: { session } }) },
      from: (table: string) => chain(table === 'products' ? rows : []),
    },
  };
});

import AdminInventory from '../AdminInventory';

const grips = () => screen.queryAllByTitle('Drag to reorder');

async function renderList() {
  render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminInventory /> }])} />);
  await screen.findByText('Beta Pant');
}

// A drag reorders the whole catalogue, so it only makes sense on the whole list:
// starting one in a filtered list showed every product mid-drag and moved the wrong rows.
describe('reordering inventory rows', () => {
  it('is offered on the full list', async () => {
    await renderList();
    expect(grips()).toHaveLength(3);
  });

  it('is not offered while a type filter is on', async () => {
    await renderList();
    fireEvent.click(screen.getByRole('button', { name: 'SHIRT' }));
    expect(screen.queryByText('Beta Pant')).toBeNull();
    expect(grips()).toHaveLength(0);
  });

  it('is not offered while a gender filter is on', async () => {
    await renderList();
    fireEvent.click(screen.getByRole('button', { name: 'WOMEN' }));
    expect(screen.queryByText('Alpha Tee')).toBeNull();
    expect(grips()).toHaveLength(0);
  });

  it('is not offered while searching', async () => {
    await renderList();
    fireEvent.change(screen.getByPlaceholderText('Search products...'), { target: { value: 'tee' } });
    expect(screen.queryByText('Beta Pant')).toBeNull();
    expect(grips()).toHaveLength(0);
  });
});

// On a phone (or a laptop with the chat open) the row's fixed-width numbers left the title no room at
// all. The row wraps its numbers onto a second line before the title shrinks below a readable width.
describe('an inventory row on a narrow screen', () => {
  it('wraps its numbers under the title instead of hiding the title', async () => {
    await renderList();
    const title = screen.getByText('Alpha Tee').parentElement!;
    const row = title.parentElement!;
    expect(row.className.split(' ')).toContain('flex-wrap');
    expect(title.className).toMatch(/\bmin-w-\[8rem\]/);
    const numbers = screen.getAllByText('units')[0].closest('.ml-auto')!;
    expect(numbers.parentElement).toBe(row);
    expect(numbers.className.split(' ')).toContain('flex-wrap');
  });
});
