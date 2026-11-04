import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
vi.mock('@/lib/demo/client', () => ({
  DEMO_CHAT_MESSAGE: 'Demo reply', isDemoSession: () => true,
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'merchant' } } }), getSession: async () => ({ data: { session: { user: { id: 'merchant' } } } }) },
    from: () => {
      const chain = { select: () => chain, eq: () => chain, order: async () => ({ data: [] }),
        insert: () => chain, single: async () => ({ data: null, error: { message: 'offline' } }) };
      return chain;
    },
  },
}));
import { SmartChatPanel } from '../SmartChatPanel';

it('reports conversation creation failures and allows another message', async () => {
  render(<MemoryRouter><SmartChatPanel /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Sales Report' }));
  expect(await screen.findByText(/Failed to create conversation/)).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Ask your AI store manager...')).toBeEnabled();
});
