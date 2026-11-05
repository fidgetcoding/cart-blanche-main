import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from '@/contexts/CartProvider';
import { SmartCartProvider } from '@/contexts/SmartCartProvider';
import { StyleKitProvider } from '@/contexts/StyleKitProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';

vi.mock('@/integrations/supabase/client', () => ({ supabase: null, isBackendConfigured: false }));
for (const observer of ['IntersectionObserver', 'ResizeObserver']) {
  vi.stubGlobal(observer, class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
}

import { MaisonCanvas } from '../MaisonCanvas';

const original = window.innerWidth;

async function renderAt(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  render(
    <MemoryRouter>
      <ThemeProvider>
        <CartProvider>
          <SmartCartProvider>
            <StyleKitProvider>
              <MaisonCanvas />
            </StyleKitProvider>
          </SmartCartProvider>
        </CartProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: 'OUTERWEAR' });
}

const productGrid = () => document.querySelector<HTMLElement>('.grid.w-full')!;

describe('MaisonCanvas header and grid', () => {
  afterEach(() => Object.defineProperty(window, 'innerWidth', { configurable: true, value: original }));

  it('lets the categories scroll on their own row on a phone, so the page stays put', async () => {
    await renderAt(390);
    const nav = screen.getByRole('button', { name: 'OUTERWEAR' }).closest('nav')!;
    expect(nav.className).toContain('overflow-x-auto');
    expect(nav.className).toContain('w-full');
    expect(nav.closest('header')!.className).toContain('flex-wrap');
  });

  it('shows two products across on a phone, with no view toggle', async () => {
    await renderAt(390);
    expect(productGrid().style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    expect(screen.queryByRole('button', { name: 'View by 3' })).toBeNull();
  });

  it('stacks the product photo above its details on a phone', async () => {
    await renderAt(390);
    fireEvent.click(screen.getAllByText('Stealth Trench')[0]);
    const close = (await screen.findAllByRole('button')).find(button => button.className.includes('top-5 right-5'))!;
    expect(close.parentElement!.className).toContain('flex-col');
    expect(close.parentElement!.className).toContain('md:flex-row');
  });

  it('keeps the wider view on a laptop', async () => {
    await renderAt(1440);
    expect(productGrid().style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    expect(screen.getByRole('button', { name: 'View by 3' })).toBeTruthy();
  });
});
