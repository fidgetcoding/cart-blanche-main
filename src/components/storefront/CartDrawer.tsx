import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Send, Sparkles, Layers, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCart } from '@/contexts/CartContext';
import { useSmartCart } from '@/contexts/SmartCartContext';
import { useStyleKit } from '@/contexts/StyleKitContext';
import { DEMO_PRODUCTS } from '@/data/demo-data';

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
  outfit: { name: string; total: number; items: { product_id: string; role: string; reason: string }[] };
  onAddAll: () => void;
  onAddToCart: (productId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden bg-secondary/30">
      <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
        <span className="font-display text-xs font-semibold tracking-wide">{outfit.name.toUpperCase()}</span>
        <span className="font-display text-xs text-muted-foreground">${outfit.total}</span>
      </div>
      <div className="p-2 space-y-1.5">
        {outfit.items.map(item => {
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
          ADD FULL LOOK TO CART
        </button>
      </div>
    </div>
  );
}

const PROMPT_CHIPS = [
  "Complete this outfit",
  "Find something similar but cheaper",
  "What's trending?",
];

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, itemCount, subtotal, addItem } = useCart();
  const { messages, isLoading, hasUnread, clearUnread, sendMessage, triggerProactive, clearChat } = useSmartCart();
  const { openStyleKit } = useStyleKit();
  const [activeTab, setActiveTab] = useState<Tab>('cart');
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Clear unread when switching to assistant tab
  useEffect(() => {
    if (activeTab === 'assistant' && hasUnread) {
      clearUnread();
    }
  }, [activeTab, hasUnread, clearUnread]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue('');
    sendMessage(text, items);
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

  const handleAddOutfitToCart = (outfitItems: { product_id: string }[]) => {
    for (const item of outfitItems) {
      handleAddToCart(item.product_id);
    }
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
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-card border-l border-border flex flex-col"
          >
            {/* Header with tabs */}
            <div className="border-b border-border">
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
                  STYLE ASSISTANT
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
                            <div className="flex items-center justify-between mt-1.5">
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
                          <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                            <button
                              onClick={() => handleAskAbout(item.title)}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-display tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
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
                              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-display tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                            >
                              <Layers className="w-2.5 h-2.5" />
                              PAIRS
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* Cart footer */}
                  {items.length > 0 && (
                    <div className="border-t border-border p-4 space-y-3">
                      <div className="flex justify-between font-display">
                        <span className="text-muted-foreground tracking-wide text-xs">SUBTOTAL</span>
                        <span className="text-base font-semibold">${subtotal.toFixed(0)}</span>
                      </div>
                      <button className="w-full py-2.5 bg-primary text-primary-foreground font-display font-semibold tracking-wider text-xs rounded-lg hover:opacity-90 transition-opacity">
                        CHECKOUT
                      </button>
                      <button onClick={closeCart} className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Continue Shopping
                      </button>
                    </div>
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
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px] whitespace-pre-line">
                          {emptyAssistantMessage}
                        </p>
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
                              <p className="text-xs">{msg.content}</p>
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

                  {/* Prompt chips */}
                  {messages.length === 0 && !isLoading && (
                    <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                      {PROMPT_CHIPS.map(chip => (
                        <button
                          key={chip}
                          onClick={() => {
                            setInputValue('');
                            sendMessage(chip, items);
                          }}
                          className="px-2.5 py-1 text-[10px] font-display tracking-wider text-muted-foreground border border-border/50 rounded-full hover:text-foreground hover:border-border transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Chat input */}
                  <div className="border-t border-border p-3">
                    <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
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
                        placeholder="Ask about products, pairings, outfits..."
                        className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                        disabled={isLoading}
                      />
                      <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
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
