import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const addItem = vi.hoisted(() => vi.fn());
const removeItem = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  items: [] as unknown[],
  messages: [{ id: 'reply', role: 'assistant', content: 'Try this', products: [{ product_id: 'tee', reason: 'Pairs well' }] }],
  products: [{ id: 'tee', title: 'Tee', price: 40, variants: [{ id: 's', title: 'S', inventory_count: 0 }], images: [] }],
}));
vi.mock('@/contexts/CartContext', () => ({ useCart: () => ({
  items: state.items, isOpen: true, closeCart: vi.fn(), removeItem, updateQuantity: vi.fn(), itemCount: 0,
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

it('does not add sold-out recommendations to the cart', () => {
  render(<CartDrawer />);
  fireEvent.click(screen.getByRole('button', { name: 'ADD' }));
  expect(addItem).not.toHaveBeenCalled();
});
