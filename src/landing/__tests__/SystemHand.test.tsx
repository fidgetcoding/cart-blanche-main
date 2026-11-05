import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { SystemHand } from '../page/parts/hand';

// The real Dashboard is heavy and loads on its own chunk; the hand only needs a page to show.
vi.mock('../page/lib/portal-pages', async importOriginal => {
  const real = await importOriginal<typeof import('../page/lib/portal-pages')>();
  return { ...real, portalPageImports: { ...real.portalPageImports, dashboard: () => Promise.resolve({ default: () => <div>Dashboard page</div> }) } };
});

const realMatchMedia = window.matchMedia;

beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.stubGlobal('ResizeObserver', Observer);
});

afterEach(() => {
  window.matchMedia = realMatchMedia;
});

/** Makes `prefers-reduced-motion: reduce` match, as a visitor with reduced motion set would see. */
function reduceMotion() {
  window.matchMedia = ((query: string) => ({ ...realMatchMedia(query), matches: query.includes('prefers-reduced-motion') })) as typeof window.matchMedia;
}

function renderHand(narrow: boolean) {
  const router = createMemoryRouter([{
    path: '*',
    element: (
      <ThemeProvider storageKey="cb-landing-test" defaults={{ mode: 'light', tileBgMode: 'transparent' }}>
        <SystemHand narrow={narrow} />
      </ThemeProvider>
    ),
  }]);
  return render(<RouterProvider router={router} />);
}

const motion = () => document.querySelectorAll('.cbh-move, .cbh-lift');

describe('SystemHand', () => {
  it.each([false, true])('shows the three names and their three previews (narrow: %s)', narrow => {
    renderHand(narrow);
    for (const name of ['SmartShop', 'SmartCart', 'SmartPortal']) expect(screen.getByText(name)).toBeInTheDocument();
    const previews = [...document.querySelectorAll<HTMLElement>('[data-preview]')];
    expect(previews.map(p => p.dataset.preview).sort()).toEqual(['SmartCart', 'SmartPortal', 'SmartShop']);
    // Each preview is the real piece: the store's tiles, the SmartCart drawer, the portal shell.
    const byName = Object.fromEntries(previews.map(p => [p.dataset.preview, p]));
    expect(byName.SmartShop.querySelectorAll('img').length).toBeGreaterThan(0);
    expect(byName.SmartCart.textContent).toContain('AI STYLIST');
    expect(byName.SmartPortal.textContent).toContain('CART BLANCHE');
  });

  it('puts SmartCart in front of the fan', () => {
    renderHand(false);
    const order = [...document.querySelectorAll<HTMLElement>('[data-preview]')].map(p => p.dataset.preview);
    // Later in the DOM paints on top: the stylist is dealt last.
    expect(order.at(-1)).toBe('SmartCart');
  });

  it('moves when motion is allowed', () => {
    renderHand(false);
    expect(motion().length).toBeGreaterThan(0);
  });

  it.each([false, true])('has no motion under prefers-reduced-motion (narrow: %s)', narrow => {
    reduceMotion();
    renderHand(narrow);
    expect(motion().length).toBe(0);
    for (const p of document.querySelectorAll<HTMLElement>('[data-preview]')) {
      expect(p.style.transform).toBe('');
      expect(p.style.opacity === '' || p.style.opacity === '1').toBe(true);
    }
  });
});
