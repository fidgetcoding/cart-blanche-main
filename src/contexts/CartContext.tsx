import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface CartItem {
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  price: number;
  quantity: number;
  image?: string;
  colorwayId?: string;
  colorwayName?: string;
}

export interface AppliedDiscount {
  code: string;
  discount_type: string;
  discount_value: number;
  description: string | null;
  minimum_spend?: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  discount: AppliedDiscount | null;
  discountAmount: number;
  total: number;
  applyDiscount: (discount: AppliedDiscount) => void;
  removeDiscount: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = 'cart-blanche-cart';

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['productId', 'variantId', 'title', 'variantTitle'].every(key => typeof item[key] === 'string')
    && Boolean(item.productId) && Boolean(item.variantId)
    && typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0
    && typeof item.quantity === 'number' && Number.isSafeInteger(item.quantity) && item.quantity > 0
    && Number.isFinite(item.price * item.quantity)
    && ['image', 'colorwayId', 'colorwayName'].every(key => item[key] === undefined || typeof item[key] === 'string');
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
    } catch { return []; }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // Browsing and the in-memory cart still work when storage is unavailable.
    }
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    if (!isCartItem({ ...item, quantity: 1 })) return;
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId && i.variantId === item.variantId);
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId && i.variantId === item.variantId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string, variantId: string) => {
    setItems(prev => prev.filter(i => !(i.productId === productId && i.variantId === variantId)));
  }, []);

  const updateQuantity = useCallback((productId: string, variantId: string, quantity: number) => {
    if (!Number.isSafeInteger(quantity)) return;
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    setItems(prev => prev.map(i =>
      i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i
    ));
  }, [removeItem]);

  const clearCart = useCallback(() => { setItems([]); setDiscount(null); }, []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen(p => !p), []);

  const [discount, setDiscount] = useState<AppliedDiscount | null>(null);
  const applyDiscount = useCallback((d: AppliedDiscount) => setDiscount(d), []);
  const removeDiscount = useCallback(() => setDiscount(null), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalCents = items.reduce((sum, i) => sum + Math.round(i.price * 100) * i.quantity, 0);
  const subtotal = subtotalCents / 100;

  useEffect(() => {
    if (discount && subtotal < (discount.minimum_spend ?? 0)) setDiscount(null);
  }, [discount, subtotal]);

  const discountAmount = discount && subtotal >= (discount.minimum_spend ?? 0)
    ? discount.discount_type === 'percentage'
      ? Math.min(subtotalCents, Math.round(subtotalCents * discount.discount_value / 100)) / 100
      : discount.discount_type === 'fixed'
        ? Math.min(Math.round(discount.discount_value * 100), subtotalCents) / 100
        : 0
    : 0;
  const total = Math.max(0, subtotalCents - Math.round(discountAmount * 100)) / 100;

  return (
    <CartContext.Provider value={{ items, isOpen, openCart, closeCart, toggleCart, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal, discount, discountAmount, total, applyDiscount, removeDiscount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
