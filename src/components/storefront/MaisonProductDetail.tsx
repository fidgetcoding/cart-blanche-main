import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Ruler } from 'lucide-react';
import type { DemoProduct } from '@/data/demo-data';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SizeChartOverlay } from './SizeChartOverlay';
import { splitSentences } from '@/lib/format-description';
import { MaisonWaitlistModal } from './MaisonWaitlistModal';
import { getSwatchStyle } from '@/lib/swatch-style';

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
                src={p.images[0]?.thumb || '/placeholder.svg'}
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
  const [selectedColorwayId, setSelectedColorwayId] = useState<string | null>(
    product.colorways && product.colorways.length > 0 ? product.colorways[0].id : null
  );
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [currentVisibleImage, setCurrentVisibleImage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const { themeSettings } = useTheme();

  // Resolve the selected colorway object.
  const selectedColorway = product?.colorways?.find(c => c.id === selectedColorwayId) || null;
  // Filter product.images by colorway_id. Untagged images always show;
  // tagged images only show when their colorway is selected.
  const images = product
    ? product.images.filter(img =>
        !img.colorway_id || img.colorway_id === selectedColorwayId
      )
    : [];

  // Reset on product change
  useEffect(() => {
    if (!product) return;
    setSelectedVariant(null);
    setCurrentVisibleImage(0);
  }, [product?.id]);

  // Reset gallery to first image when colorway changes.
  useEffect(() => {
    setCurrentVisibleImage(0);
  }, [selectedColorwayId]);

  useEffect(() => {
    if (!selectedVariant) return;
    const current = product?.variants.find(v => v.id === selectedVariant);
    if (!current) { setSelectedVariant(null); return; }
    if (current.colorway_id && current.colorway_id !== selectedColorwayId) {
      const equivalent = product?.variants.find(
        v => v.title === current.title &&
             (!v.colorway_id || v.colorway_id === selectedColorwayId) &&
             v.inventory_count > 0
      );
      setSelectedVariant(equivalent ? equivalent.id : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColorwayId]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!product) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [product, onClose]);

  // Continuous drag/scroll offset for smooth sliding
  const offsetY = useRef(0); // current pixel offset into the virtual strip
  const [renderOffset, setRenderOffset] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const velocityRef = useRef(0);
  const lastDragY = useRef(0);
  const lastDragTime = useRef(0);

  // Container height — use state so re-render happens when measured
  const [containerHeight, setContainerHeight] = useState(0);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const measure = () => setContainerHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [product?.id]);

  // Snap to nearest image with momentum
  const snapTo = useCallback((targetIndex: number, animated = true) => {
    const h = containerHeight || 600;
    const targetOffset = targetIndex * h;
    if (!animated) {
      offsetY.current = targetOffset;
      setRenderOffset(targetOffset);
      setCurrentVisibleImage(targetIndex);
      return;
    }
    // Animate to target
    const start = offsetY.current;
    const dist = targetOffset - start;
    const duration = 250;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const current = start + dist * ease;
      offsetY.current = current;
      setRenderOffset(current);
      // Update visible image based on position
      const idx = Math.round(current / h) % images.length;
      setCurrentVisibleImage(idx < 0 ? idx + images.length : idx);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        offsetY.current = targetOffset;
        setRenderOffset(targetOffset);
      }
    };
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);
  }, [images.length, containerHeight]);

  const goToImage = useCallback((dir: 1 | -1) => {
    const h = containerHeight || 600;
    const currentIdx = Math.round(offsetY.current / h);
    snapTo(currentIdx + dir);
  }, [snapTo, containerHeight]);

  // Reset offset when product changes
  useEffect(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    offsetY.current = 0;
    setRenderOffset(0);
  }, [product?.id]);

  // Wheel handler: continuous scrolling
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || images.length <= 1) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isDragging.current) return;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const h = containerHeight || 600;
      offsetY.current += e.deltaY * 0.8;
      setRenderOffset(offsetY.current);
      const idx = Math.round(offsetY.current / h) % images.length;
      setCurrentVisibleImage(idx < 0 ? idx + images.length : idx);
    };
    // Snap on wheel end (debounce)
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;
    const onWheelWithSnap = (e: WheelEvent) => {
      onWheel(e);
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        const h = containerHeight || 600;
        const nearest = Math.round(offsetY.current / h);
        snapTo(nearest);
      }, 120);
    };
    el.addEventListener('wheel', onWheelWithSnap, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheelWithSnap);
      if (wheelTimer) clearTimeout(wheelTimer);
    };
  }, [images.length, snapTo]);

  // Mouse drag handlers
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || images.length <= 1) return;

    const onMouseDown = (e: MouseEvent) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      isDragging.current = true;
      dragStartY.current = e.clientY;
      dragStartOffset.current = offsetY.current;
      lastDragY.current = e.clientY;
      lastDragTime.current = performance.now();
      velocityRef.current = 0;
      el.style.cursor = 'grabbing';
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dy = e.clientY - dragStartY.current;
      const now = performance.now();
      const dt = now - lastDragTime.current;
      if (dt > 0) {
        velocityRef.current = (e.clientY - lastDragY.current) / dt;
      }
      lastDragY.current = e.clientY;
      lastDragTime.current = now;
      offsetY.current = dragStartOffset.current - dy;
      setRenderOffset(offsetY.current);
      const h = containerHeight || 600;
      const idx = Math.round(offsetY.current / h) % images.length;
      setCurrentVisibleImage(idx < 0 ? idx + images.length : idx);
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      el.style.cursor = '';
      const h = containerHeight || 600;
      // Use velocity to determine target
      const momentum = -velocityRef.current * 150; // project forward
      const projected = offsetY.current + momentum;
      const nearest = Math.round(projected / h);
      snapTo(nearest);
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [images.length, snapTo]);

  // Compute which images to render (virtual strip with wrapping)
  const h = containerHeight || 600;
  const visibleImages = (() => {
    if (images.length === 0) return [];
    const result: { img: typeof images[0]; index: number; yPos: number }[] = [];
    // Show enough images to cover viewport + buffer
    const buffer = 2;
    const centerIdx = Math.floor(renderOffset / (h || 1));
    for (let i = centerIdx - buffer; i <= centerIdx + buffer; i++) {
      const wrappedIdx = ((i % images.length) + images.length) % images.length;
      result.push({
        img: images[wrappedIdx],
        index: i,
        yPos: i * h - renderOffset,
      });
    }
    return result;
  })();

  if (!product) return null;

  const variant = product.variants.find(v => v.id === selectedVariant);
  const isOutOfStock = variant ? variant.inventory_count === 0 : product.variants.every(v => v.inventory_count === 0);
  const isWholeProductOutOfStock = product.variants.every(v => v.inventory_count === 0);

  const availableVariants = product.variants.filter(
    v => !v.colorway_id || v.colorway_id === selectedColorwayId
  );
  const isCurrentColorwayOutOfStock = availableVariants.length > 0 &&
    availableVariants.every(v => v.inventory_count === 0);



  const handleAddToCart = () => {
    const v = variant || product.variants[0];
    if (!v || isOutOfStock) return;
    addItem({
      productId: product.id,
      variantId: v.id,
      title: product.title,
      variantTitle: v.title,
      price: v.price ?? product.price,
      image: images[0]?.thumb,
      colorwayId: selectedColorway?.id,
      colorwayName: selectedColorway?.name,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-1 overflow-hidden relative"
      onClick={onClose}
    >
      {/* Close button — top-right corner */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-50 p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close product detail"
      >
        <X className="w-6 h-6" strokeWidth={1.5} />
      </button>
      {/* LEFT COLUMN: Single-image display with scroll-to-toggle */}
      <div
        ref={scrollContainerRef}
        className="w-[55%] relative overflow-hidden flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        {/* Image counter + up/down arrows — positioned along left edge */}
        {images.length > 1 && (
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1"
            style={{ fontFamily: 'var(--font-numeral)' }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); goToImage(-1); }}
              onMouseEnter={(e) => { e.stopPropagation(); goToImage(-1); }}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 rotate-90" strokeWidth={1.5} />
            </button>
            <span className="text-[11px] text-muted-foreground">{currentVisibleImage + 1}</span>
            <div className="w-px h-2 bg-foreground/30" />
            <span className="text-[11px] text-muted-foreground">{images.length}</span>
            <button
              onClick={(e) => { e.stopPropagation(); goToImage(1); }}
              onMouseEnter={(e) => { e.stopPropagation(); goToImage(1); }}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-90" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Sliding image strip */}
        <div className="absolute inset-0 overflow-hidden select-none">
          {visibleImages.map(({ img, index, yPos }) => (
            <div
              key={`strip-${index}`}
              className="absolute inset-x-0 flex items-center justify-center"
              style={{
                height: `${h}px`,
                transform: `translateY(${yPos}px)`,
                willChange: 'transform',
              }}
            >
              <img
                src={img?.medium || '/placeholder.svg'}
                alt={`${product.title} ${((index % images.length) + images.length) % images.length + 1}`}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>
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

          {/* Stock indicator — own line, matches CATEGORY label treatment. */}
          {(variant ? variant.inventory_count === 0 : isCurrentColorwayOutOfStock) ? (
            <p
              className="mt-3 text-[10px] tracking-[0.2em] uppercase text-destructive"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Out of Stock
            </p>
          ) : variant && variant.inventory_count > 0 && variant.inventory_count <= 5 ? (
            <p
              className="mt-3 text-[10px] tracking-[0.2em] uppercase text-warning"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Low Stock
            </p>
          ) : null}

          {/* Colorway swatches — render whenever any colorway exists */}
          {product.colorways && product.colorways.length >= 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {product.colorways.map((c) => {
                const active = selectedColorwayId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedColorwayId(c.id); }}
                    title={c.name}
                    className={`w-[18px] h-[18px] rounded-full border transition-all shrink-0 ${
                      active
                        ? 'border-foreground/40 ring-2 ring-foreground ring-offset-2 ring-offset-background'
                        : 'border-foreground/30 hover:border-foreground/60'
                    }`}
                    style={getSwatchStyle(c)}
                  />
                );
              })}
            </div>
          )}

          {/* Size selector */}
          {availableVariants.length > 1 && (
            <div className="mt-8">
              <p
                className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                SELECT SIZE
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                {availableVariants.map(v => {
                  const isOOSVariant = v.inventory_count === 0;
                  return (
                    <button
                      key={v.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedVariant(v.id === selectedVariant ? null : v.id); }}
                      className={`px-4 py-2 text-[10px] tracking-[0.15em] uppercase border transition-colors ${
                        v.id === selectedVariant
                          ? isOOSVariant
                            ? 'bg-foreground text-background border-dashed border-foreground'
                            : 'bg-foreground text-background border-foreground'
                          : isOOSVariant
                          ? 'border-dashed border-border text-foreground/50 hover:border-foreground/60 cursor-pointer'
                          : 'border-border text-foreground hover:border-foreground'
                      }`}
                    >
                      {v.title}
                    </button>
                  );
                })}
                <button
                  onClick={(e) => { e.stopPropagation(); setSizeChartOpen(true); }}
                  className="px-4 py-2 text-[10px] tracking-[0.15em] uppercase border border-border text-foreground/70 hover:border-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <Ruler className="w-3 h-3" />
                  CHART
                </button>
              </div>
            </div>
          )}

          {/* ADD TO CART / JOIN THE WAITLIST — full width, solid bg */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isOutOfStock) {
                setWaitlistOpen(true);
              } else {
                handleAddToCart();
              }
            }}
            className="w-full py-3.5 mt-8 text-[10px] tracking-[0.25em] uppercase transition-colors bg-foreground text-background hover:bg-foreground/90"
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
            {splitSentences(product.description).map((s, i) => (
              <span key={i} className="block">{s}</span>
            ))}
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

      <SizeChartOverlay
        open={sizeChartOpen}
        category={product.product_type || product.category}
        onClose={() => setSizeChartOpen(false)}
        variant="maison"
        placement="right-drawer"
      />

      <MaisonWaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        product={product}
      />
    </motion.div>
  );
}
