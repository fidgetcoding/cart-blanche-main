import { createContext, useContext } from 'react';
import type { DemoProduct } from '@/data/demo-data';
import type { CartItem } from '@/contexts/CartContext';

export interface BudgetSwap {
  original_product_id: string;
  original_title: string;
  original_price: number;
  suggested_product_id: string;
  suggested_title: string;
  suggested_price: number;
  reason: string;
}

export interface BudgetComparison {
  original_total: number;
  suggested_total: number;
  savings: number;
  swaps: BudgetSwap[];
  kept: { product_id: string; title: string; price: number; note?: string }[];
}

export interface OutfitItem {
  product_id: string;
  type?: 'store' | 'external';
  role: string;
  reason: string;
  label?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image_url?: string;
  products?: { product_id: string; reason: string }[] | null;
  outfit?: {
    name: string;
    total: number;
    budget?: number | null;
    remaining?: number | null;
    items: OutfitItem[];
  } | null;
  budget_comparison?: BudgetComparison | null;
  timestamp: number;
}

interface SmartCartContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  hasUnread: boolean;
  clearUnread: () => void;
  sendMessage: (text: string, cartItems: CartItem[], imageUrl?: string) => Promise<void>;
  triggerProactive: (mode: 'proactive_add' | 'proactive_review' | 'proactive_remove', cartItems: CartItem[], context?: string) => Promise<void>;
  clearChat: () => void;
  /** What this store actually sells, which the stylist and its cards work from. */
  storeProducts: DemoProduct[];
}

export const SmartCartContext = createContext<SmartCartContextType | undefined>(undefined);

export function useSmartCart() {
  const ctx = useContext(SmartCartContext);
  if (!ctx) throw new Error('useSmartCart must be used within SmartCartProvider');
  return ctx;
}
