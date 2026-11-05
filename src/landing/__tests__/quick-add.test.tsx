import { fireEvent, render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CartProvider } from '@/contexts/CartProvider';
import { LiveShop } from '../page/parts/live';
import { PAGE1 } from '../page/lib/core';

// Nate: no quick actions on the landing's canvas (no Quick Add bag, no Style Kit). Hover still glows, so the pieces
// still read as tiles, and a click still opens the product. The store keeps both (ProductTile.test.tsx).
const restore: (() => void)[] = [];
beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('ResizeObserver', Observer);
  vi.stubGlobal('IntersectionObserver', Observer);
  for (const [key, value] of [['clientWidth', 1070], ['clientHeight', 760]] as const) {
    const prev = Object.getOwnPropertyDescriptor(HTMLElement.prototype, key);
    Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => value });
    restore.push(() => (prev ? Object.defineProperty(HTMLElement.prototype, key, prev) : delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key]));
  }
  localStorage.clear();
});
afterAll(() => restore.forEach(r => r()));

const cartItems = () => {
  const raw = localStorage.getItem('cart-blanche-cart');
  const saved = raw ? JSON.parse(raw) : [];
  return Array.isArray(saved) ? saved : saved.items ?? [];
};

describe('the landing’s live store tiles', () => {
  it('offer no quick actions: hovered tiles glow, clicks open the product, and the cart stays empty', () => {
    const { container } = render(<CartProvider><LiveShop products={PAGE1} scene={{ cam: 'all' }} /></CartProvider>);
    const tiles = [...container.querySelectorAll<HTMLElement>('[data-canvas] > div')];
    expect(tiles.length).toBe(PAGE1.length);
    for (const tile of tiles.slice(0, 5)) {
      fireEvent.mouseEnter(tile);
      expect(tile.querySelector('.rounded-lg')!.getAttribute('style')).toMatch(/box-shadow/);
      expect(tile.querySelector('button[title="Quick Add"]')).toBeNull();
      expect(tile.querySelector('button[title="Style Kit"]')).toBeNull();
      fireEvent.click(tile);
      fireEvent.mouseLeave(tile);
    }
    expect(container.querySelector('button[title="Quick Add"], button[title="Style Kit"]')).toBeNull();
    expect(cartItems()).toHaveLength(0);
    // The click opened the product.
    expect(container.querySelector('[data-detail] h2')).not.toBeNull();
  });
});
