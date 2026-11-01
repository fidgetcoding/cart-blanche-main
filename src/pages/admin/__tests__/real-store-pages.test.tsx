import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const isDemoMode = vi.hoisted(() => vi.fn());
const orders = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock('@/lib/demo/client', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: async () => ({ data: orders.rows }),
  };
  return {
    isDemoMode,
    supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'm' } } } }) }, from: () => chain },
  };
});

// The dashboard's charts need this, and jsdom doesn't have it.
vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

import AdminDashboard from '../AdminDashboard';
import { ordersCsv } from '@/lib/orders-csv';
import AdminOrders from '../AdminOrders';

describe('pages for a real merchant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orders.rows = [];
  });

  it('shows no made-up orders when a store has none', async () => {
    render(<MemoryRouter><AdminOrders /></MemoryRouter>);
    await screen.findByText(/No orders yet/);
    expect(screen.queryByText(/CB-1\d+/)).toBeNull();
  });

  it('downloads the orders on the page as a CSV', async () => {
    orders.rows = [{
      id: '1', order_number: 'R-1', customer_email: 'c@example.com', customer_name: 'Cy', items: [{ quantity: 2 }],
      subtotal: 50, total: 50, status: 'pending', tracking_number: null, shipping_address: null, notes: null,
      created_at: '2026-11-01T00:00:00.000Z',
    }];
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:x');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<MemoryRouter><AdminOrders /></MemoryRouter>);
    await screen.findByText(/R-1/);
    fireEvent.click(screen.getByRole('button', { name: /Export/ }));
    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL.mock.calls[0][0].type).toContain('text/csv');
    click.mockRestore();
    expect(ordersCsv(orders.rows as never)).toBe(
      'order,date,customer,email,items,total,status,tracking\nR-1,2026-11-01T00:00:00.000Z,Cy,c@example.com,2,50.00,pending,',
    );
  });

  it('labels the dashboard figures as samples', async () => {
    isDemoMode.mockResolvedValue(false);
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    await screen.findByText(/Sample numbers/);
  });

  it('writes changes as money or counts, with the sign in front', async () => {
    isDemoMode.mockResolvedValue(true);
    const { container } = render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    await screen.findByText('Dashboard');
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\$-/);
    const ordersCard = screen.getByText('ORDERS').closest('div')!.parentElement!;
    expect(ordersCard.textContent).not.toContain('$');
  });

  it('leaves the label to the demo header in demo mode', async () => {
    isDemoMode.mockResolvedValue(true);
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    await screen.findByText('Dashboard');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText(/Sample numbers/)).toBeNull();
  });
});
