import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ isBackendConfigured: true }));
vi.mock('@/hooks/use-grid-layout', () => ({
  useGridLayout: () => ({
    getOrderedProducts: () => [{ id: 'real-1', title: 'Real Tee', price: 40, category: 'essentials', description: 'd', variants: [] }],
  }),
}));

import { SmartCartProvider, useSmartCart } from '../SmartCartContext';

const fetchMock = vi.fn();

function Probe() {
  const { sendMessage, storeProducts } = useSmartCart();
  return (
    <button onClick={() => sendMessage('hi', [])}>{storeProducts.map(p => p.title).join()}</button>
  );
}

describe('SmartCartProvider', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'ok' })));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('gives the stylist the products this store sells', async () => {
    render(<SmartCartProvider><Probe /></SmartCartProvider>);
    const button = screen.getByRole('button', { name: 'Real Tee' });
    await act(async () => button.click());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const { catalog } = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(catalog.map((p: { id: string }) => p.id)).toEqual(['real-1']);
  });
});
