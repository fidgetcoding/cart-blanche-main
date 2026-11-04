import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from '../CartContext';

const item = { productId: 'tee', variantId: 'medium', title: 'Tee', variantTitle: 'M', price: 19.95 };
const mount = () => renderHook(() => useCart(), { wrapper: CartProvider });

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('saved cart recovery', () => {
  it('recovers from valid JSON that is not an array', () => {
    localStorage.setItem('cart-blanche-cart', '{"items":[]}');
    const { result } = mount();
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});

it('preserves valid lines while dropping malformed saved entries', () => {
  const valid = { ...item, quantity: 2 };
  localStorage.setItem('cart-blanche-cart', JSON.stringify([null, {}, { ...valid, price: -1 }, { ...valid, quantity: '2' }, valid]));
  const { result } = mount();
  expect(result.current.items).toEqual([valid]);
  expect(result.current.subtotal).toBe(39.9);
});

it('keeps shopping usable when browser storage writes are blocked', () => {
  localStorage.clear();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
  const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
  act(() => result.current.addItem({ productId: 'p', variantId: 'v', title: 'Tee', variantTitle: 'M', price: 20 }));
  expect(result.current.itemCount).toBe(1);
  expect(result.current.total).toBe(20);
});

it('calculates percentage discounts in cents instead of rounding to dollars', () => {
  localStorage.clear();
  const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
  act(() => {
    result.current.addItem({ productId: 'p', variantId: 'v', title: 'Tee', variantTitle: 'M', price: 19.95 });
    result.current.applyDiscount({ code: 'SAVE20', discount_type: 'percentage', discount_value: 20, description: null });
  });
  expect(result.current.discountAmount).toBe(3.99);
  expect(result.current.total).toBe(15.96);
});

it('removes a minimum-spend promotion after the cart drops below its threshold', () => {
  localStorage.clear();
  const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
  act(() => {
    result.current.addItem({ productId: 'p', variantId: 'v', title: 'Tee', variantTitle: 'M', price: 100 });
    result.current.addItem({ productId: 'p', variantId: 'v', title: 'Tee', variantTitle: 'M', price: 100 });
    result.current.applyDiscount({ code: 'SPRING20', discount_type: 'percentage', discount_value: 20, description: null, minimum_spend: 150 });
  });
  expect(result.current.discountAmount).toBe(40);
  act(() => result.current.updateQuantity('p', 'v', 1));
  expect(result.current.discountAmount).toBe(0);
  expect(result.current.discount).toBeNull();
  expect(result.current.total).toBe(100);
});

it('ignores invalid quantities without poisoning the cart total', () => {
  localStorage.clear();
  const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
  act(() => result.current.addItem({ productId: 'p', variantId: 'v', title: 'Tee', variantTitle: 'M', price: 20 }));
  for (const invalid of [NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    act(() => result.current.updateQuantity('p', 'v', invalid));
    expect(result.current.itemCount).toBe(1);
    expect(result.current.total).toBe(20);
  }
});
