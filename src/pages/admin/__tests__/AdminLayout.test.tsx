import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/demo/client', () => ({
  realAuth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
}));
vi.mock('@/components/admin/SmartChatPanel', () => ({
  SmartChatPanel: () => <div>chat panel</div>,
}));

import AdminLayout from '../AdminLayout';

function renderAt(width: number, path = '/admin') {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<div>page content</div>} />
          <Route path="settings" element={<div>settings content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const isShown = (element: HTMLElement) => !element.closest('.hidden');

describe('AdminLayout on a phone', () => {
  const desktopWidth = window.innerWidth;
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => Object.defineProperty(window, 'innerWidth', { configurable: true, value: desktopWidth }));

  it('shows the page and navigation, with the chat tucked away', async () => {
    renderAt(390);
    const page = await screen.findByText('page content');
    expect(isShown(page)).toBe(true);
    expect(isShown(screen.getByText('chat panel'))).toBe(false);
    expect(screen.getByTitle('Inventory')).toBeTruthy();
  });

  it('opens the chat over the page and closes it again', async () => {
    renderAt(390);
    const page = await screen.findByText('page content');
    fireEvent.click(screen.getByTitle('Open AI store manager'));
    expect(isShown(screen.getByText('chat panel'))).toBe(true);
    expect(isShown(page)).toBe(false);
    fireEvent.click(screen.getByTitle('Close AI store manager'));
    expect(isShown(page)).toBe(true);
  });

  // Side by side, a tablet left the page under 400px: the nav clipped Settings off and the pages crushed.
  it('opens the chat over the page on a tablet too', async () => {
    renderAt(768);
    const page = await screen.findByText('page content');
    expect(isShown(page)).toBe(true);
    expect(isShown(screen.getByText('chat panel'))).toBe(false);
    fireEvent.click(screen.getByTitle('Open AI store manager'));
    expect(isShown(screen.getByText('chat panel'))).toBe(true);
    expect(isShown(page)).toBe(false);
  });

  it('scrolls the sideways nav to the current page', async () => {
    const scrolled: Element[] = [];
    const scrollIntoView = vi.fn(function (this: Element) { scrolled.push(this); });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    renderAt(390, '/admin/settings');
    await screen.findByText('settings content');
    expect(scrolled).toContain(screen.getByTitle('Settings'));
    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('keeps both side by side on a laptop', async () => {
    renderAt(1440);
    const page = await screen.findByText('page content');
    expect(isShown(page)).toBe(true);
    expect(isShown(screen.getByText('chat panel'))).toBe(true);
    expect(screen.queryByTitle('Open AI store manager')).toBeNull();
  });
});
