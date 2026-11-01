import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast }));

import { CartFooter } from '../CartDrawer';

describe('CartFooter', () => {
  it('says checkout is not connected instead of doing nothing', () => {
    render(
      <CartFooter subtotal={100} discount={null} discountAmount={0} total={100} applyDiscount={() => {}} removeDiscount={() => {}} closeCart={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'CHECKOUT' }));
    expect(toast).toHaveBeenCalledWith("Checkout isn't connected yet, so nothing was charged.");
  });
});
