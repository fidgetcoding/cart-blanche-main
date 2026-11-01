import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast }));
const update = vi.hoisted(() => vi.fn());
vi.mock('@/lib/demo/client', () => {
  const chain = { select: () => chain, eq: () => chain, single: async () => ({ data: { store_name: 'S', email: 'a@example.com' } }), update };
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

  it('saves a blank slug as null, so several stores can leave it blank', async () => {
    update.mockReturnValue({ eq: async () => ({ error: null }) });
    await open();
    fireEvent.click(screen.getByRole('button', { name: /SAVE/ }));
    await screen.findByText('Settings saved!');
    expect(update.mock.calls[0][0].store_slug).toBeNull();
  });

  it('says when a slug is taken', async () => {
    update.mockReturnValue({ eq: async () => ({ error: { code: '23505' } }) });
    await open();
    fireEvent.click(screen.getByRole('button', { name: /SAVE/ }));
    await screen.findByText('Error: that store slug is taken');
  });

  it('renders valid HTML', async () => {
    const consoleError = await open();
    const nesting = consoleError.mock.calls.filter(call => String(call[0]).includes('validateDOMNesting'));
    expect(nesting).toEqual([]);
  });
});
