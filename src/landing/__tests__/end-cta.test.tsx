import { act, render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { EndCta, StoreBar } from '../page/parts/chrome';
import { useAtEnd } from '../page/lib/end';

beforeAll(() => {
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
});

const wait = (ms: number) => act(() => new Promise<void>(r => setTimeout(r, ms)));

function Close({ on }: { on: boolean }) {
  const [away, setAway] = useState(false);
  return <><StoreBar active="all" onPick={() => {}} away={away} /><EndCta on={on} onAway={setAway} /></>;
}
const bar = () => document.querySelector<HTMLAnchorElement>('header a.signup-cta')!;
const twin = () => document.querySelector<HTMLAnchorElement>('[data-end-cta]')!;
const veil = () => document.querySelector<HTMLElement>('[data-end-veil]')!;

describe('the close', () => {
  it('lifts Enter the demo out of the bar into the middle of a faded page, and sends it home again', async () => {
    const { rerender } = render(<Close on={false} />);
    expect(twin().style.visibility).toBe('hidden');
    expect(twin().getAttribute('aria-hidden')).toBe('true');
    expect(twin().tabIndex).toBe(-1);
    expect(veil().style.opacity).toBe('0');
    expect(bar().style.opacity).toBe('');

    rerender(<Close on />);
    await wait(50);
    expect(twin().style.visibility).toBe('visible');
    expect(twin().getAttribute('aria-hidden')).toBeNull();
    expect(twin().getAttribute('href')).toBe('/demo');
    expect(twin().classList.contains('signup-cta')).toBe(true);
    expect(veil().style.opacity).toBe('0.86');
    expect(bar().style.opacity).toBe('0');
    expect(bar().tabIndex).toBe(-1);

    rerender(<Close on={false} />);
    await wait(700);
    expect(veil().style.opacity).toBe('0');
    expect(twin().style.visibility).toBe('hidden');
    expect(bar().style.opacity).toBe('');
  });
});

function End() {
  return <p data-end={String(useAtEnd(true))} />;
}
const setScroll = async (y: number) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
  window.dispatchEvent(new Event('scroll'));
  await wait(40);
};

describe('reaching the end', () => {
  it('turns on at the bottom of the page and off only after scrolling back up past the slack', async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 5000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    render(<End />);
    const end = () => document.querySelector('[data-end]')!.getAttribute('data-end');
    await setScroll(3000);
    expect(end()).toBe('false');
    await setScroll(4100);
    expect(end()).toBe('true');
    await setScroll(4040);
    expect(end()).toBe('true');
    await setScroll(3950);
    expect(end()).toBe('false');
  });

  it('never counts a short page that has not been scrolled', async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 0 });
    render(<End />);
    await setScroll(0);
    expect(document.querySelector('[data-end]')!.getAttribute('data-end')).toBe('false');
  });
});
