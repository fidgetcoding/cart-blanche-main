import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CartProvider } from '@/contexts/CartContext';
import { StyleKitProvider } from '@/contexts/StyleKitContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { ProductView } from '../ProductView';

function view(productIndex: number) {
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
            onNavigate={() => {}}
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
});
