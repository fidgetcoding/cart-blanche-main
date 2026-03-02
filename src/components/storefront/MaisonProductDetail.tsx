import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { DemoProduct } from '@/data/demo-data';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';

interface MaisonProductDetailProps {
  product: DemoProduct | null;
  products: DemoProduct[];
  allProducts: DemoProduct[];
  onClose: () => void;
  onNavigate: (product: DemoProduct) => void;
  onBuildSet: (product: DemoProduct) => void;
}

/* ── Infinite horizontal "You May Also Like" carousel ── */
function AlsoLikeCarousel({ product, allProducts, onNavigate, themeSettings }: {
  product: DemoProduct;
  allProducts: DemoProduct[];
  onNavigate: (p: DemoProduct) => void;
  themeSettings: any;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = allProducts.filter(p => p.id !== product.id);
  const tripled = [...items, ...items, ...items];
  const ITEM_W = 156; // 140 + 16 gap

  // Start at the middle copy
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;
    el.scrollLeft = items.length * ITEM_W;
  }, [product.id, items.length]);

  // Seamless wrap on scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;
    const section = items.length * ITEM_W;
    if (el.scrollLeft < section * 0.3) {
      el.scrollLeft += section;
    } else if (el.scrollLeft > section * 1.7) {
      el.scrollLeft -= section;
    }
  }, [items.length]);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  }, []);

  return (
    <div className="border-t border-border px-10 py-6 flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          YOU MAY ALSO LIKE
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); scroll('left'); }}
            onMouseEnter={(e) => { e.stopPropagation(); scroll('left'); }}
            className="p-1.5 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); scroll('right'); }}
            onMouseEnter={(e) => { e.stopPropagation(); scroll('right'); }}
            className="p-1.5 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {tripled.map((p, idx) => (
          <div
            key={`${p.id}-${idx}`}
            onClick={(e) => { e.stopPropagation(); onNavigate(p); }}
            className="flex-shrink-0 w-[140px] cursor-pointer group"
          >
            <div
              className="aspect-[3/4] overflow-hidden"
              style={{ backgroundColor: themeSettings.tileBgMode === 'transparent' ? 'transparent' : (themeSettings.mode === 'light' ? '#ececec' : '#151515') }}
            >
              <img
                src={p.images[0] || '/placeholder.svg'}
                alt={p.title}
                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                draggable={false}
              />
            </div>
            <p
              className="mt-2 text-[9px] tracking-[0.12em] uppercase truncate"
              style={{ fontFamily: 'var(--font-display)', color: themeSettings.displayFontColor || undefined }}
            >
              {p.title}
            </p>
            <p
              className="text-[9px] tracking-[0.08em] text-muted-foreground"
              style={{ fontFamily: 'var(--font-numeral)' }}
            >
              ${p.price}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main product detail ── */
export function MaisonProductDetail({ product, products, allProducts, onClose, onNavigate, onBuildSet }: MaisonProductDetailProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [currentVisibleImage, setCurrentVisibleImage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const { themeSettings } = useTheme();

  const images = product ? (product.images.length > 0 ? product.images : ['/placeholder.svg']) : ['/placeholder.svg'];

  // Reset on product change
  useEffect(() => {
    if (!product) return;
    setSelectedVariant(null);
    setCurrentVisibleImage(0);
  }, [product?.id]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!product) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [product, onClose]);

  // One scroll gesture = one image toggle (wrapping) with strict debounce
  const isScrolling = useRef(false);
  const accumulatedDelta = useRef(0);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToImage = useCallback((dir: 1 | -1) => {
    if (isScrolling.current) return;
    isScrolling.current = true;
    accumulatedDelta.current = 0;
    setCurrentVisibleImage(prev => {
      const next = prev + dir;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
    // Lock out for 800ms to absorb all inertia events from one gesture
    setTimeout(() => { isScrolling.current = false; accumulatedDelta.current = 0; }, 800);
  }, [images.length]);

  // Wheel handler: accumulate delta, trigger only once per gesture
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || images.length <= 1) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isScrolling.current) return; // completely ignore during cooldown

      accumulatedDelta.current += e.deltaY;

      // Clear previous timeout — wait for gesture to settle
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        const delta = accumulatedDelta.current;
        if (Math.abs(delta) > 20) {
          goToImage(delta > 0 ? 1 : -1);
        } else {
          accumulatedDelta.current = 0;
        }
      }, 50);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [goToImage, images.length]);

  if (!product) return null;

  const variant = product.variants.find(v => v.id === selectedVariant);
  const isOutOfStock = variant ? variant.inventory_count === 0 : product.variants.every(v => v.inventory_count === 0);

  const handleAddToCart = () => {
    const v = variant || product.variants[0];
    if (!v || isOutOfStock) return;
    addItem({
      productId: product.id,
      variantId: v.id,
      title: product.title,
      variantTitle: v.title,
      price: v.price ?? product.price,
      image: product.images[0],
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-1 overflow-hidden"
      onClick={onClose}
    >
      {/* LEFT COLUMN: Single-image display with scroll-to-toggle */}
      <div
        ref={scrollContainerRef}
        className="w-[55%] relative overflow-hidden flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        {/* Image counter — positioned along left edge */}
        {images.length > 1 && (
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center text-[11px] text-muted-foreground"
            style={{ fontFamily: 'var(--font-numeral)' }}
          >
            <span>{currentVisibleImage + 1}</span>
            <div className="w-px h-3 bg-foreground/30 my-1" />
            <span>{images.length}</span>
          </div>
        )}

        {/* Current image with crossfade */}
        <AnimatePresence mode="wait">
          <motion.img
            key={currentVisibleImage}
            src={images[currentVisibleImage]}
            alt={`${product.title} ${currentVisibleImage + 1}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full object-contain"
            draggable={false}
          />
        </AnimatePresence>
      </div>

      {/* RIGHT COLUMN: Info + carousel */}
      <div className="w-[45%] overflow-hidden border-l border-border flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Product info */}
        <div className="px-10 py-8 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {/* Category label */}
          <p
            className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {product.category.toUpperCase()}
          </p>

          {/* Title */}
          <h1
            className="tracking-[0.15em] uppercase mt-3"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'calc(var(--font-size-display) * 1.4)',
              color: themeSettings.displayFontColor || undefined,
            }}
          >
            {product.title}
          </h1>

          {/* Price */}
          <div className="flex items-center gap-3 mt-2">
            <p style={{
              fontFamily: 'var(--font-numeral)',
              fontSize: 'var(--font-size-numeral)',
              color: themeSettings.numeralFontColor || undefined,
            }}>
              ${product.price}
            </p>
            {product.compare_at_price && (
              <p className="line-through text-muted-foreground/50" style={{
                fontFamily: 'var(--font-numeral)',
                fontSize: 'var(--font-size-numeral)',
              }}>
                ${product.compare_at_price}
              </p>
            )}
          </div>

          {/* Size selector */}
          {product.variants.length > 1 && (
            <div className="mt-8">
              <p
                className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                SELECT SIZE
              </p>
              <div className="flex gap-2 flex-wrap">
                {product.variants.map(v => (
                  <button
                    key={v.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedVariant(v.id === selectedVariant ? null : v.id); }}
                    className={`px-4 py-2 text-[10px] tracking-[0.15em] uppercase border transition-colors ${
                      v.id === selectedVariant
                        ? 'bg-foreground text-background border-foreground'
                        : v.inventory_count === 0
                          ? 'border-border text-muted-foreground/30 line-through cursor-not-allowed'
                          : 'border-border text-foreground hover:border-foreground'
                    }`}
                    disabled={v.inventory_count === 0}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ADD TO CART — full width, solid bg */}
          <button
            onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}
            disabled={isOutOfStock}
            className={`w-full py-3.5 mt-8 text-[10px] tracking-[0.25em] uppercase transition-colors ${
              isOutOfStock
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-foreground text-background hover:bg-foreground/90'
            }`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {isOutOfStock ? 'JOIN THE WAITLIST' : 'ADD TO CART'}
          </button>

          {/* BUILD A SET — full width, outline */}
          <button
            onClick={(e) => { e.stopPropagation(); onBuildSet(product); }}
            className="w-full py-3.5 mt-3 border border-foreground text-foreground text-[10px] tracking-[0.25em] uppercase transition-colors hover:bg-foreground hover:text-background"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            BUILD A SET
          </button>

          {/* Description */}
          <p
            className="mt-8 text-[11px] leading-[1.8] tracking-wide text-muted-foreground uppercase"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {product.description}
          </p>

        </div>

        {/* Horizontal "You May Also Like" carousel */}
        <AlsoLikeCarousel
          product={product}
          allProducts={allProducts}
          onNavigate={onNavigate}
          themeSettings={themeSettings}
        />
      </div>
    </motion.div>
  );
}
