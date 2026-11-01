import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const update = vi.hoisted(() => vi.fn());
const row = vi.hoisted(() => ({
  id: 'real-1', merchant_id: 'm', title: 'Real Tee', price: 40, compare_at_price: 50, description: 'Soft',
  category: 'essentials', product_type: 'shirt', gender: 'unisex', colorways: [], images: [], tags: [],
  status: 'active', weight_oz: 0, shipping_type: 'domestic', hs_code: '',
}));

vi.mock('@/hooks/use-grid-layout', () => ({
  useGridLayout: () => ({
    layout: null,
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
      update: (patch: unknown) => {
        update(patch);
        return { eq: async () => ({ error: null }) };
      },
      then: (done: (value: unknown) => void) => done({ data, error: null }),
    };
    return c;
  };
  const session = { user: { id: 'm' } };
  return {
    isDemoSession: () => false,
    supabase: {
      auth: {
        getSession: async () => ({ data: { session } }),
        getUser: async () => ({ data: { user: session.user } }),
      },
      from: (table: string) => {
        if (table === 'products') return chain([row]);
        if (table === 'grid_layouts') return { upsert: async () => ({ error: null }) };
        return chain([]);
      },
    },
  };
});

import AdminInventory from '../AdminInventory';

async function openRow() {
  render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminInventory /> }])} />);
  fireEvent.click(await screen.findByText('Real Tee'));
}

const saveButton = () => screen.getByRole('button', { name: /^SAVE$/ }) as HTMLButtonElement;

describe('editing a real product in its row', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lets the merchant save a new title on its own', async () => {
    await openRow();
    expect(saveButton().disabled).toBe(true);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Real Tee' }))[0]);
    const input = screen.getByDisplayValue('Real Tee');
    fireEvent.change(input, { target: { value: 'Better Tee' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(saveButton().disabled).toBe(false);
    fireEvent.click(saveButton());
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Better Tee' })));
  });

  it('lets the merchant save a new price on its own', async () => {
    await openRow();
    fireEvent.click(await screen.findByRole('button', { name: '$40' }));
    const input = screen.getByDisplayValue('40');
    fireEvent.change(input, { target: { value: '45' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(saveButton().disabled).toBe(false);
    fireEvent.click(saveButton());
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ price: 45 })));
  });
});
