import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoIntro } from '../page/lib/intro';

// A page with the three stops at fixed spots, a header bar, and a window that scrolls where it's told.
const tops: Record<string, number> = { problem: 1000, system: 1600, story: 3000 };
let y = 0;
const scrollTo = vi.fn((_x: number, to: number) => { y = to; window.dispatchEvent(new Event('scroll')); });

function box(id: string, h: number) {
  const el = document.createElement(id === 'header' ? 'header' : 'div');
  if (id !== 'header') el.id = id;
  el.getBoundingClientRect = () => ({ top: (id === 'header' ? 0 : tops[id]) - (id === 'header' ? 0 : y), height: h, bottom: 0, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON() {} }) as DOMRect;
  document.body.appendChild(el);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  y = 0;
  Object.assign(tops, { problem: 1000, system: 1600, story: 3000 });
  scrollTo.mockClear();
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 20000 });
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  box('header', 82); box('problem', 600); box('system', 700); box('story', 1);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  document.head.querySelectorAll('link').forEach(l => l.remove());
});

describe('the self-scrolling intro', () => {
  it('lands exactly on SmartShop even when the page reflows on the way (a late web font)', async () => {
    renderHook(() => useAutoIntro(true));
    await vi.advanceTimersByTimeAsync(2500); // mid first glide
    tops.story += 55;                        // the font swaps in: everything below grows
    await vi.advanceTimersByTimeAsync(15000);
    expect(y).toBe(3055);
  });

  it('waits for the stylesheets to arrive before it starts gliding', async () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    document.head.appendChild(link); // never loaded: jsdom leaves link.sheet null
    renderHook(() => useAutoIntro(true));
    await vi.advanceTimersByTimeAsync(1800);
    expect(scrollTo).not.toHaveBeenCalled();
    link.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(600);
    expect(scrollTo).toHaveBeenCalled();
  });

  it('starts anyway if a stylesheet never arrives', async () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    renderHook(() => useAutoIntro(true));
    await vi.advanceTimersByTimeAsync(4500);
    expect(scrollTo).toHaveBeenCalled();
  });

  it('glides straight on to SmartShop when the page opens without the problem and the system', async () => {
    document.getElementById('problem')!.remove();
    document.getElementById('system')!.remove();
    renderHook(() => useAutoIntro(true));
    await vi.advanceTimersByTimeAsync(15000);
    expect(y).toBe(3000);
  });

  it('stops for good on the first wheel', async () => {
    renderHook(() => useAutoIntro(true));
    await vi.advanceTimersByTimeAsync(2500);
    window.dispatchEvent(new Event('wheel'));
    const at = y, calls = scrollTo.mock.calls.length;
    await vi.advanceTimersByTimeAsync(15000);
    expect(scrollTo.mock.calls.length).toBe(calls);
    expect(y).toBe(at);
  });
});
