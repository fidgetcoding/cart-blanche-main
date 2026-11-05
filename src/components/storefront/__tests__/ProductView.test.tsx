import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CartProvider } from '@/contexts/CartProvider';
import { StyleKitProvider } from '@/contexts/StyleKitProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { ProductView } from '../ProductView';

function view(productIndex: number, onNavigate: (i: number) => void = () => {}) {
  return (
    <ThemeProvider>
      <CartProvider>
        <StyleKitProvider>
          <ProductView
            productIndex={productIndex}
            products={DEMO_PRODUCTS}
            categories={['ALL']}
            activeCategory="ALL"
            onCategoryChange={() => {}}
            onClose={() => {}}
            onNavigate={onNavigate}
          />
        </StyleKitProvider>
      </CartProvider>
    </ThemeProvider>
  );
}

describe('ProductView', () => {
  it('stays open when the cursor lands on the close button', () => {
    render(view(0));
    const expand = screen.getAllByRole('button').find(button => button.querySelector('svg.lucide-plus'));
    fireEvent.mouseEnter(expand!);
    const close = screen.getByRole('button', { name: 'Close details' });
    fireEvent.mouseEnter(close);
    expect(screen.getByRole('button', { name: 'Close details' })).toBeTruthy();
    fireEvent.click(close);
  });

  it('survives its product disappearing, as when a filter removes it', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(view(0));
    expect(() => rerender(view(-1))).not.toThrow();
    expect(() => rerender(view(0))).not.toThrow();
    consoleError.mockRestore();
  });

  it('moves one product per arrow click, and never on hover', () => {
    const onNavigate = vi.fn();
    render(view(0, onNavigate));
    const next = screen.getByRole('button', { name: 'Next product' });
    fireEvent.mouseEnter(next);
    fireEvent.mouseLeave(next);
    fireEvent.mouseEnter(next);
    expect(onNavigate).not.toHaveBeenCalled();
    fireEvent.click(next);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('moves one product per trackpad swipe, momentum tail included', () => {
    vi.useFakeTimers();
    try {
      const onNavigate = vi.fn();
      render(view(0, onNavigate));
      vi.advanceTimersByTime(700);
      // A trackpad swipe: ~1.4s of wheel events every 16ms as the momentum decays.
      const swipe = () => {
        for (let i = 0; i < 90; i++) {
          fireEvent.wheel(document.body, { deltaX: Math.max(20, 120 - i), deltaY: 0 });
          vi.advanceTimersByTime(16);
        }
      };
      swipe();
      expect(onNavigate).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(400);
      swipe();
      expect(onNavigate).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
