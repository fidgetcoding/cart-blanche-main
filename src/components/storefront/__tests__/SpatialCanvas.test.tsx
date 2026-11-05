import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
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

import { SpatialCanvas } from '../SpatialCanvas';

async function renderCanvas() {
  const utils = render(
    <MemoryRouter>
      <ThemeProvider>
        <CartProvider>
          <SmartCartProvider>
            <StyleKitProvider>
              <SpatialCanvas />
            </StyleKitProvider>
          </SmartCartProvider>
        </CartProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: 'OUTERWEAR' });
  const root = utils.container.querySelector<HTMLElement>('[tabindex="0"]')!;
  return { ...utils, root };
}

const focusedTile = () =>
  document.querySelector('[data-canvas-area] [style*="z-index: 10"] img')?.getAttribute('alt');

describe('SpatialCanvas', () => {
  it("leaves keys typed into the cart's fields to those fields", async () => {
    const { root } = await renderCanvas();
    // Arrow keys give a tile keyboard focus; Enter would open it.
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    fireEvent.click(document.querySelector('button:has(svg.lucide-shopping-bag)')!);
    const chat = await screen.findByPlaceholderText(/Ask about products/);
    const arrow = fireEvent.keyDown(chat, { key: 'ArrowLeft' });
    fireEvent.keyDown(chat, { key: 'Enter' });
    await new Promise(resolve => setTimeout(resolve, 450));
    expect(arrow).toBe(true);
    expect(document.querySelector('[data-image-zone]')).toBeNull();
  });

  it('moves the keyboard focus one tile per key press, and not again while the key is held', async () => {
    const { root } = await renderCanvas();
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    const first = focusedTile();
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    const second = focusedTile();
    for (let i = 0; i < 3; i++) fireEvent.keyDown(root, { key: 'ArrowRight', repeat: true });
    expect(second).not.toBe(first);
    expect(focusedTile()).toBe(second);
  });

  it('keeps the page arrows in the margin on a phone, clear of the first and last columns', async () => {
    await renderCanvas();
    for (const name of ['Previous page', 'Next page']) {
      const zone = screen.getByRole('button', { name });
      expect(zone.className).toMatch(/(^| )w-5( |$)/);
      expect(zone.className).toContain('md:w-24');
    }
  });
});
