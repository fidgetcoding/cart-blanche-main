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

function renderAt(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<div>page content</div>} />
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

  it('keeps both side by side on a laptop', async () => {
    renderAt(1440);
    const page = await screen.findByText('page content');
    expect(isShown(page)).toBe(true);
    expect(isShown(screen.getByText('chat panel'))).toBe(true);
    expect(screen.queryByTitle('Open AI store manager')).toBeNull();
  });
});
