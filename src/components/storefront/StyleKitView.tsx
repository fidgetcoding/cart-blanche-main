import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, ArrowLeftRight, Layers, Copy, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useStyleKit } from '@/contexts/StyleKitContext';
import { useCart } from '@/contexts/CartContext';
import { getSuggestedProducts, getFillProducts, getSmartOrientation, getBodyZone, type ProductPreset } from '@/lib/pairing-logic';
import { supabase } from '@/lib/demo/client';
import type { DemoProduct } from '@/data/demo-data';
import { splitSentences } from '@/lib/format-description';

function CarouselCard({
  product,
  onSelect,
  onAddToLook,
  cardSize = 'default',
  hasDraggedRef,
}: {
  product: DemoProduct;
  onSelect: (p: DemoProduct) => void;
  onAddToLook: (p: DemoProduct) => void;
  cardSize?: 'default' | 'large';
  hasDraggedRef: React.MutableRefObject<boolean>;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const hasImages = product.images && product.images.length > 0;
  const hasMulti = product.images && product.images.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-shrink-0 liquid-glass rounded-lg overflow-hidden group cursor-pointer h-full flex flex-col"
      onClick={() => {
        if (hasDraggedRef.current) return;
        onSelect(product);
        onAddToLook(product);
      }}
    >
      <div className="aspect-square bg-secondary/50 flex items-center justify-center w-full relative overflow-hidden">
        {hasImages ? (
          <img
            src={product.images![Math.min(imgIdx, product.images!.length - 1)]?.thumb}
            alt={product.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="font-display text-muted-foreground/20 text-[10px] tracking-widest">
            {product.category.toUpperCase()}
          </span>
        )}
        {hasMulti && (
          <div className="absolute bottom-0 left-0 right-0 flex h-8 z-10 pointer-events-none">
            {product.images!.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                onMouseEnter={() => setImgIdx(i)}
                className="flex-1 relative group/dot pointer-events-auto"
              >
                <div className={`absolute bottom-1.5 left-0.5 right-0.5 h-0.5 rounded-full transition-all duration-200 ${
                  imgIdx === i ? 'bg-foreground/80' : 'bg-foreground/15 group-hover/dot:bg-foreground/30'
                }`} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col justify-between flex-1">
        <div>
          <p className={`font-display font-medium tracking-wide truncate text-foreground ${cardSize === 'large' ? 'text-sm' : 'text-xs'}`}>
            {product.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`font-display text-foreground ${cardSize === 'large' ? 'text-sm' : 'text-xs'}`}>${product.price}</span>
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
  );
}

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
    // Don't capture pointer if the user clicked an interactive control inside a card.
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, label')) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStartPos.current = isHorizontal ? e.clientX : e.clientY;
    scrollStartPos.current = isHorizontal
      ? scrollRef.current?.scrollLeft ?? 0
      : scrollRef.current?.scrollTop ?? 0;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const pos = isHorizontal ? e.clientX : e.clientY;
    const delta = dragStartPos.current - pos;
    if (Math.abs(delta) > 3) {
      if (!hasDragged.current) {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      }

      hasDragged.current = true;
    }
    if (isHorizontal) {
      scrollRef.current.scrollLeft = scrollStartPos.current + delta;
    } else {
      scrollRef.current.scrollTop = scrollStartPos.current + delta;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    if (!hasDragged.current) return;

    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, label')) return;

    window.setTimeout(() => {
      hasDragged.current = false;
    }, 0);
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
        className={`absolute inset-0 no-scrollbar gap-3 flex cursor-grab active:cursor-grabbing select-none ${
          isHorizontal
            ? 'flex-row overflow-x-auto overflow-y-hidden px-4 py-2 items-stretch'
            : 'flex-col overflow-y-auto overflow-x-hidden px-2 py-3 items-start'
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: isHorizontal ? 'pan-x' : 'pan-y',
          overscrollBehavior: 'contain',
        }}
      >
        {loopedProducts.map((product, idx) => (
          <div key={`${product.id}-${idx}`} className={`flex-shrink-0 ${cardWidthClass} ${isHorizontal ? 'h-full' : ''}`}>
            <CarouselCard
              product={product}
              onSelect={onSelect}
              onAddToLook={onAddToLook}
              cardSize={cardSize}
              hasDraggedRef={hasDragged}
            />
          </div>
        ))}

      </div>
    </div>
  );
}

/** Reusable thumbnail with image toggle indicators */
function ProductThumbnail({
  product,
  className,
  overlay,
}: {
  product: DemoProduct;
  className?: string;
  overlay?: React.ReactNode;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const hasImages = product.images && product.images.length > 0;
  const hasMulti = product.images && product.images.length > 1;

  return (
    <div className={`bg-secondary/30 flex items-center justify-center flex-shrink-0 relative overflow-hidden ${className ?? ''}`}>
      {hasImages ? (
        <img
          src={product.images![Math.min(imgIdx, product.images!.length - 1)]?.thumb}
          alt={product.title}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <span className="font-display text-muted-foreground/15 text-sm tracking-[0.3em]">
          {product.category.toUpperCase()}
        </span>
      )}
      {hasMulti && (
        <div className="absolute bottom-0 left-0 right-0 flex h-10 z-10" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
          {product.images!.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setImgIdx(i); }}
              onMouseEnter={() => setImgIdx(i)}
              className="flex-1 relative group/dot"
            >
              <div className={`absolute bottom-2 left-0.5 right-0.5 h-0.5 rounded-full transition-all duration-200 ${
                imgIdx === i ? 'bg-foreground/80' : 'bg-foreground/15 group-hover/dot:bg-foreground/30'
              }`} />
            </button>
          ))}
        </div>
      )}
      {overlay}
    </div>
  );
}

function ProductDetails({ anchorProduct, sizes, selectedSize, setSelectedSize, selectedVariant, label }: {
  anchorProduct: DemoProduct;
  sizes: string[];
  selectedSize: string | null;
  setSelectedSize: (s: string | null) => void;
  selectedVariant: DemoProduct['variants'][0] | undefined;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-center gap-2">
          {label && <span className="text-[10px] font-display tracking-widest text-primary">{label}</span>}
          <h3 className="font-display text-base font-bold tracking-wide text-foreground">{anchorProduct.title}</h3>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-display text-sm text-foreground">${anchorProduct.price}</span>
          {anchorProduct.compare_at_price && (
            <span className="text-xs text-muted-foreground/60 line-through">
              ${anchorProduct.compare_at_price}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-foreground/70 leading-relaxed">
        {splitSentences(anchorProduct.description).map((s, i) => (
          <span key={i} className="block">{s}</span>
        ))}
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
  direction = 'horizontal',
}: {
  product: DemoProduct;
  selectedSize: string | null;
  setSelectedSize: (s: string | null) => void;
  onRemove: () => void;
  direction?: 'horizontal' | 'vertical';
}) {
  const sizes = product.variants.map(v => v.title);
  const selectedVariant = product.variants.find(v => v.title === selectedSize);

  if (direction === 'vertical') {
    // EXTRAS mode: thumbnail on top, details below — mirrors anchor panel vertical layout
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="flex flex-col bg-card/50 backdrop-blur-sm border-l border-border h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex-1 flex flex-col p-4 gap-3">
          <ProductThumbnail
            product={product}
            className="w-full aspect-square rounded-lg"
            overlay={
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute top-2 right-2 p-1.5 bg-background/60 backdrop-blur-sm rounded-full hover:bg-destructive/20 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            }
          />
          <ProductDetails
            anchorProduct={product}
            sizes={sizes}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            selectedVariant={selectedVariant}
            label="PAIRED ITEM"
          />
        </div>
      </motion.div>
    );
  }

  // PAIRS mode: horizontal layout — thumbnail left, details right
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex flex-col bg-card/50 backdrop-blur-sm h-full"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex-1 flex flex-row overflow-hidden">
        <ProductThumbnail
          product={product}
          className="h-full aspect-[3/4]"
          overlay={
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="absolute top-2 right-2 p-1.5 bg-background/60 backdrop-blur-sm rounded-full hover:bg-destructive/20 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          }
        />
        <div className="flex-1 flex flex-col p-5 overflow-y-auto">
          <ProductDetails
            anchorProduct={product}
            sizes={sizes}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            selectedVariant={selectedVariant}
            label="PAIRED ITEM"
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
  onRemove,
}: {
  direction: 'horizontal' | 'vertical';
  selectedSize: string | null;
  setSelectedSize: (s: string | null) => void;
  onRemove?: () => void;
}) {
  const { anchorProduct, lookItems, closeStyleKit, changeAnchor, removeFromLook } = useStyleKit();

  if (!anchorProduct) return null;

  const lookTotal = lookItems.reduce((sum, p) => sum + p.price, 0);
  const sizes = anchorProduct.variants.map(v => v.title);
  const selectedVariant = anchorProduct.variants.find(v => v.title === selectedSize);

  // PAIRS mode: horizontal direction → thumbnail LEFT, details RIGHT
  if (direction === 'horizontal') {
    return (
      <div className="flex flex-col bg-card/50 backdrop-blur-sm h-full">
        <div className="flex-1 flex flex-row overflow-hidden">
          <ProductThumbnail
            product={anchorProduct}
            className="h-full aspect-[3/4]"
            overlay={onRemove ? (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute top-2 right-2 p-1.5 bg-background/60 backdrop-blur-sm rounded-full hover:bg-destructive/20 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            ) : undefined}
          />
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
        <ProductThumbnail
          product={anchorProduct}
          className="w-full aspect-square rounded-lg"
          overlay={onRemove ? (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="absolute top-2 right-2 p-1.5 bg-background/60 backdrop-blur-sm rounded-full hover:bg-destructive/20 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          ) : undefined}
        />
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
  const { isOpen, anchorProduct, mode, setMode, closeStyleKit, addToLook, removeFromLook, changeAnchor, replaceInLook, lookItems, initialAnchorSize, activeGenders } = useStyleKit();
  const { items: cartItems, addItem } = useCart();
  const [previewProduct, setPreviewProduct] = useState<DemoProduct | null>(null);
  const [presets, setPresets] = useState<ProductPreset[]>([]);
  
  // Zone-locked size selections: top slot + bottom slot
  const [topSize, setTopSize] = useState<string | null>(null);
  const [bottomSize, setBottomSize] = useState<string | null>(null);

  // Track which side the carousel should appear on in extras mode
  const [carouselSide, setCarouselSide] = useState<'left' | 'right'>('right');

  // Zone-locked slot assignments: tops always in top slot, bottoms always in bottom slot
  const topProduct = lookItems.find(p => getBodyZone(p) === 'top') ?? null;
  const bottomProduct = lookItems.find(p => getBodyZone(p) === 'bottom') ?? null;

  // For extras mode, the paired product is still the non-anchor item
  const pairedProduct = lookItems.length > 1
    ? lookItems.find(p => p.id !== anchorProduct?.id) ?? null
    : null;

  // Load presets from DB
  useEffect(() => {
    async function loadPresets() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('styling_guides')
        .select('rules')
        .eq('merchant_id', user.id)
        .limit(1)
        .maybeSingle();
      if (data?.rules && (data.rules as any).version === 2) {
        setPresets((data.rules as any).presets || []);
      }
    }
    loadPresets();
  }, []);

  // Initialize sizes based on anchor's zone
  useEffect(() => {
    if (anchorProduct) {
      const zone = getBodyZone(anchorProduct);
      if (zone === 'top') setTopSize(initialAnchorSize ?? null);
      else setBottomSize(initialAnchorSize ?? null);
    }
  }, [anchorProduct?.id, initialAnchorSize]);

  // Reset top size when top product changes
  useEffect(() => {
    if (!topProduct) setTopSize(null);
  }, [topProduct?.id]);

  // Reset bottom size when bottom product changes
  useEffect(() => {
    if (!bottomProduct) setBottomSize(null);
  }, [bottomProduct?.id]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeStyleKit();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, closeStyleKit]);

  if (!isOpen || !anchorProduct) return null;

  const isCounterparts = mode === 'counterparts';
  const splitDirection = isCounterparts ? 'horizontal' : 'vertical';

  // [DEBUG-CHIP] temporary diagnostic logging — remove after verifying
  console.log('[DEBUG-CHIP] StyleKitView getSuggestedProducts called', {
    anchorTitle: anchorProduct?.title,
    anchorGender: anchorProduct?.gender,
    mode,
    activeGenders,
    activeGendersIsArray: Array.isArray(activeGenders),
    activeGendersLength: activeGenders?.length,
  });
  const suggestions = getSuggestedProducts({
    anchor: anchorProduct,
    mode,
    cartProductIds: cartItems.map((i) => i.productId),
    lookProductIds: lookItems.map((p) => p.id),
    presets,
    activeGenders,
  });
  console.log('[DEBUG-CHIP] StyleKitView suggestions count:', suggestions.length,
    'first 5:', suggestions.slice(0, 5).map(p => `${p.title} (${p.gender})`));

  const cartProductIdsForFill = cartItems.map(i => i.productId);
  const lookProductIdsForFill = lookItems.map(p => p.id);

  const topLaneSuggestions = suggestions.filter(p => getBodyZone(p) === 'top' || getBodyZone(p) === 'accessory');
  const topLaneProducts = topLaneSuggestions.length > 0
    ? topLaneSuggestions
    : getFillProducts({
        anchor: anchorProduct,
        cartProductIds: cartProductIdsForFill,
        lookProductIds: lookProductIdsForFill,
        activeGenders,
        zone: 'top',
      });

  const bottomLaneSuggestions = suggestions.filter(p => getBodyZone(p) === 'bottom');
  const bottomLaneProducts = bottomLaneSuggestions.length > 0
    ? bottomLaneSuggestions
    : getFillProducts({
        anchor: anchorProduct,
        cartProductIds: cartProductIdsForFill,
        lookProductIds: lookProductIdsForFill,
        activeGenders,
        zone: 'bottom',
      });

  const extrasLaneProducts = suggestions.length > 0
    ? suggestions
    : getFillProducts({
        anchor: anchorProduct,
        cartProductIds: cartProductIdsForFill,
        lookProductIds: lookProductIdsForFill,
        activeGenders,
      });

  const handleRemoveProduct = (productId: string) => {
    const removedProduct = lookItems.find(p => p.id === productId);
    if (removedProduct) {
      const zone = getBodyZone(removedProduct);
      if (zone === 'top') setTopSize(null);
      else setBottomSize(null);
    }
    removeFromLook(productId);
    // If removing the anchor, promote remaining product
    if (productId === anchorProduct.id) {
      const remaining = lookItems.find(p => p.id !== productId);
      if (remaining) changeAnchor(remaining);
    }
  };

  const handleAddToLook = (product: DemoProduct) => {
    replaceInLook(product);
    setCarouselSide('right');
  };

  const handleAddSetToCart = () => {
    // Add every item in the look to cart — works for both PAIRS and EXTRAS
    lookItems.forEach(product => {
      const selectedSize = getBodyZone(product) === 'top' ? topSize : bottomSize;
      
      const variant = selectedSize
        ? product.variants.find(v => v.title === selectedSize)
        : product.variants[0];
      
      if (variant) {
        addItem({
          productId: product.id,
          variantId: variant.id,
          title: product.title,
          variantTitle: variant.title,
          price: variant.price ?? product.price,
          colorwayId: product.colorways?.[0]?.id,
          colorwayName: product.colorways?.[0]?.name,
        });
      }
    });
    closeStyleKit();
  };

  // Extras mode handlers (unchanged logic)
  const handleRemovePairedDirect = () => {
    if (pairedProduct) {
      removeFromLook(pairedProduct.id);
      setCarouselSide('right');
    }
  };

  const handleRemoveAnchorExtras = () => {
    if (pairedProduct) {
      removeFromLook(anchorProduct.id);
      changeAnchor(pairedProduct);
      setCarouselSide('left');
    }
  };

  const contextLabel = isCounterparts
    ? `Goes well with ${anchorProduct.title}`
    : `More like ${anchorProduct.title}`;

  const setTotal = (topProduct?.price ?? 0) + (bottomProduct?.price ?? 0);
  const bothFilled = topProduct && bottomProduct;
  const topSizeReady = !topProduct || topProduct.variants.length <= 1 || topSize !== null;
  const bottomSizeReady = !bottomProduct || bottomProduct.variants.length <= 1 || bottomSize !== null;
  const canAddSet = !!bothFilled;

  // For extras mode, use the old anchor/paired ready checks
  const extrasPairedSizeReady = !pairedProduct || pairedProduct.variants.length <= 1;
  const anchorZone = getBodyZone(anchorProduct);
  const anchorSizeForExtras = anchorZone === 'top' ? topSize : bottomSize;

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
            <span className="font-display text-xs font-bold tracking-[0.15em] text-foreground">STYLE KIT</span>
            <span className="text-[10px] text-foreground/60 font-display tracking-wider">
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
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Split screen content */}
        <div
          className={`flex-1 flex overflow-hidden ${
            splitDirection === 'horizontal' ? 'flex-col' : 'flex-row'
          }`}
        >
          {/* PAIRS MODE — zone-locked: top slot always first, bottom slot always second */}
          {splitDirection === 'horizontal' && (
            <>
              {/* TOP SLOT — always first */}
              <div className="h-1/2 min-h-0 relative overflow-y-auto">
                <AnimatePresence mode="wait">
                  {topProduct ? (
                    <LockedPairPanel
                      key={`top-${topProduct.id}`}
                      product={topProduct}
                      selectedSize={topSize}
                      setSelectedSize={setTopSize}
                      onRemove={() => handleRemoveProduct(topProduct.id)}
                    />
                  ) : (
                    <CarouselRow
                      key="carousel-top"
                      products={topLaneProducts}
                      onSelect={setPreviewProduct}
                      onAddToLook={handleAddToLook}
                      direction="horizontal"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* BOTTOM SLOT — always second */}
              <div className="h-1/2 min-h-0 relative overflow-y-auto border-t border-border">
                <AnimatePresence mode="wait">
                  {bottomProduct ? (
                    <LockedPairPanel
                      key={`bottom-${bottomProduct.id}`}
                      product={bottomProduct}
                      selectedSize={bottomSize}
                      setSelectedSize={setBottomSize}
                      onRemove={() => handleRemoveProduct(bottomProduct.id)}
                    />
                  ) : (
                    <CarouselRow
                      key="carousel-bottom"
                      products={bottomLaneProducts}
                      onSelect={setPreviewProduct}
                      onAddToLook={handleAddToLook}
                      direction="horizontal"
                    />
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {/* EXTRAS MODE */}
          {splitDirection === 'vertical' && (
            <>
              {/* Left side: anchor or carousel (if anchor was dismissed) */}
              <div className="w-1/2 min-w-0 relative overflow-y-auto">
                {carouselSide === 'left' && !pairedProduct ? (
                  <CarouselRow
                    key="carousel-left"
                    products={extrasLaneProducts}
                    onSelect={setPreviewProduct}
                    onAddToLook={handleAddToLook}
                    direction="vertical"
                    cardSize="large"
                  />
                ) : (
                  <AnchorPanel direction="vertical" selectedSize={anchorSizeForExtras} setSelectedSize={anchorZone === 'top' ? setTopSize : setBottomSize} onRemove={pairedProduct ? handleRemoveAnchorExtras : undefined} />
                )}
              </div>
              {/* Right side: paired/carousel (default) */}
              <div className="w-1/2 min-w-0 relative">
                <AnimatePresence mode="wait">
                  {pairedProduct ? (
                    <LockedPairPanel
                      key="locked"
                      product={pairedProduct}
                      selectedSize={getBodyZone(pairedProduct) === 'top' ? topSize : bottomSize}
                      setSelectedSize={getBodyZone(pairedProduct) === 'top' ? setTopSize : setBottomSize}
                      onRemove={handleRemovePairedDirect}
                      direction="vertical"
                    />
                  ) : carouselSide === 'right' ? (
                    <CarouselRow
                      key="carousel-right"
                      products={extrasLaneProducts}
                      onSelect={setPreviewProduct}
                      onAddToLook={handleAddToLook}
                      direction="vertical"
                      cardSize="large"
                    />
                  ) : (
                    <AnchorPanel direction="vertical" selectedSize={anchorSizeForExtras} setSelectedSize={anchorZone === 'top' ? setTopSize : setBottomSize} onRemove={undefined} />
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {/* ADD SET TO CART — floating footer when both slots are filled (PAIRS) or paired exists (EXTRAS) */}
        <AnimatePresence>
          {isCounterparts && bothFilled && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="flex-shrink-0 border-t border-border bg-card/80 backdrop-blur-sm px-6 py-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${topSizeReady ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground">
                      {topProduct!.title} {topSize ? `· ${topSize}` : '· Select size'}
                    </span>
                  </div>
                  <span className="text-muted-foreground/30">+</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${bottomSizeReady ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground">
                      {bottomProduct!.title} {bottomSize ? `· ${bottomSize}` : '· Select size'}
                    </span>
                  </div>
                </div>
                <span className="font-display text-sm font-bold">${setTotal}</span>
              </div>
              <button
                onClick={handleAddSetToCart}
                className="w-full py-3.5 rounded-lg font-display text-sm font-bold tracking-[0.15em] flex items-center justify-center gap-2 transition-all bg-primary text-primary-foreground hover:opacity-90"
              >
                <ShoppingBag className="w-4 h-4" />
                ADD SET TO CART
              </button>
            </motion.div>
          )}
          {!isCounterparts && pairedProduct && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="flex-shrink-0 border-t border-border bg-card/80 backdrop-blur-sm px-6 py-4"
            >
              <button
                onClick={handleAddSetToCart}
                className="w-full py-3.5 rounded-lg font-display text-sm font-bold tracking-[0.15em] flex items-center justify-center gap-2 transition-all bg-primary text-primary-foreground hover:opacity-90"
              >
                <ShoppingBag className="w-4 h-4" />
                ADD SET TO CART
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
