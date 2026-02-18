import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, ArrowLeftRight, Layers, Copy, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check } from 'lucide-react';
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
  cardSize = 'default',
}: {
  products: DemoProduct[];
  onSelect: (p: DemoProduct) => void;
  onAddToLook: (p: DemoProduct) => void;
  direction: 'horizontal' | 'vertical';
  cardSize?: 'default' | 'large';
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHorizontal = direction === 'horizontal';

  const isDragging = useRef(false);
  const dragStartPos = useRef(0);
  const scrollStartPos = useRef(0);
  const hasDragged = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Don't capture pointer if the user clicked a button (ADD, etc.)
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStartPos.current = isHorizontal ? e.clientX : e.clientY;
    scrollStartPos.current = isHorizontal
      ? scrollRef.current?.scrollLeft ?? 0
      : scrollRef.current?.scrollTop ?? 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const pos = isHorizontal ? e.clientX : e.clientY;
    const delta = dragStartPos.current - pos;
    if (Math.abs(delta) > 3) hasDragged.current = true;
    if (isHorizontal) {
      scrollRef.current.scrollLeft = scrollStartPos.current + delta;
    } else {
      scrollRef.current.scrollTop = scrollStartPos.current + delta;
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const loopedProducts = products.length > 0
    ? [...products, ...products, ...products]
    : [];

  useEffect(() => {
    if (!scrollRef.current || products.length === 0) return;
    const el = scrollRef.current;
    requestAnimationFrame(() => {
      if (isHorizontal) {
        el.scrollLeft = el.scrollWidth / 3;
      } else {
        el.scrollTop = el.scrollHeight / 3;
      }
    });
  }, [products.length, isHorizontal]);

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

  // In vertical (EXTRAS) mode, cards should fill the width; in horizontal (PAIRS) use fixed widths
  const cardWidthClass = isHorizontal
    ? (cardSize === 'large' ? 'w-[350px]' : 'w-[240px]')
    : 'w-full';

  const scrollBy = (amount: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      [isHorizontal ? 'left' : 'top']: amount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative h-full w-full min-h-0 min-w-0">
      {isHorizontal ? (
        <>
          <button
            onClick={() => scrollBy(-300)}
            className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background via-background/60 to-transparent z-10 flex items-center justify-start pl-3 cursor-pointer hover:from-background/95 transition-colors"
          >
            <motion.div animate={{ x: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
              <ChevronLeft className="w-8 h-8 text-muted-foreground/60" />
            </motion.div>
          </button>
          <button
            onClick={() => scrollBy(300)}
            className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background via-background/60 to-transparent z-10 flex items-center justify-end pr-3 cursor-pointer hover:from-background/95 transition-colors"
          >
            <motion.div animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
              <ChevronRight className="w-8 h-8 text-muted-foreground/60" />
            </motion.div>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => scrollBy(-300)}
            className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background via-background/60 to-transparent z-10 flex items-start justify-center pt-3 cursor-pointer hover:from-background/95 transition-colors"
          >
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
              <ChevronUp className="w-8 h-8 text-muted-foreground/60" />
            </motion.div>
          </button>
          <button
            onClick={() => scrollBy(300)}
            className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background via-background/60 to-transparent z-10 flex items-end justify-center pb-3 cursor-pointer hover:from-background/95 transition-colors"
          >
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
              <ChevronDown className="w-8 h-8 text-muted-foreground/60" />
            </motion.div>
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`absolute inset-0 no-scrollbar gap-3 flex items-start cursor-grab active:cursor-grabbing select-none ${
          isHorizontal
            ? 'flex-row overflow-x-auto overflow-y-hidden p-4'
            : 'flex-col overflow-y-auto overflow-x-hidden px-2 py-3'
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: isHorizontal ? 'pan-x' : 'pan-y',
          overscrollBehavior: 'contain',
        }}
      >
        {loopedProducts.map((product, idx) => (
          <motion.div
            key={`${product.id}-${idx}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex-shrink-0 liquid-glass rounded-lg overflow-hidden group cursor-pointer ${cardWidthClass}`}
            onClick={() => { if (!hasDragged.current) onSelect(product); }}
          >
            <div className={`${cardSize === 'large' ? 'aspect-square' : 'aspect-[4/5]'} bg-secondary/50 flex items-center justify-center w-full`}>
              <span className="font-display text-muted-foreground/20 text-[10px] tracking-widest">
                {product.category.toUpperCase()}
              </span>
            </div>
            <div className="p-3 flex flex-col justify-between flex-1">
              <div>
                <p className={`font-display font-medium tracking-wide truncate ${cardSize === 'large' ? 'text-sm' : 'text-xs'}`}>
                  {product.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`font-display ${cardSize === 'large' ? 'text-sm' : 'text-xs'}`}>${product.price}</span>
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

function ProductDetails({ anchorProduct, sizes, selectedSize, setSelectedSize, selectedVariant }: {
  anchorProduct: DemoProduct;
  sizes: string[];
  selectedSize: string | null;
  setSelectedSize: (s: string | null) => void;
  selectedVariant: DemoProduct['variants'][0] | undefined;
}) {
  return (
    <div className="flex flex-col gap-3">
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
                  onClick={(e) => { e.stopPropagation(); setSelectedSize(size === selectedSize ? null : size); }}
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
  );
}

/** Locked pair panel — shows the paired product in the same layout as the anchor */
function LockedPairPanel({
  product,
  selectedSize,
  setSelectedSize,
  onRemove,
}: {
  product: DemoProduct;
  selectedSize: string | null;
  setSelectedSize: (s: string | null) => void;
  onRemove: () => void;
}) {
  const sizes = product.variants.map(v => v.title);
  const selectedVariant = product.variants.find(v => v.title === selectedSize);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex flex-col bg-card/50 backdrop-blur-sm border-t border-border h-full"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Thumbnail */}
        <div className="h-full aspect-[3/4] bg-secondary/30 flex items-center justify-center flex-shrink-0 relative">
          <span className="font-display text-muted-foreground/15 text-sm tracking-[0.3em]">
            {product.category.toUpperCase()}
          </span>
          {/* Remove button */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-2 right-2 p-1.5 bg-background/60 backdrop-blur-sm rounded-full hover:bg-destructive/20 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        {/* Details */}
        <div className="flex-1 flex flex-col p-5 overflow-y-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-display tracking-widest text-primary">PAIRED ITEM</span>
          </div>
          <ProductDetails
            anchorProduct={product}
            sizes={sizes}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            selectedVariant={selectedVariant}
          />
        </div>
      </div>
    </motion.div>
  );
}

function AnchorPanel({
  direction,
  selectedSize,
  setSelectedSize,
}: {
  direction: 'horizontal' | 'vertical';
  selectedSize: string | null;
  setSelectedSize: (s: string | null) => void;
}) {
  const { anchorProduct, lookItems, closeStyleKit, changeAnchor, removeFromLook } = useStyleKit();

  if (!anchorProduct) return null;

  const lookTotal = lookItems.reduce((sum, p) => sum + p.price, 0);
  const sizes = anchorProduct.variants.map(v => v.title);
  const selectedVariant = anchorProduct.variants.find(v => v.title === selectedSize);

  // PAIRS mode: horizontal direction → thumbnail LEFT, details RIGHT
  if (direction === 'horizontal') {
    return (
      <div className="flex flex-col bg-card/50 backdrop-blur-sm border-b border-border h-full">
        <div className="flex-1 flex flex-row overflow-hidden">
          <div className="h-full aspect-[3/4] bg-secondary/30 flex items-center justify-center flex-shrink-0">
            <span className="font-display text-muted-foreground/15 text-sm tracking-[0.3em]">
              {anchorProduct.category.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 flex flex-col p-5 overflow-y-auto">
            <ProductDetails
              anchorProduct={anchorProduct}
              sizes={sizes}
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
              selectedVariant={selectedVariant}
            />
          </div>
        </div>
      </div>
    );
  }

  // EXTRAS mode: vertical direction → very large tall thumbnail, details below
  return (
    <div className="flex flex-col bg-card/50 backdrop-blur-sm border-r border-border h-full overflow-y-auto">
      <div className="flex-1 flex flex-col p-4 gap-3">
        <div className="w-full aspect-[4/5] bg-secondary/30 rounded-lg flex items-center justify-center flex-shrink-0 max-h-[50%]">
          <span className="font-display text-muted-foreground/15 text-sm tracking-[0.3em]">
            {anchorProduct.category.toUpperCase()}
          </span>
        </div>
        <ProductDetails
          anchorProduct={anchorProduct}
          sizes={sizes}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
          selectedVariant={selectedVariant}
        />
      </div>
      {/* Look footer for extras mode */}
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
      <div className="px-4 py-3 border-t border-border flex items-center gap-2">
        <span className="text-[10px] font-display tracking-widest text-muted-foreground">LOOK TOTAL</span>
        <span className="font-display text-sm font-bold">${lookTotal}</span>
      </div>
    </div>
  );
}

export function StyleKitView() {
  const { isOpen, anchorProduct, mode, setMode, closeStyleKit, addToLook, removeFromLook, lookItems } = useStyleKit();
  const { items: cartItems, addItem } = useCart();
  const [previewProduct, setPreviewProduct] = useState<DemoProduct | null>(null);
  
  // Size selections: anchor + paired
  const [anchorSize, setAnchorSize] = useState<string | null>(null);
  const [pairedSize, setPairedSize] = useState<string | null>(null);

  // The locked paired product (non-anchor item in lookItems) — works for both modes
  const pairedProduct = lookItems.length > 1
    ? lookItems.find(p => p.id !== anchorProduct?.id) ?? null
    : null;

  // Reset sizes when anchor changes
  useEffect(() => {
    setAnchorSize(null);
    setPairedSize(null);
  }, [anchorProduct?.id]);

  // Reset paired size when paired product changes
  useEffect(() => {
    setPairedSize(null);
  }, [pairedProduct?.id]);

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
  const splitDirection = isCounterparts ? 'horizontal' : 'vertical';

  const suggestions = getSuggestedProducts({
    anchor: anchorProduct,
    mode,
    cartProductIds: cartItems.map((i) => i.productId),
    lookProductIds: lookItems.map((p) => p.id),
  });

  const handleAddToLook = (product: DemoProduct) => {
    // Only keep one paired product at a time in both modes
    lookItems.forEach(item => {
      if (item.id !== anchorProduct.id) {
        removeFromLook(item.id);
      }
    });
    addToLook(product);
  };

  const handleAddSetToCart = () => {
    // Add anchor product with selected size
    const anchorVariant = anchorSize
      ? anchorProduct.variants.find(v => v.title === anchorSize)
      : anchorProduct.variants[0];
    if (anchorVariant) {
      addItem({
        productId: anchorProduct.id,
        variantId: anchorVariant.id,
        title: anchorProduct.title,
        variantTitle: anchorVariant.title,
        price: anchorVariant.price ?? anchorProduct.price,
      });
    }

    // Add paired product with selected size
    if (pairedProduct) {
      const pairedVariant = pairedSize
        ? pairedProduct.variants.find(v => v.title === pairedSize)
        : pairedProduct.variants[0];
      if (pairedVariant) {
        addItem({
          productId: pairedProduct.id,
          variantId: pairedVariant.id,
          title: pairedProduct.title,
          variantTitle: pairedVariant.title,
          price: pairedVariant.price ?? pairedProduct.price,
        });
      }
    }

    closeStyleKit();
  };

  const handleRemovePaired = () => {
    if (pairedProduct) {
      removeFromLook(pairedProduct.id);
      setPairedSize(null);
    }
  };

  const contextLabel = isCounterparts
    ? `Goes well with ${anchorProduct.title}`
    : `More like ${anchorProduct.title}`;

  const setTotal = (anchorProduct?.price ?? 0) + (pairedProduct?.price ?? 0);

  // Check if both sizes are selected (or products only have 1 variant)
  const anchorSizeReady = anchorProduct.variants.length <= 1 || anchorSize !== null;
  const pairedSizeReady = !pairedProduct || pairedProduct.variants.length <= 1 || pairedSize !== null;
  const canAddSet = pairedProduct && anchorSizeReady && pairedSizeReady;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-35 bg-background flex flex-col"
        style={{ zIndex: 35 }}
        onWheel={(e) => e.stopPropagation()}
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
          {/* PAIRS MODE */}
          {splitDirection === 'horizontal' && orientation === 'top' && (
            <>
              <div className="h-1/2 min-h-0 overflow-y-auto">
                <AnchorPanel direction="horizontal" selectedSize={anchorSize} setSelectedSize={setAnchorSize} />
              </div>
              <div className="h-1/2 min-h-0 relative">
                <AnimatePresence mode="wait">
                  {pairedProduct ? (
                    <LockedPairPanel
                      key="locked"
                      product={pairedProduct}
                      selectedSize={pairedSize}
                      setSelectedSize={setPairedSize}
                      onRemove={handleRemovePaired}
                    />
                  ) : (
                    <CarouselRow
                      key="carousel"
                      products={suggestions}
                      onSelect={setPreviewProduct}
                      onAddToLook={handleAddToLook}
                      direction="horizontal"
                    />
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {splitDirection === 'horizontal' && orientation === 'bottom' && (
            <>
              <div className="h-1/2 min-h-0 relative">
                <AnimatePresence mode="wait">
                  {pairedProduct ? (
                    <LockedPairPanel
                      key="locked"
                      product={pairedProduct}
                      selectedSize={pairedSize}
                      setSelectedSize={setPairedSize}
                      onRemove={handleRemovePaired}
                    />
                  ) : (
                    <CarouselRow
                      key="carousel"
                      products={suggestions}
                      onSelect={setPreviewProduct}
                      onAddToLook={handleAddToLook}
                      direction="horizontal"
                    />
                  )}
                </AnimatePresence>
              </div>
              <div className="h-1/2 min-h-0 overflow-y-auto">
                <AnchorPanel direction="horizontal" selectedSize={anchorSize} setSelectedSize={setAnchorSize} />
              </div>
            </>
          )}

          {/* EXTRAS MODE */}
          {splitDirection === 'vertical' && (
            <>
              <div className="w-1/2 min-w-0 overflow-y-auto">
                <AnchorPanel direction="vertical" selectedSize={anchorSize} setSelectedSize={setAnchorSize} />
              </div>
              <div className="w-1/2 min-w-0 relative">
                <AnimatePresence mode="wait">
                  {pairedProduct ? (
                    <LockedPairPanel
                      key="locked"
                      product={pairedProduct}
                      selectedSize={pairedSize}
                      setSelectedSize={setPairedSize}
                      onRemove={handleRemovePaired}
                    />
                  ) : (
                    <CarouselRow
                      key="carousel"
                      products={suggestions}
                      onSelect={setPreviewProduct}
                      onAddToLook={handleAddToLook}
                      direction="vertical"
                      cardSize="large"
                    />
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {/* ADD SET TO CART — big floating button when a pair is locked */}
        <AnimatePresence>
          {pairedProduct && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="flex-shrink-0 border-t border-border bg-card/80 backdrop-blur-sm px-6 py-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${anchorSizeReady ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground">
                      {anchorProduct.title} {anchorSize ? `· ${anchorSize}` : '· Select size'}
                    </span>
                  </div>
                  <span className="text-muted-foreground/30">+</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${pairedSizeReady ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground">
                      {pairedProduct.title} {pairedSize ? `· ${pairedSize}` : '· Select size'}
                    </span>
                  </div>
                </div>
                <span className="font-display text-sm font-bold">${setTotal}</span>
              </div>
              <button
                onClick={handleAddSetToCart}
                disabled={!canAddSet}
                className={`w-full py-3.5 rounded-lg font-display text-sm font-bold tracking-[0.15em] flex items-center justify-center gap-2 transition-all ${
                  canAddSet
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                {canAddSet ? 'ADD SET TO CART' : 'SELECT SIZES TO CONTINUE'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
