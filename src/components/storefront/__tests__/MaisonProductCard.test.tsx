import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CartProvider } from '@/contexts/CartProvider';
import { StyleKitProvider } from '@/contexts/StyleKitProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { MaisonProductCard } from '../MaisonProductCard';

function stripStep(container: HTMLElement) {
  const strip = container.querySelector<HTMLElement>('[style*="translateX"]')!;
  const count = parseFloat(strip.style.width) / 100;
  const shift = parseFloat(strip.style.transform.replace('translateX(-', ''));
  return Math.round((shift / 100) * count);
}

describe('MaisonProductCard', () => {
  it('steps one photo per arrow click, and never on hover', () => {
    const product = DEMO_PRODUCTS.find(p => p.images.length > 1)!;
    const { container } = render(
      <ThemeProvider>
        <CartProvider>
          <StyleKitProvider>
            <MaisonProductCard product={product} viewMode={3} onClick={() => {}} onBuildSet={() => {}} index={0} />
          </StyleKitProvider>
        </CartProvider>
      </ThemeProvider>,
    );
    fireEvent.mouseEnter(container.firstElementChild!);
    const next = screen.getByRole('button', { name: 'Next photo' });
    fireEvent.mouseEnter(next);
    expect(stripStep(container)).toBe(0);
    fireEvent.click(next);
    expect(stripStep(container)).toBe(1);
  });
});
