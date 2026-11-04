import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const addItem = vi.hoisted(() => vi.fn());
const removeItem = vi.hoisted(() => vi.fn());
const updateQuantity = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  items: [{ productId: 'tee', variantId: 'm', title: 'Tee', variantTitle: 'M', price: 40, quantity: 2 }],
  messages: [{ id: 'reply', role: 'assistant', content: 'Try this', budget_comparison: { original_total: 80, suggested_total: 40, savings: 40, kept: [], swaps: [{ original_product_id: 'tee', original_title: 'Tee', original_price: 40, suggested_product_id: 'budget', suggested_title: 'Budget Tee', suggested_price: 20, reason: 'Cheaper' }] } }],
  products: [{ id: 'tee', title: 'Tee', price: 40, variants: [{ id: 's', title: 'S', inventory_count: 5 }, { id: 'm', title: 'M', inventory_count: 5 }], images: [] }, { id: 'budget', title: 'Budget Tee', price: 20, variants: [{ id: 'bs', title: 'S', inventory_count: 5 }, { id: 'bm', title: 'M', inventory_count: 5 }], images: [] }],
}));
vi.mock('@/contexts/CartContext', () => ({ useCart: () => ({
  items: state.items, isOpen: true, closeCart: vi.fn(), removeItem, updateQuantity, itemCount: 0,
  subtotal: 0, addItem, discount: null, discountAmount: 0, total: 0, applyDiscount: vi.fn(), removeDiscount: vi.fn(),
}) }));
vi.mock('@/contexts/SmartCartContext', () => ({ useSmartCart: () => ({
  messages: state.messages, isLoading: false, hasUnread: false, clearUnread: vi.fn(), sendMessage: vi.fn(),
  triggerProactive: vi.fn(), clearChat: vi.fn(), storeProducts: state.products,
}) }));
vi.mock('@/contexts/StyleKitContext', () => ({ useStyleKit: () => ({ openStyleKit: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
import { CartDrawer } from '../CartDrawer';

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
});

it('swaps the actual cart size and preserves its quantity', async () => {
  render(<CartDrawer />);
  fireEvent.click(screen.getByRole('button', { name: 'AI STYLIST' }));
  fireEvent.click(await screen.findByRole('button', { name: 'SWAP' }));
  expect(removeItem).toHaveBeenCalledWith('tee', 'm');
  expect(removeItem).not.toHaveBeenCalledWith('tee', 's');
  expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ productId: 'budget', variantId: 'bm' }));
  expect(updateQuantity).toHaveBeenCalledWith('budget', 'bm', 2);
});
