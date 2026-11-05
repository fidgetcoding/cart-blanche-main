import { createContext, useContext } from 'react';

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

export const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
