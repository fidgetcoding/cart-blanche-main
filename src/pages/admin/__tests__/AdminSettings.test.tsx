import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast }));
vi.mock('@/lib/demo/client', () => {
  const chain = { select: () => chain, eq: () => chain, single: async () => ({ data: { store_name: 'S', email: 'a@example.com' } }) };
  return { supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'm' } } } }) }, from: () => chain } };
});

import AdminSettings from '../AdminSettings';

describe('AdminSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  async function open() {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const router = createMemoryRouter([{ path: '/', element: <AdminSettings /> }]);
    render(<RouterProvider router={router} />);
    await screen.findByText('STORE INFO');
    return consoleError;
  }

  it('says Stripe is not wired up instead of doing nothing', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'CONNECT STRIPE' }));
    expect(toast).toHaveBeenCalledWith("Stripe Connect isn't wired up yet.");
  });

  it('renders valid HTML', async () => {
    const consoleError = await open();
    const nesting = consoleError.mock.calls.filter(call => String(call[0]).includes('validateDOMNesting'));
    expect(nesting).toEqual([]);
  });
});
