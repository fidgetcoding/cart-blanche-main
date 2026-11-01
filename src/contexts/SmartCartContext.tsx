import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { isBackendConfigured } from '@/integrations/supabase/client';
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
}

const SmartCartContext = createContext<SmartCartContextType | undefined>(undefined);

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smartcart-chat`;

const MAX_HISTORY_MESSAGES = 20;
const STYLIST_NOT_SET_UP = "The AI stylist isn't set up on this site yet. Browsing and your cart still work.";
const STYLIST_UNAVAILABLE = "The AI stylist isn't available right now. Browsing and your cart still work.";

function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildCatalog() {
  return DEMO_PRODUCTS.map(p => ({
    id: p.id,
    title: p.title,
    price: p.price,
    compare_at_price: p.compare_at_price,
    category: p.category,
    description: p.description,
    variants: p.variants.map(v => ({
      id: v.id,
      title: v.title,
      inventory_count: v.inventory_count,
    })),
  }));
}

export function SmartCartProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const clearUnread = useCallback(() => setHasUnread(false), []);
  const clearChat = useCallback(() => setMessages([]), []);

  const callAI = useCallback(async (
    userMessages: { role: string; content: string; image_url?: string }[],
    cartItems: CartItem[],
    mode?: string
  ): Promise<ChatMessage | null> => {
    if (!isBackendConfigured) {
      return { id: generateId(), role: 'assistant', content: STYLIST_NOT_SET_UP, timestamp: Date.now() };
    }

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: userMessages,
          catalog: buildCatalog(),
          cart_items: cartItems,
          mode: mode || undefined,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        console.error('SmartCart AI error:', err);
        return {
          id: generateId(),
          role: 'assistant',
          content: err.code === 'ai_not_configured' ? STYLIST_NOT_SET_UP : err.error || STYLIST_UNAVAILABLE,
          timestamp: Date.now(),
        };
      }

      const data = await resp.json();
      return {
        id: generateId(),
        role: 'assistant',
        content: data.message || '',
        products: data.products,
        outfit: data.outfit,
        budget_comparison: data.budget_comparison,
        timestamp: Date.now(),
      };
    } catch (e: any) {
      if (e.name === 'AbortError') return null;
      console.error('SmartCart error:', e);
      return {
        id: generateId(),
        role: 'assistant',
        content: STYLIST_UNAVAILABLE,
        timestamp: Date.now(),
      };
    }
  }, []);

  const sendMessage = useCallback(async (text: string, cartItems: CartItem[], imageUrl?: string) => {
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      image_url: imageUrl,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // The function caps conversation size, so only send the recent turns.
    const history = [...messages, userMsg].slice(-MAX_HISTORY_MESSAGES).map(m => ({
      role: m.role,
      content: m.content,
      ...(m.image_url ? { image_url: m.image_url } : {}),
    }));

    const response = await callAI(history, cartItems);
    if (response) {
      setMessages(prev => [...prev, response]);
    }
    setIsLoading(false);
  }, [messages, callAI]);

  const triggerProactive = useCallback(async (
    mode: 'proactive_add' | 'proactive_review' | 'proactive_remove',
    cartItems: CartItem[],
    context?: string
  ) => {
    if (isLoading || !isBackendConfigured) return;

    const proactivePrompt = context
      ? `[System: ${context}]`
      : mode === 'proactive_add'
        ? `[System: Shopper just added "${cartItems[cartItems.length - 1]?.title}" to cart. Suggest complementary items.]`
        : mode === 'proactive_review'
          ? '[System: Shopper is reviewing their cart. Suggest completing the look if appropriate.]'
          : '[System: Shopper just removed an item. Suggest alternatives at different price points.]';

    setIsLoading(true);
    const response = await callAI(
      [{ role: 'user', content: proactivePrompt }],
      cartItems,
      mode
    );

    if (response) {
      setMessages(prev => [...prev, response]);
      setHasUnread(true);
    }
    setIsLoading(false);
  }, [isLoading, callAI]);

  return (
    <SmartCartContext.Provider value={{ messages, isLoading, hasUnread, clearUnread, sendMessage, triggerProactive, clearChat }}>
      {children}
    </SmartCartContext.Provider>
  );
}

export function useSmartCart() {
  const ctx = useContext(SmartCartContext);
  if (!ctx) throw new Error('useSmartCart must be used within SmartCartProvider');
  return ctx;
}