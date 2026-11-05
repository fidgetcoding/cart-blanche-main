import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const conversation = vi.hoisted(() => ({
  id: 'c1', title: 'Earlier chat', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z',
}));

vi.mock('@/lib/demo/client', () => {
  const user = { id: 'merchant' };
  const query = (data: unknown) => {
    const chain: Record<string, unknown> = {
      select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
      insert: () => chain, delete: () => chain, update: () => chain,
      single: async () => ({ data: { ...conversation, id: 'c2', title: 'New chat' }, error: null }),
      then: (done: (value: unknown) => void) => done({ data, error: null }),
    };
    return chain;
  };
  return {
    DEMO_CHAT_MESSAGE: 'Demo reply',
    isDemoSession: () => true,
    supabase: {
      auth: {
        getUser: async () => ({ data: { user } }),
        getSession: async () => ({ data: { session: { user } } }),
      },
      from: (table: string) => query(table === 'conversations' ? [conversation] : []),
    },
  };
});

import { SmartChatPanel } from '../SmartChatPanel';

const renderAt = (path: string, overlay = false) =>
  render(<MemoryRouter initialEntries={[path]}><SmartChatPanel overlay={overlay} /></MemoryRouter>);

describe('the AI store manager prompts', () => {
  it.each([
    ['/admin/waitlist', 'Top Waitlists'],
    ['/admin/subscribers', 'Newsletter'],
    ['/admin/size-charts', 'Chart Review'],
    ['/admin/inventory/', 'Low Stock'],
    ['/admin/lab/sl', 'Browse Templates'],
  ])('suit %s', (path, label) => {
    renderAt(path);
    expect(screen.getByRole('button', { name: label })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sales Report' })).toBeNull();
  });
});

describe('the chat history', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists past chats as valid HTML, each with its own delete button', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAt('/admin');
    fireEvent.click(screen.getByTitle('Chat History'));
    const row = await screen.findByRole('button', { name: 'Earlier chat' });
    expect(within(row).queryByRole('button')).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete chat: Earlier chat' })).toBeTruthy();
    const nesting = consoleError.mock.calls.filter(call => String(call[0]).includes('validateDOMNesting'));
    expect(nesting).toEqual([]);
  });
});

describe('the message box', () => {
  it('shrinks back to one line once a message is sent', async () => {
    renderAt('/admin');
    const box = screen.getByPlaceholderText('Ask your AI store manager...') as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: 'one\ntwo\nthree' } });
    box.style.height = '76px';
    await act(async () => { fireEvent.keyDown(box, { key: 'Enter' }); });
    await screen.findByText('Demo reply');
    expect(box.value).toBe('');
    expect(box.style.height).toBe('auto');
  });
});

describe('resizing the panel', () => {
  const width = () => parseFloat((screen.getByRole('separator', { name: 'Resize chat' }).parentElement as HTMLElement).style.width);

  const desktopWidth = window.innerWidth;
  afterEach(() => Object.defineProperty(window, 'innerWidth', { configurable: true, value: desktopWidth }));

  it('follows a pointer drag, mouse or touch, within its limits', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    renderAt('/admin');
    const handle = screen.getByRole('separator', { name: 'Resize chat' });
    expect(width()).toBe(380);
    fireEvent.pointerDown(handle, { clientX: 380, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(handle, { clientX: 480, pointerId: 1, pointerType: 'touch' });
    expect(width()).toBe(480);
    fireEvent.pointerMove(handle, { clientX: 2000, pointerId: 1, pointerType: 'touch' });
    expect(width()).toBe(600);
    fireEvent.pointerUp(handle, { clientX: 2000, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(handle, { clientX: 300, pointerId: 1, pointerType: 'touch' });
    expect(width()).toBe(600);
  });

  // At 1024px a 600px chat left the page 424px, and the nav clipped Settings off the end.
  it('always leaves the page 560px', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    renderAt('/admin');
    const handle = screen.getByRole('separator', { name: 'Resize chat' });
    fireEvent.pointerDown(handle, { clientX: 380, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 2000, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 2000, pointerId: 1 });
    expect(width()).toBe(1024 - 560);
    expect(handle.parentElement!.style.maxWidth).toBe('calc(100vw - 560px)');
  });

  it('has no handle when it opens over the page', () => {
    renderAt('/admin', true);
    expect(screen.queryByRole('separator', { name: 'Resize chat' })).toBeNull();
  });
});

describe('sending with Enter', () => {
  // Enter also confirms a word in a Japanese or Chinese input method; that mustn't send the message.
  it('waits while an input method is composing', async () => {
    renderAt('/admin');
    const box = screen.getByPlaceholderText('Ask your AI store manager...') as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: 'にほん' } });
    await act(async () => { fireEvent.keyDown(box, { key: 'Enter', isComposing: true }); });
    expect(box.value).toBe('にほん');
    expect(screen.queryByText('Demo reply')).toBeNull();
    await act(async () => { fireEvent.keyDown(box, { key: 'Enter' }); });
    expect(box.value).toBe('');
    expect(await screen.findByText('Demo reply')).toBeTruthy();
  });
});
