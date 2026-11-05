import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { DemoProduct } from '@/data/demo-data';
import { useGridLayout } from '@/hooks/use-grid-layout';
import { isBackendConfigured } from '@/integrations/supabase/client';
import type { CartItem } from '@/contexts/CartContext';
import { SmartCartContext, type ChatMessage } from './SmartCartContext';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smartcart-chat`;

const MAX_HISTORY_MESSAGES = 20;
const STYLIST_NOT_SET_UP = "The AI stylist isn't set up on this site yet. Browsing and your cart still work.";
const STYLIST_UNAVAILABLE = "The AI stylist isn't available right now. Browsing and your cart still work.";

function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildCatalog(products: DemoProduct[]) {
  return products.map(p => ({
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
  const { getOrderedProducts } = useGridLayout();
  const storeProducts = useMemo(() => getOrderedProducts(), [getOrderedProducts]);

  const clearUnread = useCallback(() => setHasUnread(false), []);
  const messagesRef = useRef<ChatMessage[]>([]);
  const appendMessage = useCallback((message: ChatMessage) => {
    messagesRef.current = [...messagesRef.current, message];
    setMessages(messagesRef.current);
  }, []);
  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);
  useEffect(() => cancelRequest, [cancelRequest]);
  const clearChat = useCallback(() => {
    cancelRequest();
    messagesRef.current = [];
    setMessages([]);
    setIsLoading(false);
    setHasUnread(false);
  }, [cancelRequest]);

  const callAI = useCallback(async (
    userMessages: { role: string; content: string; image_url?: string }[],
    cartItems: CartItem[],
    signal: AbortSignal,
    mode?: string
  ): Promise<ChatMessage | null> => {
    if (!isBackendConfigured) {
      return { id: generateId(), role: 'assistant', content: STYLIST_NOT_SET_UP, timestamp: Date.now() };
    }

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: userMessages,
          catalog: buildCatalog(storeProducts),
          cart_items: cartItems,
          mode: mode || undefined,
        }),
        signal,
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
    } catch (e) {
      if ((e as Error).name === 'AbortError') return null;
      console.error('SmartCart error:', e);
      return {
        id: generateId(),
        role: 'assistant',
        content: STYLIST_UNAVAILABLE,
        timestamp: Date.now(),
      };
    }
  }, [storeProducts]);

  // Only the current request may append a reply or release the loading state.
  const requestReply = useCallback(async (
    history: { role: string; content: string; image_url?: string }[],
    cartItems: CartItem[],
    mode?: string,
  ) => {
    cancelRequest();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      const response = await callAI(history, cartItems, controller.signal, mode);
      if (abortRef.current !== controller || controller.signal.aborted) return;
      if (response) {
        appendMessage(response);
        if (mode) setHasUnread(true);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
  }, [appendMessage, callAI, cancelRequest]);

  const sendMessage = useCallback(async (text: string, cartItems: CartItem[], imageUrl?: string) => {
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      image_url: imageUrl,
      timestamp: Date.now(),
    };

    appendMessage(userMsg);

    // The function caps conversation size, so only send the recent turns.
    const history = messagesRef.current.slice(-MAX_HISTORY_MESSAGES).map(m => ({
      role: m.role,
      content: m.content,
      ...(m.image_url ? { image_url: m.image_url } : {}),
    }));

    await requestReply(history, cartItems);
  }, [appendMessage, requestReply]);

  const triggerProactive = useCallback(async (
    mode: 'proactive_add' | 'proactive_review' | 'proactive_remove',
    cartItems: CartItem[],
    context?: string
  ) => {
    if (abortRef.current || !isBackendConfigured) return;

    const proactivePrompt = context
      ? `[System: ${context}]`
      : mode === 'proactive_add'
        ? `[System: Shopper just added "${cartItems[cartItems.length - 1]?.title}" to cart. Suggest complementary items.]`
        : mode === 'proactive_review'
          ? '[System: Shopper is reviewing their cart. Suggest completing the look if appropriate.]'
          : '[System: Shopper just removed an item. Suggest alternatives at different price points.]';

    await requestReply(
      [{ role: 'user', content: proactivePrompt }],
      cartItems,
      mode
    );
  }, [requestReply]);

  return (
    <SmartCartContext.Provider value={{ messages, isLoading, hasUnread, clearUnread, sendMessage, triggerProactive, clearChat, storeProducts }}>
      {children}
    </SmartCartContext.Provider>
  );
}
