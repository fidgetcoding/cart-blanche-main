import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const signup = (id: string, product_id: string, email: string) => ({
  id, product_id, email, name: null, size_preference: null, colorway_preference: null, status: 'pending',
  created_at: '2026-11-01T00:00:00.000Z',
});

vi.mock('@/hooks/use-product-waitlist', () => ({
  useProductWaitlist: () => ({
    loading: false,
    markFulfilled: vi.fn(),
    deleteSignup: vi.fn(),
    signups: [signup('1', 'on-sale', 'a@example.com'), signup('2', 'archived', 'b@example.com'), signup('3', 'gone', 'c@example.com')],
  }),
}));
vi.mock('@/hooks/use-grid-layout', () => ({
  useGridLayout: () => ({ getAllProductsUnfiltered: () => [{ id: 'on-sale', title: 'On Sale Tee' }] }),
}));
vi.mock('@/lib/demo/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: async () => ({ data: [{ id: 'on-sale', title: 'On Sale Tee' }, { id: 'archived', title: 'Old Scarf' }] }),
      }),
    }),
  },
}));

import AdminWaitlist from '../AdminWaitlist';

describe('product names on the waitlist page', () => {
  it('names hidden and archived products, and never shows a raw id', async () => {
    render(<AdminWaitlist />);
    await screen.findAllByText('Old Scarf');
    expect(screen.getAllByText('On Sale Tee').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Deleted product').length).toBeGreaterThan(0);
    expect(screen.queryByText('gone')).toBeNull();
  });
});

// On a phone the four status tabs ran past the card's edge, cutting off "Cancelled" and pushing the
// page sideways. The strip scrolls inside the card instead.
describe('the waitlist status tabs on a phone', () => {
  it('scroll inside the card', () => {
    render(<AdminWaitlist />);
    const strip = screen.getByRole('button', { name: /Cancelled/ }).parentElement!;
    expect(strip.className.split(' ')).toContain('overflow-x-auto');
  });
});
