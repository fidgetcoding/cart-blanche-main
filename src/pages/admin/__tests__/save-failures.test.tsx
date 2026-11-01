import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
const insert = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast }));
vi.mock('@/lib/demo/client', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: async () => ({ data: [], error: null }),
    insert,
    upsert,
  };
  return {
    supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'm' } } } }) }, from: () => chain },
  };
});

import { upsertSizeChart } from '@/lib/size-charts';
import AdminDiscounts from '../AdminDiscounts';

async function createCode(code: string) {
  render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminDiscounts /> }])} />);
  fireEvent.click(await screen.findByRole('button', { name: /CREATE CODE/ }));
  fireEvent.change(await screen.findByPlaceholderText(/summer20/i), { target: { value: code } });
  fireEvent.change(screen.getByPlaceholderText('e.g. 20'), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'CREATE' }));
}

describe('when a save fails', () => {
  beforeEach(() => vi.clearAllMocks());

  it('says a discount code already exists and keeps the form open', async () => {
    insert.mockResolvedValue({ error: { code: '23505' } });
    await createCode('SAME');
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You already have a code called SAME.'));
    expect(await screen.findByPlaceholderText(/summer20/i)).toBeTruthy();
  });

  it('closes the form when a discount code saves', async () => {
    insert.mockResolvedValue({ error: null });
    await createCode('NEW');
    await waitFor(() => expect(screen.queryByPlaceholderText(/summer20/i)).toBeNull());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('lets the size chart page report a failed save', async () => {
    upsert.mockResolvedValue({ error: { message: 'nope' } });
    const chart = { category: 'shirt', name: 'Tops', unit: 'in', headers: [], rows: [] };
    await expect(upsertSizeChart(chart as never, 'm')).rejects.toThrow('nope');
  });
});
