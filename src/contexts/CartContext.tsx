import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface CartItem {
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface AppliedDiscount {
  code: string;
  discount_type: string;
  discount_value: number;
  description: string | null;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
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
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const discountAmount = discount
    ? discount.discount_type === 'percentage'
      ? Math.round(subtotal * discount.discount_value / 100)
      : discount.discount_type === 'fixed'
        ? Math.min(discount.discount_value, subtotal)
        : 0
    : 0;
  const total = Math.max(0, subtotal - discountAmount);

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
