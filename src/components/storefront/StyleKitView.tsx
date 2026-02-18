import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, ArrowLeftRight, ChevronLeft, ChevronRight, Layers, Copy } from 'lucide-react';
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

  const scroll = (dir: number) => {
    if (!scrollRef.current) return;
    const amount = direction === 'horizontal' ? 260 : 320;
    scrollRef.current.scrollBy({
      [direction === 'horizontal' ? 'left' : 'top']: amount * dir,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Scroll buttons */}
      <button
        onClick={() => scroll(-1)}
        className={`absolute z-10 p-2 bg-card/80 backdrop-blur-sm border border-border rounded-full hover:bg-secondary transition-colors ${
          direction === 'horizontal'
            ? 'left-2 top-1/2 -translate-y-1/2'
            : 'top-2 left-1/2 -translate-x-1/2 rotate-90'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => scroll(1)}
        className={`absolute z-10 p-2 bg-card/80 backdrop-blur-sm border border-border rounded-full hover:bg-secondary transition-colors ${
          direction === 'horizontal'
            ? 'right-2 top-1/2 -translate-y-1/2'
            : 'bottom-2 left-1/2 -translate-x-1/2 rotate-90'
        }`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Scrollable area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto no-scrollbar p-4 gap-3 flex flex-row items-start"
      >
        {products.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex-shrink-0 bg-card border border-border rounded-lg overflow-hidden group cursor-pointer ${
              direction === 'horizontal' ? 'w-[160px]' : 'w-[160px]'
            }`}
            onClick={() => onSelect(product)}
          >
            {/* Square image placeholder */}
            <div
              className="aspect-square bg-secondary/50 flex items-center justify-center w-full"
            >
              <span className="font-display text-muted-foreground/20 text-[10px] tracking-widest">
                {product.category.toUpperCase()}
              </span>
            </div>

            {/* Info */}
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
                ADD TO LOOK
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

  if (!anchorProduct) return null;

  const lookTotal = lookItems.reduce((sum, p) => sum + p.price, 0);

  return (
    <div
      className={`flex flex-col bg-card/50 backdrop-blur-sm border-border ${
        direction === 'horizontal' ? 'border-b' : 'border-r'
      }`}
    >
      {/* Anchor product display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        {/* Image placeholder */}
        <div className="w-full max-w-[280px] aspect-square bg-secondary/30 rounded-lg flex items-center justify-center">
          <span className="font-display text-muted-foreground/15 text-sm tracking-[0.3em]">
            {anchorProduct.category.toUpperCase()}
          </span>
        </div>

        <div className="text-center">
          <h3 className="font-display text-sm font-bold tracking-wide">{anchorProduct.title}</h3>
          <span className="font-display text-sm text-muted-foreground">${anchorProduct.price}</span>
        </div>
      </div>

      {/* Look items stacked */}
      {lookItems.length > 1 && (
        <div className="px-4 pb-2">
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
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
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
              <div className="h-1/2">
                <AnchorPanel direction="horizontal" />
              </div>
              <div className="h-1/2 flex flex-col">
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
              <div className="h-1/2 flex flex-col">
                <CarouselRow
                  products={suggestions}
                  onSelect={setPreviewProduct}
                  onAddToLook={handleAddToLook}
                  direction="horizontal"
                />
              </div>
              <div className="h-1/2">
                <AnchorPanel direction="horizontal" />
              </div>
            </>
          )}

          {splitDirection === 'vertical' && (
            <>
              <div className="w-1/2">
                <AnchorPanel direction="vertical" />
              </div>
              <div className="w-1/2 flex flex-col">
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
