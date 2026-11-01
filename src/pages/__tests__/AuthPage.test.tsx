import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithOtp = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp,
      getSession: async () => ({ data: { session: null } }),
    },
  },
}));

import AuthPage from '../AuthPage';

async function requestLink() {
  render(<MemoryRouter><AuthPage /></MemoryRouter>);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /sign-in link/i }));
}

describe('AuthPage', () => {
  beforeEach(() => signInWithOtp.mockReset());

  it('never creates an account from the sign-in form', async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    await requestLink();
    await screen.findByText(/a sign-in link is on its way/i);
    expect(signInWithOtp.mock.calls[0][0].options.shouldCreateUser).toBe(false);
  });

  it.each(['otp_disabled', 'signup_disabled'])('gives unknown emails the same answer on %s', async (code) => {
    signInWithOtp.mockResolvedValue({ error: { code, message: 'Signups not allowed' } });
    await requestLink();
    await screen.findByText(/a sign-in link is on its way/i);
    expect(screen.queryByText(/not allowed/i)).toBeNull();
  });

  it('shows other errors', async () => {
    signInWithOtp.mockResolvedValue({ error: { code: 'over_email_send_rate_limit', message: 'Too many emails' } });
    await requestLink();
    await waitFor(() => expect(screen.getByText('Too many emails')).toBeInTheDocument());
  });
});
