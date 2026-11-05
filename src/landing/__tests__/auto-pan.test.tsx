import { act, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from '@/contexts/CartProvider';
import { LiveShop } from '../page/parts/live';
import { PAGE1 } from '../page/lib/core';

// The hero's store: ten across, two rows, wider than its view, so it has room to pan.
const restore: (() => void)[] = [];
const matchMedia = window.matchMedia;
let reduce = false;

beforeAll(() => {
  class RO { observe() {} unobserve() {} disconnect() {} }
  // In view at once.
  class IO { constructor(private cb: IntersectionObserverCallback) {} observe(el: Element) { this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver); } unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('ResizeObserver', RO);
  vi.stubGlobal('IntersectionObserver', IO);
  for (const [key, value] of [['clientWidth', 1440], ['clientHeight', 818]] as const) {
    const prev = Object.getOwnPropertyDescriptor(HTMLElement.prototype, key);
    Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => value });
    restore.push(() => (prev ? Object.defineProperty(HTMLElement.prototype, key, prev) : delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key]));
  }
  window.matchMedia = ((q: string) => ({ ...matchMedia(q), matches: reduce && q.includes('prefers-reduced-motion: reduce') })) as typeof window.matchMedia;
});
afterAll(() => { restore.forEach(r => r()); window.matchMedia = matchMedia; });
beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] }); });
afterEach(() => { vi.useRealTimers(); reduce = false; });

function hero() {
  const utils = render(
    <CartProvider>
      <LiveShop products={PAGE1} cols={10} scene={{ cam: { x: 0, y: 0, w: 1943, h: 586 }, max: 0.7 }} homeMax={0.6} inset={{ top: 268, bottom: 92, pad: 40 }} pan />
    </CartProvider>,
  );
  const root = utils.container.querySelector<HTMLElement>('[data-live-shop]')!;
  const offset = () => {
    const m = root.querySelector<HTMLElement>('[data-canvas]')!.parentElement!.style.transform.match(/translate3d\((-?[\d.]+)px/);
    return m ? Number(m[1]) : 0;
  };
  return { root, offset };
}
const wait = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

describe('the live store’s idle drift', () => {
  it('pans on its own from the moment it loads, without re-rendering React', async () => {
    const { offset } = hero();
    await wait(1500);
    const a = offset();
    expect(a).toBeLessThan(-1);
    await wait(1500);
    expect(offset()).toBeLessThan(a);
  });

  it('ping-pongs between the canvas edges, eased, and never past them', async () => {
    const { offset } = hero();
    const seen: number[] = [];
    for (let i = 0; i < 60; i++) { await wait(500); seen.push(offset()); }
    const lo = Math.min(...seen), hi = Math.max(...seen);
    // The canvas is 0.7 × 2254 = 1578px in a 1360px view: it can slide 218px.
    expect(lo).toBeGreaterThanOrEqual(-218.5);
    expect(hi).toBeLessThanOrEqual(0.5);
    expect(lo).toBeLessThan(-210);
    // It turned around: it came back toward 0 after reaching the far edge.
    expect(seen[seen.length - 1]).toBeGreaterThan(lo + 20);
  });

  it('holds still while the visitor is at the canvas, and drifts again about 3s after', async () => {
    const { root, offset } = hero();
    await wait(1500);
    fireEvent.pointerMove(root);
    const a = offset();
    await wait(2500);
    expect(offset()).toBe(a);
    await wait(1500);
    expect(offset()).not.toBe(a);
  });

  it('never fights a drag: still while the visitor holds the canvas', async () => {
    const { root, offset } = hero();
    await wait(1500);
    fireEvent.pointerDown(root, { pointerId: 1, clientX: 700, clientY: 400, button: 0, pointerType: 'mouse' });
    const a = offset();
    await wait(5000);
    expect(offset()).toBe(a);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 700, clientY: 400 });
  });

  it('doesn’t wobble when the canvas has next to no room to pan (it fits its view)', async () => {
    const { container } = render(
      <CartProvider>
        <LiveShop products={PAGE1} cols={10} scene={{ cam: 'all', max: 0.7 }} homeMax={0.6} inset={{ top: 268, bottom: 201.6, pad: 40 }} pan />
      </CartProvider>,
    );
    const wrap = container.querySelector<HTMLElement>('[data-canvas]')!.parentElement!;
    for (let i = 0; i < 10; i++) { await wait(500); expect(wrap.style.transform).toBe(''); }
  });

  it('stays put under reduced motion', async () => {
    reduce = true;
    const { offset } = hero();
    await wait(5000);
    expect(offset()).toBe(0);
  });
});
