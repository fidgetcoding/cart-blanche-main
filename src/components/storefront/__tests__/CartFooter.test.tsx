import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast }));

const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/lib/store-merchant', () => ({ resolveStoreMerchantId: async () => 'store' }));
vi.mock('@/lib/demo/client', () => ({ supabase: { rpc } }));

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


it('allows retry after a failed promo-code request', async () => {
  rpc.mockRejectedValueOnce(new Error('Network unavailable'));
  render(<CartFooter subtotal={200} discount={null} discountAmount={0} total={200} applyDiscount={() => {}} removeDiscount={() => {}} closeCart={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText('Discount code'), { target: { value: 'SPRING20' } });
  fireEvent.click(screen.getByRole('button', { name: 'APPLY' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'APPLY' })).toBeEnabled());
  expect(screen.getByText(/couldn't check.*try again/i)).toBeInTheDocument();
});

it('shows the cents actually charged instead of rounding the displayed totals', () => {
  render(<CartFooter subtotal={19.95} discount={{ code: 'SAVE20', discount_type: 'percentage', discount_value: 20, description: null }} discountAmount={3.99} total={15.96} applyDiscount={() => {}} removeDiscount={() => {}} closeCart={() => {}} />);
  expect(screen.getByText('$19.95')).toBeInTheDocument();
  expect(screen.getByText('-$3.99')).toBeInTheDocument();
  expect(screen.getByText('$15.96')).toBeInTheDocument();
});

it('drops a minimum-spend error once the cart total changes', async () => {
  rpc.mockResolvedValueOnce({ data: [{ status: 'valid', code: 'SPRING20', discount_type: 'percentage', discount_value: 20, minimum_spend: 150 }], error: null });
  const footer = (subtotal: number) => (
    <CartFooter subtotal={subtotal} discount={null} discountAmount={0} total={subtotal} applyDiscount={() => {}} removeDiscount={() => {}} closeCart={() => {}} />
  );
  const { rerender } = render(footer(50));
  fireEvent.change(screen.getByPlaceholderText('Discount code'), { target: { value: 'SPRING20' } });
  fireEvent.click(screen.getByRole('button', { name: 'APPLY' }));
  expect(await screen.findByText('Minimum spend of $150 required')).toBeInTheDocument();
  rerender(footer(150));
  expect(screen.queryByText('Minimum spend of $150 required')).toBeNull();
});
