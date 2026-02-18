import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Layers } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useStyleKit } from '@/contexts/StyleKitContext';
import { DEMO_PRODUCTS } from '@/data/demo-data';

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, itemCount, subtotal } = useCart();
  const { openStyleKit } = useStyleKit();

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
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-display text-lg font-semibold tracking-wide">
                CART ({itemCount})
              </h2>
              <button onClick={closeCart} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ShoppingBag className="w-12 h-12 mb-4 opacity-30" />
                  <p className="font-display tracking-wide">YOUR CART IS EMPTY</p>
                  <button onClick={closeCart} className="mt-4 text-sm text-accent hover:underline">
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
                    className="flex gap-4 p-4 bg-secondary/50 rounded-lg relative"
                  >
                    <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs font-display">
                      IMG
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.variantTitle}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded border border-border hover:bg-muted transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded border border-border hover:bg-muted transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-display text-sm">${(item.price * item.quantity).toFixed(0)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="self-start p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {/* Find Pairs button */}
                    <button
                      onClick={() => {
                        const product = DEMO_PRODUCTS.find(p => p.id === item.productId);
                        if (product) {
                          closeCart();
                          openStyleKit(product);
                        }
                      }}
                      className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 text-[9px] font-display tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                    >
                      <Layers className="w-3 h-3" />
                      FIND PAIRS
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border p-6 space-y-4">
                <div className="flex justify-between font-display">
                  <span className="text-muted-foreground tracking-wide text-sm">SUBTOTAL</span>
                  <span className="text-lg font-semibold">${subtotal.toFixed(0)}</span>
                </div>
                <button className="w-full py-3 bg-primary text-primary-foreground font-display font-semibold tracking-wider text-sm rounded-lg hover:opacity-90 transition-opacity">
                  CHECKOUT
                </button>
                <button onClick={closeCart} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
