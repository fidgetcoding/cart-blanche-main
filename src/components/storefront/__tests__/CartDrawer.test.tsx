import { act, fireEvent, render, screen } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { useCart } from '@/contexts/CartContext';
import { CartProvider } from '@/contexts/CartProvider';
import { SmartCartProvider } from '@/contexts/SmartCartProvider';
import { StyleKitProvider } from '@/contexts/StyleKitProvider';

vi.mock('@/integrations/supabase/client', () => ({ supabase: null, isBackendConfigured: false }));

import { CartDrawer } from '../CartDrawer';

let cart: ReturnType<typeof useCart>;
function GrabCart() {
  cart = useCart();
  return null;
}

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  Element.prototype.scrollIntoView = vi.fn();
});
afterAll(() => { MotionGlobalConfig.skipAnimations = false; });

it('closes on Escape, as the top layer, before anything beneath it', async () => {
  render(
    <CartProvider>
      <SmartCartProvider>
        <StyleKitProvider>
          <GrabCart />
          <CartDrawer />
        </StyleKitProvider>
      </SmartCartProvider>
    </CartProvider>,
  );
  act(() => cart.openCart());
  expect(await screen.findByText('SMARTCART')).toBeTruthy();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(cart.isOpen).toBe(false);
});
