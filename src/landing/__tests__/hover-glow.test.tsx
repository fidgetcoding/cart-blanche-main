import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CartProvider } from '@/contexts/CartProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { LiveShop } from '../page/parts/live';
import { PAGE1 } from '../page/lib/core';
import { LANDING_THEME } from '../theme';
import { stubStoryLayout } from './story-stubs';

// Gives the canvas a size, so it lays its tiles out.
stubStoryLayout();

describe('the live store’s hover glow on the light landing', () => {
  it('glows dark, so it shows on the light page', () => {
    render(
      <ThemeProvider storageKey="cb-landing-test" defaults={LANDING_THEME}>
        <CartProvider><LiveShop products={PAGE1} scene={{ cam: 'all' }} /></CartProvider>
      </ThemeProvider>,
    );
    const tile = document.querySelector<HTMLElement>('[data-canvas] > div')!;
    fireEvent.mouseEnter(tile);
    const shadow = tile.querySelector<HTMLElement>('.rounded-lg')!.style.boxShadow;
    expect(shadow).not.toBe('');
    // The store's default glow is white at 8%, which disappears on the landing's near-white background.
    expect(shadow).not.toMatch(/hsla\(0,\s*0%,\s*100%|rgba\(255,\s*255,\s*255/);
  });
});
