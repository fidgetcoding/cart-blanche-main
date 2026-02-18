import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Send, Sparkles, Layers, Loader2, Image as ImageIcon, DollarSign, ArrowRight, Tag, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCart } from '@/contexts/CartContext';
import { useSmartCart } from '@/contexts/SmartCartContext';
import type { BudgetComparison, OutfitItem } from '@/contexts/SmartCartContext';
import { useStyleKit } from '@/contexts/StyleKitContext';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { supabase } from '@/integrations/supabase/client';

type Tab = 'cart' | 'assistant';

function ProductCard({ productId, reason, onAddToCart }: {
  productId: string;
  reason: string;
  onAddToCart: (productId: string) => void;
}) {
  const product = DEMO_PRODUCTS.find(p => p.id === productId);
  if (!product) return null;

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-secondary/40 border border-border/50">
      <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-[9px] font-display flex-shrink-0">
        IMG
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-xs font-medium truncate">{product.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{reason}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-display text-xs font-semibold">${product.price}</span>
          <button
            onClick={() => onAddToCart(productId)}
            className="px-2 py-0.5 text-[9px] font-display tracking-wider bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}

function OutfitCard({ outfit, onAddAll, onAddToCart }: {
  outfit: { name: string; total: number; budget?: number | null; remaining?: number | null; items: OutfitItem[] };
  onAddAll: () => void;
  onAddToCart: (productId: string) => void;
}) {
  const storeItems = outfit.items.filter(i => i.type !== 'external');
  
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden bg-secondary/30">
      <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
        <span className="font-display text-xs font-semibold tracking-wide">{outfit.name.toUpperCase()}</span>
        <span className="font-display text-xs text-muted-foreground">${outfit.total}</span>
      </div>
      
      {/* Budget bar */}
      {outfit.budget && (
        <div className="px-3 py-1.5 border-b border-border/20">
          <div className="flex items-center justify-between text-[9px] font-display tracking-wider text-muted-foreground mb-1">
            <span>${outfit.total} of ${outfit.budget} used</span>
            <span>${outfit.remaining ?? 0} remaining</span>
          </div>
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(100, (outfit.total / outfit.budget) * 100)}%` }}
            />
          </div>
        </div>
      )}
      
      <div className="p-2 space-y-1.5">
        {outfit.items.map((item, idx) => {
          if (item.type === 'external') {
            return (
              <div key={`ext-${idx}`} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/30 border border-dashed border-border/40">
                <div className="w-8 h-8 rounded bg-muted/50 flex items-center justify-center text-muted-foreground flex-shrink-0">
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-display font-medium text-muted-foreground truncate">{item.label || 'Your item'}</p>
                  <p className="text-[9px] text-muted-foreground/60">{item.role} · not from store</p>
                </div>
              </div>
            );
          }
          
          const product = DEMO_PRODUCTS.find(p => p.id === item.product_id);
          if (!product) return null;
          return (
            <div key={item.product_id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/40">
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground text-[7px] font-display flex-shrink-0">
                IMG
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-display font-medium truncate">{product.title}</p>
                <p className="text-[9px] text-muted-foreground">{item.role} · ${product.price}</p>
              </div>
              <button
                onClick={() => onAddToCart(item.product_id)}
                className="px-1.5 py-0.5 text-[8px] font-display tracking-wider text-muted-foreground hover:text-foreground border border-border rounded transition-colors"
              >
                ADD
              </button>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 border-t border-border/30">
        <button
          onClick={onAddAll}
          className="w-full py-1.5 text-[10px] font-display font-semibold tracking-wider bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
        >
          ADD STORE ITEMS TO CART
        </button>
      </div>
    </div>
  );
}

function BudgetComparisonCard({ comparison, onSwapAll, onSwapOne }: {
  comparison: BudgetComparison;
  onSwapAll: () => void;
  onSwapOne: (originalProductId: string, suggestedProductId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden bg-secondary/30">
      <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
        <span className="font-display text-[10px] font-semibold tracking-wider">BUDGET REBUILD</span>
        <span className="font-display text-xs text-green-400">Save ${comparison.savings}</span>
      </div>
      
      {/* Totals */}
      <div className="px-3 py-2 flex items-center justify-between text-[10px] font-display border-b border-border/20">
        <span className="text-muted-foreground line-through">${comparison.original_total}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span className="font-semibold">${comparison.suggested_total}</span>
      </div>
      
      {/* Swaps */}
      <div className="p-2 space-y-2">
        {comparison.swaps.map((swap) => (
          <div key={swap.original_product_id} className="rounded bg-secondary/40 p-2">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-muted-foreground line-through truncate">{swap.original_title} — ${swap.original_price}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-display font-medium truncate">{swap.suggested_title} — ${swap.suggested_price}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{swap.reason}</p>
              </div>
              <button
                onClick={() => onSwapOne(swap.original_product_id, swap.suggested_product_id)}
                className="px-1.5 py-0.5 text-[8px] font-display tracking-wider text-muted-foreground hover:text-foreground border border-border rounded transition-colors flex-shrink-0"
              >
                SWAP
              </button>
            </div>
          </div>
        ))}
        
        {comparison.kept && comparison.kept.length > 0 && (
          <div className="text-[9px] text-muted-foreground px-1">
            Keeping: {comparison.kept.map(k => k.title).join(', ')}
          </div>
        )}
      </div>
      
      <div className="px-3 py-2 border-t border-border/30">
        <button
          onClick={onSwapAll}
          className="w-full py-1.5 text-[10px] font-display font-semibold tracking-wider bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
        >
          SWAP ALL — SAVE ${comparison.savings}
        </button>
      </div>
    </div>
  );
}

import type { AppliedDiscount } from '@/contexts/CartContext';

function CartFooter({ subtotal, discount, discountAmount, total, applyDiscount, removeDiscount, closeCart }: {
  subtotal: number;
  discount: AppliedDiscount | null;
  discountAmount: number;
  total: number;
  applyDiscount: (d: AppliedDiscount) => void;
  removeDiscount: () => void;
  closeCart: () => void;
}) {
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoError('');
    setPromoLoading(true);

    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .ilike('code', code)
      .eq('is_active', true)
      .maybeSingle();

    setPromoLoading(false);

    if (error || !data) {
      setPromoError('Invalid discount code');
      return;
    }

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setPromoError('This code has expired');
      return;
    }

    // Check max uses
    if (data.max_uses && data.times_used >= data.max_uses) {
      setPromoError('This code has been fully redeemed');
      return;
    }

    // Check minimum spend
    if (data.minimum_spend && subtotal < data.minimum_spend) {
      setPromoError(`Minimum spend of $${data.minimum_spend} required`);
      return;
    }

    applyDiscount({
      code: data.code,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      description: data.description,
    });
    setPromoInput('');
  };

  return (
    <div className="border-t border-border p-4 space-y-3">
      {/* Promo code input */}
      {!discount ? (
        <div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                placeholder="Discount code"
                className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-ring uppercase"
              />
            </div>
            <button
              onClick={handleApplyPromo}
              disabled={promoLoading || !promoInput.trim()}
              className="px-4 py-2 bg-secondary text-foreground font-display text-[10px] tracking-wider rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              {promoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'APPLY'}
            </button>
          </div>
          {promoError && (
            <p className="text-[10px] text-destructive mt-1.5 font-display tracking-wider">{promoError}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between py-1.5 px-3 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-success" />
            <span className="text-[10px] font-mono tracking-wider text-success">{discount.code}</span>
            <span className="text-[10px] text-muted-foreground">
              {discount.discount_type === 'percentage' ? `${discount.discount_value}% off` :
               discount.discount_type === 'fixed' ? `$${discount.discount_value} off` : 'Free shipping'}
            </span>
          </div>
          <button onClick={removeDiscount} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex justify-between font-display">
          <span className="text-muted-foreground tracking-wide text-xs">SUBTOTAL</span>
          <span className="text-sm">${subtotal.toFixed(0)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between font-display">
            <span className="text-success tracking-wide text-xs">DISCOUNT</span>
            <span className="text-sm text-success">-${discountAmount.toFixed(0)}</span>
          </div>
        )}
        <div className="flex justify-between font-display pt-1 border-t border-border/30">
          <span className="text-foreground tracking-wide text-xs font-semibold">TOTAL</span>
          <span className="text-base font-semibold">${total.toFixed(0)}</span>
        </div>
      </div>
      <button className="w-full py-2.5 bg-primary text-primary-foreground font-display font-semibold tracking-wider text-xs rounded-lg hover:opacity-90 transition-opacity">
        CHECKOUT
      </button>
      <button onClick={closeCart} className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        Continue Shopping
      </button>
    </div>
  );
}

const PROMPT_CARDS = [
  { label: "What's On Sale", text: "What items are on sale right now?", icon: DollarSign },
  { label: "Best Sellers", text: "Show me the best sellers", icon: ShoppingBag },
  { label: "Under $100", text: "What can I get under $100?", icon: Sparkles },
  { label: "New Arrivals", text: "Show me the newest arrivals", icon: Layers },
];

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, itemCount, subtotal, addItem, discount, discountAmount, total, applyDiscount, removeDiscount } = useCart();
  const { messages, isLoading, hasUnread, clearUnread, sendMessage, triggerProactive, clearChat } = useSmartCart();
  const { openStyleKit } = useStyleKit();
  const [activeTab, setActiveTab] = useState<Tab>(items.length > 0 ? 'cart' : 'assistant');
  const [inputValue, setInputValue] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevItemCountRef = useRef(itemCount);

  // Proactive: on add-to-cart, trigger suggestion
  useEffect(() => {
    if (itemCount > prevItemCountRef.current && itemCount > 0) {
      triggerProactive('proactive_add', items);
    }
    prevItemCountRef.current = itemCount;
  }, [itemCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    if (activeTab === 'assistant') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // When cart opens, switch tab based on whether items exist
  useEffect(() => {
    if (isOpen) {
      setActiveTab(items.length > 0 ? 'cart' : 'assistant');
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear unread when switching to assistant tab
  useEffect(() => {
    if (activeTab === 'assistant' && hasUnread) {
      clearUnread();
    }
  }, [activeTab, hasUnread, clearUnread]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('chat-uploads').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('chat-uploads').getPublicUrl(path);
      setPendingImage(publicUrl);
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSend = () => {
    const text = inputValue.trim();
    if ((!text && !pendingImage) || isLoading) return;
    const msg = text || (pendingImage ? 'What do you see in this image?' : '');
    setInputValue('');
    sendMessage(msg, items, pendingImage || undefined);
    setPendingImage(null);
  };

  const handleAddToCart = (productId: string) => {
    const product = DEMO_PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const v = product.variants.find(v => v.inventory_count > 0) || product.variants[0];
    if (v) {
      addItem({
        productId: product.id,
        variantId: v.id,
        title: product.title,
        variantTitle: v.title,
        price: v.price ?? product.price,
      });
    }
  };

  const handleAddOutfitToCart = (outfitItems: OutfitItem[]) => {
    for (const item of outfitItems) {
      if (item.type === 'external') continue;
      handleAddToCart(item.product_id);
    }
  };

  const handleSwapAll = (comparison: BudgetComparison) => {
    for (const swap of comparison.swaps) {
      // Remove old, add new
      const oldProduct = DEMO_PRODUCTS.find(p => p.id === swap.original_product_id);
      if (oldProduct) {
        const oldVariant = oldProduct.variants[0];
        if (oldVariant) removeItem(oldProduct.id, oldVariant.id);
      }
      handleAddToCart(swap.suggested_product_id);
    }
  };

  const handleSwapOne = (originalProductId: string, suggestedProductId: string) => {
    const oldProduct = DEMO_PRODUCTS.find(p => p.id === originalProductId);
    if (oldProduct) {
      const oldVariant = oldProduct.variants[0];
      if (oldVariant) removeItem(oldProduct.id, oldVariant.id);
    }
    handleAddToCart(suggestedProductId);
  };

  const handleAskAbout = (productTitle: string) => {
    setActiveTab('assistant');
    setTimeout(() => {
      setInputValue(`What goes with the ${productTitle}?`);
      inputRef.current?.focus();
    }, 100);
  };

  const emptyAssistantMessage = items.length > 0
    ? "I see you've got some great picks. Want me to suggest pieces that go with them?"
    : "Hey! I know every item in this store.\nTell me what you're looking for.";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={closeCart}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 liquid-glass border-l border-white/[0.06] flex flex-col"
          >
            {/* Header with tabs */}
            <div className="border-b border-white/[0.06]">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="font-display text-sm font-semibold tracking-[0.15em]">
                  SMARTCART
                </h2>
                <button onClick={closeCart} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab toggle */}
              <div className="flex px-4 pb-0">
                <button
                  onClick={() => setActiveTab('cart')}
                  className={`relative flex-1 py-2.5 text-xs font-display tracking-wider transition-colors ${
                    activeTab === 'cart'
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground/70'
                  }`}
                >
                  CART {itemCount > 0 && `(${itemCount})`}
                  {activeTab === 'cart' && (
                    <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('assistant')}
                  className={`relative flex-1 py-2.5 text-xs font-display tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === 'assistant'
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground/70'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  AI STYLE ASSISTANT
                  {hasUnread && activeTab !== 'assistant' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
                  )}
                  {activeTab === 'assistant' && (
                    <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === 'cart' ? (
                <motion.div
                  key="cart"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  {/* Cart items */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <ShoppingBag className="w-10 h-10 mb-3 opacity-30" />
                        <p className="font-display text-xs tracking-wide">YOUR CART IS EMPTY</p>
                        <button onClick={closeCart} className="mt-3 text-xs text-accent-foreground hover:underline">
                          Continue Shopping
                        </button>
                      </div>
                    ) : (
                      items.map((item) => (
                        <motion.div
                          key={`${item.productId}-${item.variantId}`}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 50 }}
                          className="flex gap-3 p-3 bg-secondary/50 rounded-lg relative"
                        >
                          <div className="w-14 h-14 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-[9px] font-display">
                            IMG
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-xs font-medium truncate">{item.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.variantTitle}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                                  className="w-5 h-5 flex items-center justify-center rounded border border-border hover:bg-muted transition-colors"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="text-xs w-5 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                                  className="w-5 h-5 flex items-center justify-center rounded border border-border hover:bg-muted transition-colors"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <span className="font-display text-xs">${(item.price * item.quantity).toFixed(0)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.productId, item.variantId)}
                            className="self-start p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          {/* Ask about this / Find Pairs */}
                          <div className="absolute bottom-2 right-2 flex gap-1.5">
                            <button
                              onClick={() => handleAskAbout(item.title)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-display tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-md border border-border/40 transition-colors"
                            >
                              <Sparkles className="w-3 h-3" />
                              ASK AI
                            </button>
                            <button
                              onClick={() => {
                                const product = DEMO_PRODUCTS.find(p => p.id === item.productId);
                                if (product) {
                                  closeCart();
                                  openStyleKit(product);
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-display tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-md border border-border/40 transition-colors"
                            >
                              <Layers className="w-3 h-3" />
                              PAIRS
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* Cart footer */}
                  {items.length > 0 && (
                    <CartFooter
                      subtotal={subtotal}
                      discount={discount}
                      discountAmount={discountAmount}
                      total={total}
                      applyDiscount={applyDiscount}
                      removeDiscount={removeDiscount}
                      closeCart={closeCart}
                    />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="assistant"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  {/* Chat messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && !isLoading ? (
                      <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <Sparkles className="w-8 h-8 mb-3 text-muted-foreground/40" />
                        <h3 className="font-display text-sm font-semibold tracking-[0.12em] mb-1.5">AI STYLE ASSISTANT</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px] whitespace-pre-line mb-6">
                          {emptyAssistantMessage}
                        </p>
                        <div className="grid grid-cols-2 gap-2 w-full max-w-[320px]">
                          {PROMPT_CARDS.map(card => (
                            <button
                              key={card.label}
                              onClick={() => { setInputValue(''); sendMessage(card.text, items); }}
                              className="flex flex-col items-start gap-2 p-3 rounded-lg liquid-glass hover:brightness-125 text-left transition-all"
                            >
                              <card.icon className="w-4 h-4 text-muted-foreground/50" />
                              <span className="text-xs font-display font-medium">{card.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2'
                              : 'space-y-2'
                          }`}>
                            {msg.role === 'user' ? (
                              <div>
                                {msg.image_url && (
                                  <div className="mb-2 rounded-lg overflow-hidden">
                                    <img src={msg.image_url} alt="Uploaded" className="w-full max-h-40 object-cover rounded-lg" />
                                  </div>
                                )}
                                <p className="text-xs">{msg.content}</p>
                              </div>
                            ) : (
                              <>
                                {msg.content && (
                                  <div className="text-xs text-foreground/90 leading-relaxed prose prose-invert prose-xs max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                  </div>
                                )}
                                {msg.products && msg.products.length > 0 && (
                                  <div className="space-y-2 mt-2">
                                    {msg.products.map((rec) => (
                                      <ProductCard
                                        key={rec.product_id}
                                        productId={rec.product_id}
                                        reason={rec.reason}
                                        onAddToCart={handleAddToCart}
                                      />
                                    ))}
                                  </div>
                                )}
                                {msg.outfit && (
                                  <div className="mt-2">
                                    <OutfitCard
                                      outfit={msg.outfit}
                                      onAddAll={() => handleAddOutfitToCart(msg.outfit!.items)}
                                      onAddToCart={handleAddToCart}
                                    />
                                  </div>
                                )}
                                {msg.budget_comparison && (
                                  <div className="mt-2">
                                    <BudgetComparisonCard
                                      comparison={msg.budget_comparison}
                                      onSwapAll={() => handleSwapAll(msg.budget_comparison!)}
                                      onSwapOne={handleSwapOne}
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground font-display tracking-wider">THINKING...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>


                  {/* Pending image preview */}
                  {pendingImage && (
                    <div className="px-3 pb-1">
                      <div className="relative inline-block">
                        <img src={pendingImage} alt="Upload preview" className="h-16 rounded-lg border border-border/50" />
                        <button
                          onClick={() => setPendingImage(null)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Chat input */}
                  <div className="border-t border-white/[0.06] p-3">
                    <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
                      {/* Image upload */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                          e.target.value = '';
                        }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isLoading}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
                        title="Upload an image"
                      >
                        {isUploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5" />
                        )}
                      </button>
                      
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder={pendingImage ? "Describe what you want..." : "Ask about products, upload a photo..."}
                        className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                        disabled={isLoading}
                      />
                      <button
                        onClick={handleSend}
                        disabled={(!inputValue.trim() && !pendingImage) || isLoading}
                        className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}