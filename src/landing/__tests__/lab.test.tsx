import { render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { CartProvider } from '@/contexts/CartProvider';
import { SmartCartProvider } from '@/contexts/SmartCartProvider';
import { StyleKitProvider } from '@/contexts/StyleKitProvider';
import { LabVisual } from '../page/parts/lab';
import { labFrame } from '../page/lib/lab';

// jsdom does no layout: give every box the size of the story's window, so the editor (drawn 1440 wide and fitted)
// renders, and the controls a height, so the ring has something to sit on.
const restore: (() => void)[] = [];
const stub = (key: 'clientWidth' | 'clientHeight' | 'offsetHeight', value: number) => {
  const prev = Object.getOwnPropertyDescriptor(HTMLElement.prototype, key);
  Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => value });
  restore.push(() => (prev ? Object.defineProperty(HTMLElement.prototype, key, prev) : undefined));
};
const setItem = vi.spyOn(Storage.prototype, 'setItem');
beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('ResizeObserver', Observer);
  vi.stubGlobal('IntersectionObserver', Observer);
  stub('clientWidth', 1072);
  stub('clientHeight', 762);
  stub('offsetHeight', 40);
});
afterAll(() => restore.forEach(r => r()));

// The landing's own providers (Landing.tsx): the light page theme and the store's cart.
const page = (ui: ReactNode) => (
  <MemoryRouter>
    <ThemeProvider storageKey="cb-landing" defaults={{ mode: 'light', tileBgMode: 'transparent' }}>
      <CartProvider><SmartCartProvider><StyleKitProvider>{ui}</StyleKitProvider></SmartCartProvider></CartProvider>
    </ThemeProvider>
  </MemoryRouter>
);
const card = (name: string) => screen.getByText(name).closest('.liquid-glass') as HTMLElement;
const store = () => document.querySelector<HTMLElement>('[data-lab-store]');
// The SL store and the editor arrive with their own chunk.
const loaded = () => waitFor(() => expect(store()).not.toBeNull());

describe('the Template Lab chapter', () => {
  it('opens on the Templates page with YZ active and the YZ storefront live, loading nothing from Google', () => {
    render(page(<LabVisual step={0} t={0.5} />));
    expect(within(card('YZ Template')).getByText('ACTIVE')).toBeTruthy();
    expect(within(card('SL Template')).getByText('SET ACTIVE')).toBeTruthy();
    expect(document.querySelector('[data-lab] [data-live-shop]')).not.toBeNull();
    // The SL store waits until the chapter is close.
    expect(store()).toBeNull();
    expect(document.querySelector('link[data-lab-fonts]')).toBeNull();
  });

  it('moves ACTIVE to SL and shows the SL storefront', async () => {
    render(page(<LabVisual step={1} t={0.5} />));
    expect(within(card('SL Template')).getByText('ACTIVE')).toBeTruthy();
    await loaded();
    expect(store()!.className).toContain('light');
    expect(document.querySelector('link[data-lab-fonts]')!.getAttribute('href')).toContain('Instrument+Serif');
  });

  it('flips the editor’s real controls in Settings and the store follows them', async () => {
    render(page(<LabVisual step={2} t={1} />));
    await loaded();
    expect(await screen.findByText('BACK TO SMARTPORTAL')).toBeTruthy();
    expect(screen.getByRole('button', { name: /dark/i }).className).toContain('bg-primary');
    expect(labFrame(2, 1).focus).toBe('THUMBNAIL BACKGROUND');
    expect(document.querySelector<HTMLElement>('[data-lab-ring]')!.style.opacity).toBe('1');
    expect(store()!.className).toContain('cb-dark');
  });

  it('runs the AI Template Builder through the real agent, and its changes reach only the store', async () => {
    render(page(<LabVisual step={3} t={1} />));
    await loaded();
    await screen.findByText('COMING SOON');
    const chat = labFrame(3, 1).chat;
    expect(chat.map(l => l.text)).toEqual([
      'Switch to light mode with a serif heading font',
      'Switched to light mode. Display font set to Instrument Serif. Check the preview →',
      'Make everything bigger and more readable',
      'Increased all font sizes by 2px.',
    ]);
    for (const l of chat) expect(screen.getByText(l.text)).toBeTruthy();
    // The demo still locks the builder, so the chapter says so.
    expect(screen.getByText('COMING SOON')).toBeTruthy();
    expect(store()!.style.getPropertyValue('--font-display')).toBe('Instrument Serif, serif');
    expect(store()!.style.getPropertyValue('--font-size-display')).toBe('13px');
    expect(store()!.className).toContain('light');
    // The page's own fonts and the demo's saved theme are untouched.
    expect(document.documentElement.style.getPropertyValue('--font-display')).toBe('Space Grotesk, sans-serif');
    expect(setItem.mock.calls.filter(([k]) => String(k).startsWith('cb-theme'))).toEqual([]);
  });

  it('ends on the Templates page with what lands in the Lab next', async () => {
    render(page(<LabVisual step={4} t={1} />));
    await loaded();
    expect(within(card('SL Template')).getByText('ACTIVE')).toBeTruthy();
    expect(screen.getByText('Coming to the Lab')).toBeTruthy();
    for (const it of ['Editorial spreads', 'Single product stages', 'Spatial rooms', 'House grids']) {
      expect((screen.getByText(it).parentElement as HTMLElement).style.opacity).toBe('1');
    }
  });

  it('takes no focus: the whole chapter is inert', () => {
    render(page(<LabVisual step={2} t={0.5} />));
    expect(document.querySelector('[data-lab]')!.hasAttribute('inert')).toBe(true);
  });

  it('on a phone keeps the store under a short panel of the same beats', async () => {
    render(page(<LabVisual step={3} t={1} compact />));
    expect(await screen.findByText('Increased all font sizes by 2px.')).toBeTruthy();
    await loaded();
  });
});
