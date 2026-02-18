import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, ArrowLeftRight, Layers, Copy } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useStyleKit } from '@/contexts/StyleKitContext';
import { useCart } from '@/contexts/CartContext';
import { getSuggestedProducts, getSmartOrientation } from '@/lib/pairing-logic';
import type { DemoProduct } from '@/data/demo-data';

function CarouselRow({
  products,
  onSelect,
  onAddToLook,
  direction,
}: {
  products: DemoProduct[];
  onSelect: (p: DemoProduct) => void;
  onAddToLook: (p: DemoProduct) => void;
  direction: 'horizontal' | 'vertical';
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHorizontal = direction === 'horizontal';

  // Triple the products for infinite loop illusion
  const loopedProducts = products.length > 0
    ? [...products, ...products, ...products]
    : [];

  // Center on middle set on mount
  useEffect(() => {
    if (!scrollRef.current || products.length === 0) return;
    const el = scrollRef.current;
    // Jump to middle third without animation
    requestAnimationFrame(() => {
      if (isHorizontal) {
        el.scrollLeft = el.scrollWidth / 3;
      } else {
        el.scrollTop = el.scrollHeight / 3;
      }
    });
  }, [products.length, isHorizontal]);

  // Infinite loop: when scroll nears edges, jump to middle set
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || products.length === 0) return;
    const third = isHorizontal ? el.scrollWidth / 3 : el.scrollHeight / 3;
    const pos = isHorizontal ? el.scrollLeft : el.scrollTop;
    const max = isHorizontal ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
    if (pos < third * 0.25) {
      if (isHorizontal) el.scrollLeft += third;
      else el.scrollTop += third;
    } else if (pos > max - third * 0.25) {
      if (isHorizontal) el.scrollLeft -= third;
      else el.scrollTop -= third;
    }
  }, [products.length, isHorizontal]);

  return (
    <div className="relative h-full w-full flex flex-col min-h-0 min-w-0 overflow-hidden">
      {/* Edge fade indicators */}
      {isHorizontal ? (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
        </>
      )}

      {/* Scrollable area with native touch swiping */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`h-full w-full no-scrollbar p-4 gap-3 flex items-start ${
          isHorizontal
            ? 'flex-row overflow-x-scroll overflow-y-hidden'
            : 'flex-col overflow-y-scroll overflow-x-hidden'
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: isHorizontal ? 'pan-x' : 'pan-y',
        }}
      >
        {loopedProducts.map((product, idx) => (
          <motion.div
            key={`${product.id}-${idx}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-shrink-0 liquid-glass rounded-lg overflow-hidden group cursor-pointer w-[200px]"
            onClick={() => onSelect(product)}
          >
            <div className="aspect-square bg-secondary/50 flex items-center justify-center w-full">
              <span className="font-display text-muted-foreground/20 text-[10px] tracking-widest">
                {product.category.toUpperCase()}
              </span>
            </div>
            <div className="p-3 flex flex-col justify-between flex-1">
              <div>
                <p className="font-display text-xs font-medium tracking-wide truncate">
                  {product.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-display">${product.price}</span>
                  {product.compare_at_price && (
                    <span className="text-[10px] text-muted-foreground line-through">
                      ${product.compare_at_price}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToLook(product);
                }}
                className="mt-2 w-full py-1.5 bg-primary text-primary-foreground text-[10px] font-display font-semibold tracking-wider rounded flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3 h-3" />
                ADD
              </button>
            </div>
          </motion.div>
        ))}

        {products.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-display tracking-wider">
            NO SUGGESTIONS FOUND
          </div>
        )}
      </div>
    </div>
  );
}

function AnchorPanel({
  direction,
}: {
  direction: 'horizontal' | 'vertical';
}) {
  const { anchorProduct, lookItems, closeStyleKit, changeAnchor, removeFromLook } = useStyleKit();
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Reset size when anchor changes
  useEffect(() => {
    setSelectedSize(null);
  }, [anchorProduct?.id]);

  if (!anchorProduct) return null;

  const lookTotal = lookItems.reduce((sum, p) => sum + p.price, 0);
  const sizes = anchorProduct.variants.map(v => v.title);
  const selectedVariant = anchorProduct.variants.find(v => v.title === selectedSize);

  return (
    <div
      className={`flex flex-col bg-card/50 backdrop-blur-sm border-border overflow-y-auto ${
        direction === 'horizontal' ? 'border-b' : 'border-r'
      }`}
    >
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-6">
        {/* Image placeholder */}
        <div className="w-full md:w-1/2 max-w-[320px] aspect-square bg-secondary/30 rounded-lg flex items-center justify-center flex-shrink-0 mx-auto md:mx-0">
          <span className="font-display text-muted-foreground/15 text-sm tracking-[0.3em]">
            {anchorProduct.category.toUpperCase()}
          </span>
        </div>

        {/* Product details */}
        <div className="flex-1 flex flex-col justify-center gap-3 min-w-0">
          <div>
            <h3 className="font-display text-base font-bold tracking-wide">{anchorProduct.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display text-sm text-muted-foreground">${anchorProduct.price}</span>
              {anchorProduct.compare_at_price && (
                <span className="text-xs text-muted-foreground/60 line-through">
                  ${anchorProduct.compare_at_price}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {anchorProduct.description}
          </p>

          {/* Size selector */}
          {sizes.length > 1 && (
            <div>
              <p className="text-[10px] font-display tracking-widest text-muted-foreground mb-2">SIZE</p>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map(size => {
                  const variant = anchorProduct.variants.find(v => v.title === size);
                  const outOfStock = variant && variant.inventory_count === 0;
                  return (
                    <button
                      key={size}
                      disabled={outOfStock}
                      onClick={() => setSelectedSize(size === selectedSize ? null : size)}
                      className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded border transition-colors ${
                        size === selectedSize
                          ? 'bg-primary text-primary-foreground border-primary'
                          : outOfStock
                            ? 'border-border/30 text-muted-foreground/30 cursor-not-allowed'
                            : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {selectedVariant && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {selectedVariant.inventory_count} in stock
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Look items stacked */}
      {lookItems.length > 1 && (
        <div className="px-6 pb-2">
          <p className="text-[10px] font-display tracking-widest text-muted-foreground mb-2">YOUR LOOK</p>
          <div className="flex flex-wrap gap-2">
            {lookItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1.5 bg-secondary/50 rounded px-2 py-1 text-[10px] font-display"
              >
                <span className="truncate max-w-[80px]">{item.title}</span>
                <span className="text-muted-foreground">${item.price}</span>
                {item.id !== anchorProduct.id && (
                  <button
                    onClick={() => removeFromLook(item.id)}
                    className="text-muted-foreground hover:text-destructive ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Look total */}
      <div className="px-6 py-3 border-t border-border flex items-center justify-between">
        <span className="text-[10px] font-display tracking-widest text-muted-foreground">
          LOOK TOTAL
        </span>
        <span className="font-display text-sm font-bold">${lookTotal}</span>
      </div>
    </div>
  );
}

export function StyleKitView() {
  const { isOpen, anchorProduct, mode, setMode, closeStyleKit, addToLook, lookItems } = useStyleKit();
  const { items: cartItems, addItem } = useCart();
  const [previewProduct, setPreviewProduct] = useState<DemoProduct | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeStyleKit();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, closeStyleKit]);

  if (!isOpen || !anchorProduct) return null;

  const orientation = getSmartOrientation(anchorProduct.category);
  const isCounterparts = mode === 'counterparts';

  // For counterparts: horizontal split (top/bottom based on smart orientation)
  // For extras: vertical split (left/right)
  const splitDirection = isCounterparts ? 'horizontal' : 'vertical';
  const carouselDirection = isCounterparts ? 'horizontal' : 'vertical';

  const suggestions = getSuggestedProducts({
    anchor: anchorProduct,
    mode,
    cartProductIds: cartItems.map((i) => i.productId),
    lookProductIds: lookItems.map((p) => p.id),
  });

  const handleAddToLook = (product: DemoProduct) => {
    addToLook(product);
    // Also add to cart
    const v = product.variants[0];
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

  const contextLabel = isCounterparts
    ? `Goes well with ${anchorProduct.title}`
    : `More like ${anchorProduct.title}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-35 bg-background flex flex-col"
        style={{ zIndex: 35 }}
      >
        {/* Top bar */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-display text-xs font-bold tracking-[0.15em]">STYLE KIT</span>
            <span className="text-[10px] text-muted-foreground font-display tracking-wider">
              {contextLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex items-center bg-secondary rounded-md p-0.5">
              <button
                onClick={() => setMode('counterparts')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-display tracking-wider transition-colors ${
                  mode === 'counterparts'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="w-3 h-3" />
                PAIRS
              </button>
              <button
                onClick={() => setMode('extras')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-display tracking-wider transition-colors ${
                  mode === 'extras'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Copy className="w-3 h-3" />
                EXTRAS
              </button>
            </div>

            <button
              onClick={closeStyleKit}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split screen content */}
        <div
          className={`flex-1 flex overflow-hidden ${
            splitDirection === 'horizontal' ? 'flex-col' : 'flex-row'
          }`}
        >
          {/* Anchor panel position depends on smart orientation */}
          {splitDirection === 'horizontal' && orientation === 'top' && (
            <>
              <div className="h-1/2 overflow-hidden">
                <AnchorPanel direction="horizontal" />
              </div>
              <div className="h-1/2 overflow-hidden">
                <CarouselRow
                  products={suggestions}
                  onSelect={setPreviewProduct}
                  onAddToLook={handleAddToLook}
                  direction="horizontal"
                />
              </div>
            </>
          )}

          {splitDirection === 'horizontal' && orientation === 'bottom' && (
            <>
              <div className="h-1/2 overflow-hidden">
                <CarouselRow
                  products={suggestions}
                  onSelect={setPreviewProduct}
                  onAddToLook={handleAddToLook}
                  direction="horizontal"
                />
              </div>
              <div className="h-1/2 overflow-hidden">
                <AnchorPanel direction="horizontal" />
              </div>
            </>
          )}

          {splitDirection === 'vertical' && (
            <>
              <div className="w-1/2 overflow-hidden">
                <AnchorPanel direction="vertical" />
              </div>
              <div className="w-1/2 overflow-hidden">
                <CarouselRow
                  products={suggestions}
                  onSelect={setPreviewProduct}
                  onAddToLook={handleAddToLook}
                  direction="vertical"
                />
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
