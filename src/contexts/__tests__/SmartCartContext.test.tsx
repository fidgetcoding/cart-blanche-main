import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ isBackendConfigured: true }));
vi.mock('@/hooks/use-grid-layout', () => ({
  useGridLayout: () => ({
    getOrderedProducts: () => [{ id: 'real-1', title: 'Real Tee', price: 40, category: 'essentials', description: 'd', variants: [] }],
  }),
}));

import { useSmartCart } from '../SmartCartContext';
import { SmartCartProvider } from '../SmartCartProvider';

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


it('aborts and discards a response when chat is cleared', async () => {
  let finish!: (response: Response) => void;
  const request = new Promise<Response>(resolve => { finish = resolve; });
  const fetchPending = vi.fn().mockReturnValue(request);
  vi.stubGlobal('fetch', fetchPending);
  const { result } = renderHook(() => useSmartCart(), { wrapper: SmartCartProvider });
  let pending!: Promise<void>;
  act(() => { pending = result.current.sendMessage('hello', []); });
  const signal = fetchPending.mock.calls[0][1].signal as AbortSignal;
  act(() => result.current.clearChat());
  expect(signal.aborted).toBe(true);
  await act(async () => {
    finish(new Response(JSON.stringify({ message: 'old answer' })));
    await pending;
  });
  expect(result.current.messages).toEqual([]);
  expect(result.current.isLoading).toBe(false);
  expect(result.current.hasUnread).toBe(false);
  vi.unstubAllGlobals();
});

it('keeps newer requests busy and ignores older out-of-order responses', async () => {
  const responses: ((response: Response) => void)[] = [];
  const pendingFetch = vi.fn().mockImplementation(() => new Promise<Response>(resolve => responses.push(resolve)));
  vi.stubGlobal('fetch', pendingFetch);
  const { result, unmount } = renderHook(() => useSmartCart(), { wrapper: SmartCartProvider });
  let first!: Promise<void>;
  let second!: Promise<void>;
  act(() => {
    first = result.current.sendMessage('first', []);
    second = result.current.sendMessage('second', []);
  });
  expect(JSON.parse(pendingFetch.mock.calls[1][1].body).messages.map((m: { content: string }) => m.content)).toEqual(['first', 'second']);
  await act(async () => { responses[0](new Response(JSON.stringify({ message: 'stale' }))); await first; });
  expect(result.current.isLoading).toBe(true);
  expect(result.current.messages.map(m => m.content)).toEqual(['first', 'second']);
  await act(async () => { responses[1](new Response(JSON.stringify({ message: 'latest' }))); await second; });
  expect(result.current.isLoading).toBe(false);
  expect(result.current.messages.map(m => m.content)).toEqual(['first', 'second', 'latest']);
  act(() => { void result.current.sendMessage('third', []); });
  unmount();
  expect(pendingFetch.mock.calls[2][1].signal.aborted).toBe(true);
  vi.unstubAllGlobals();
});
