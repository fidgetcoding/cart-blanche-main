import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const rows = vi.hoisted(() => ({
  orders: [{
    id: '1', order_number: 'R-1', customer_email: 'c@example.com', customer_name: 'Cy', items: [{ quantity: 1 }],
    subtotal: 50, total: 50, status: 'pending', tracking_number: null, shipping_address: null, notes: null,
    created_at: '2026-11-01T00:00:00.000Z',
  }],
  discount_codes: [{
    id: 'd1', code: 'TAKE10', description: null, discount_type: 'percentage', discount_value: 10, minimum_spend: 0,
    max_uses: null, times_used: 0, starts_at: null, expires_at: null, is_active: true, created_at: '2026-11-01T00:00:00.000Z',
  }],
}));

vi.mock('@/lib/demo/client', () => {
  const chain = (data: unknown) => {
    const c: Record<string, unknown> = {
      select: () => c, eq: () => c, order: () => c,
      then: (done: (value: unknown) => void) => done({ data, error: null }),
    };
    return c;
  };
  return {
    supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'm' } } } }) },
      from: (table: keyof typeof rows) => chain(rows[table] ?? []),
    },
  };
});
vi.mock('@/hooks/use-subscribers', () => ({
  useSubscribers: () => ({ subscribers: [{ id: 's1', email: 's@example.com', created_at: '2026-11-01T00:00:00.000Z' }], loading: false, deleteSubscriber: vi.fn() }),
}));

import AdminOrders from '../AdminOrders';
import AdminDiscounts from '../AdminDiscounts';
import AdminSubscribers from '../AdminSubscribers';
import { WaitlistTable } from '@/components/admin/WaitlistTable';

// On a phone these tables are wider than the screen. Their cards clipped the extra columns (total,
// status, the edit and delete buttons) out of reach; they scroll sideways inside the card instead.
const scrollsSideways = (cell: HTMLElement) =>
  expect(cell.closest('table')!.parentElement!.className).toMatch(/\boverflow-x-auto\b/);

describe('wide admin tables', () => {
  it('scroll sideways on orders', async () => {
    render(<MemoryRouter><AdminOrders /></MemoryRouter>);
    scrollsSideways(await screen.findByText(/R-1/));
  });

  it('scroll sideways on discounts', async () => {
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminDiscounts /> }])} />);
    scrollsSideways(await screen.findByText('TAKE10'));
  });

  it('scroll sideways on subscribers', () => {
    render(<MemoryRouter><AdminSubscribers /></MemoryRouter>);
    scrollsSideways(screen.getByText('s@example.com'));
  });

  it('scroll sideways on the waitlist', () => {
    const signup = { id: 'w1', product_id: 'p1', email: 'w@example.com', name: 'Wu', size_preference: 'M', colorway_preference: null, status: 'pending', created_at: '2026-11-01T00:00:00.000Z' };
    render(<WaitlistTable signups={[signup] as never} onMarkFulfilled={vi.fn()} onDelete={vi.fn()} />);
    scrollsSideways(screen.getByText('w@example.com'));
  });
});

describe('the discount code form', () => {
  it('is a dialog that Escape closes, like the backdrop and Cancel do', async () => {
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminDiscounts /> }])} />);
    fireEvent.click(await screen.findByRole('button', { name: /CREATE CODE/ }));
    expect(screen.getByRole('dialog', { name: 'New Discount Code' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
