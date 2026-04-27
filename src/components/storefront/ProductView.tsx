import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Heart, X, ShoppingBag, Layers, Ruler } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react';
import type { DemoProduct } from '@/data/demo-data';
import { useCart } from '@/contexts/CartContext';
import { useStyleKit } from '@/contexts/StyleKitContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SizeChartOverlay } from './SizeChartOverlay';

// Cross-product size memory: when a shopper locks a size on a top, pre-select
// that same size on the next top they view (same for bottoms).
type SizeGroup = 'top' | 'bottom';
const rememberedSizeByGroup = new Map<SizeGroup, string>();

function getSizeGroup(category: string | undefined): SizeGroup | null {
  if (category === 'shirt' || category === 'jacket') return 'top';
  if (category === 'pants' || category === 'shorts') return 'bottom';
  return null;
}


interface ProductViewProps {
  productIndex: number;
  products: DemoProduct[];
  categories: string[];
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
}

function getWrappingNeighbor(
  currentIndex: number,
  direction: 'up' | 'down' | 'left' | 'right',
  products: DemoProduct[],
  activeCategory: string
): number {
  // Get visible products in visual grid order (they already have correct grid_position from layout)
  const visible = products
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => activeCategory === 'ALL' || p.category.toUpperCase() === activeCategory);

  if (visible.length === 0) return currentIndex;

  // For category-filtered views, reflow positions into a compact grid (matches SpatialCanvas overridePositions)
  const COLS = 5;
  const TILE_W = 220;
  const TILE_H = 280;
  const GAP = 20;

  // Always derive positions from array index — the products array is already
  // sorted by the layout system, so index order = visual grid order.
  const positions = visible.map((_, idx) => ({
    x: (idx % COLS) * (TILE_W + GAP),
    y: Math.floor(idx / COLS) * (TILE_H + GAP),
  }));

  // Build grid rows from positions
  const yPositions = [...new Set(positions.map(pos => pos.y))].sort((a, b) => a - b);
  const rows: number[][] = yPositions.map(y => {
    const inRow = visible
      .map((v, idx) => ({ v, idx }))
      .filter((_, idx) => positions[idx].y === y)
      .sort((a, b) => positions[a.idx].x - positions[b.idx].x)
      .map(({ v }) => v.i);
    return inRow;
  });

  // Find which row/col the current product is in
  let rowIdx = -1;
  let colIdx = -1;
  for (let r = 0; r < rows.length; r++) {
    const c = rows[r].indexOf(currentIndex);
    if (c !== -1) {
      rowIdx = r;
      colIdx = c;
      break;
    }
  }

  if (rowIdx === -1) return currentIndex;

  const currentRow = rows[rowIdx];

  switch (direction) {
    case 'left': {
      const newCol = colIdx - 1 < 0 ? currentRow.length - 1 : colIdx - 1;
      return currentRow[newCol];
    }
    case 'right': {
      const newCol = (colIdx + 1) % currentRow.length;
      return currentRow[newCol];
    }
    case 'up': {
      const newRow = rowIdx - 1 < 0 ? rows.length - 1 : rowIdx - 1;
      const targetRow = rows[newRow];
      const targetCol = Math.min(colIdx, targetRow.length - 1);
      return targetRow[targetCol];
    }
    case 'down': {
      const newRow = (rowIdx + 1) % rows.length;
      const targetRow = rows[newRow];
      const targetCol = Math.min(colIdx, targetRow.length - 1);
      return targetRow[targetCol];
    }
  }
}

export const ProductView = forwardRef<HTMLDivElement, ProductViewProps>(function ProductView({ productIndex, products, categories, onClose, onNavigate, activeCategory, onCategoryChange }, _ref) {
  const DEMO_PRODUCTS = products;
  const CATEGORIES = categories;
  const { themeSettings } = useTheme();

  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [expandDetails, setExpandDetails] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const { addItem, openCart, itemCount } = useCart();
  const { openStyleKit } = useStyleKit();
  const scrollCooldown = useRef(true);

  // Release initial cooldown after mount
  useEffect(() => {
    const timer = setTimeout(() => { scrollCooldown.current = false; }, 600);
    return () => clearTimeout(timer);
  }, []);

  const product = DEMO_PRODUCTS[productIndex];

  // Filtered visible indices for counter
  const visibleIndices = useMemo(() =>
    DEMO_PRODUCTS
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => activeCategory === 'ALL' || p.category.toUpperCase() === activeCategory)
      .map(({ i }) => i),
    [activeCategory]
  );
  const posInFiltered = visibleIndices.indexOf(productIndex) + 1;

  // Reset variant selection when product changes & preload alternate images.
  // If the shopper has already locked a size for this garment group (top vs bottom),
  // pre-select the matching variant on the next product in that group.
  useEffect(() => {
    const group = getSizeGroup(product?.product_category);
    const remembered = group ? rememberedSizeByGroup.get(group) : undefined;
    const match = remembered
      ? product?.variants.find(v => v.title === remembered && v.inventory_count > 0)
      : undefined;
    setSelectedVariant(match ? match.id : null);
    setExpandDetails(false);
    setActiveImage(0);
    // Preload worn/alternate images in background
    if (product?.images) {
      product.images.forEach((src, i) => {
        if (i === 0) return; // already visible
        const img = new Image();
        img.src = src.medium;
      });
    }
  }, [productIndex]);

  // Phase 6: Preload neighbor images for seamless navigation
  useEffect(() => {
    const directions: Array<'up'|'down'|'left'|'right'> = ['up','down','left','right'];
    directions.forEach(dir => {
      const idx = getWrappingNeighbor(productIndex, dir, DEMO_PRODUCTS, activeCategory);
      if (idx === productIndex) return;
      const neighbor = DEMO_PRODUCTS[idx];
      if (neighbor?.images?.[0]) {
        const img = new Image();
        img.src = neighbor.images[0].medium;
      }
    });
  }, [productIndex, activeCategory]);

  const navigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const newIndex = getWrappingNeighbor(productIndex, direction, DEMO_PRODUCTS, activeCategory);
    onNavigate(newIndex);
  }, [productIndex, onNavigate, activeCategory]);

  // Scroll wheel navigation (strict one-per-swipe)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (scrollCooldown.current) return;
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    if (absX < 15 && absY < 15) return;
    scrollCooldown.current = true;
    setTimeout(() => { scrollCooldown.current = false; }, 800);
    if (absX > absY) {
      navigate(e.deltaX > 0 ? 'right' : 'left');
    } else {
      navigate(e.deltaY > 0 ? 'down' : 'up');
    }
  }, [navigate]);

  useEffect(() => {
    const el = document.body;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Touch swipe navigation
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const MIN_SWIPE = 50;
      if (absX < MIN_SWIPE && absY < MIN_SWIPE) { touchStart.current = null; return; }
      if (absX > absY) {
        navigate(dx < 0 ? 'right' : 'left');
      } else {
        navigate(dy < 0 ? 'down' : 'up');
      }
      touchStart.current = null;
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigate('right');
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigate('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigate('down');
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onClose]);

  if (!product) return null;

  const variant = product.variants.find(v => v.id === selectedVariant);
  const canAdd = product.variants.length <= 1 || selectedVariant !== null;
  const isOutOfStock = variant ? variant.inventory_count === 0 : false;

  const handleAddToCart = () => {
    if (!canAdd || isOutOfStock) return;
    const v = variant || product.variants[0];
    if (!v) return;
    addItem({
      productId: product.id,
      variantId: v.id,
      title: product.title,
      variantTitle: v.title,
      price: v.price ?? product.price,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-30 ${themeSettings.mode === 'light' ? 'light' : ''}`}
    >
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-background"
        onClick={onClose}
      />

      {/* Content layer — pointer-events-none container, auto on interactive children */}
      <div className="absolute inset-0 flex flex-col items-center justify-start overflow-y-auto pt-20 pb-8 pointer-events-none">

        {/* Category tabs — top left */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-0.5 bg-foreground/[0.08] backdrop-blur-xl border border-foreground/[0.12] rounded-lg px-1 py-0.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={(e) => {
                e.stopPropagation();
                onCategoryChange(cat);
                onClose();
              }}
              className={`text-[10px] font-display tracking-[0.12em] uppercase rounded-md px-2.5 py-1 transition-colors ${
                activeCategory === cat
                  ? 'bg-foreground/[0.15] text-foreground font-medium'
                  : 'text-foreground/40 hover:text-foreground/70'
              }`}
            >
              {cat === 'ALL' ? 'ALL' : cat.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Top-right: cart button */}
        <div className="absolute top-6 right-6 z-40 pointer-events-auto">
          <button
            onClick={(e) => { e.stopPropagation(); openCart(); }}
            className={`relative p-2 md:p-2.5 rounded-xl backdrop-blur-md shadow-lg hover:shadow-xl transition-all ${themeSettings.mode === 'light' ? 'bg-foreground/10 border border-foreground/10 hover:bg-foreground/15' : 'bg-white/90 border border-white/20 hover:bg-white'}`}
          >
            <ShoppingBag className={`w-4 md:w-5 h-4 md:h-5 ${themeSettings.mode === 'light' ? 'text-foreground' : 'text-background'}`} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-foreground text-background text-[9px] font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Navigation arrows — positioned just outside the centered product image */}
        <button
          onMouseEnter={() => navigate('left')}
          className="absolute top-1/2 -translate-y-1/2 z-40 p-3 hover:bg-foreground/10 rounded-full transition-all group pointer-events-auto"
          style={{ right: 'calc(50% + min(16rem, 26vh) + 0.5rem)' }}
        >
          <ChevronLeft className="w-6 h-6 text-foreground/40 group-hover:text-foreground transition-colors" />
        </button>
        <button
          onMouseEnter={() => navigate('right')}
          className="absolute top-1/2 -translate-y-1/2 z-40 p-3 hover:bg-foreground/10 rounded-full transition-all group pointer-events-auto"
          style={{ left: 'calc(50% + min(16rem, 26vh) + 0.5rem)' }}
        >
          <ChevronRight className="w-6 h-6 text-foreground/40 group-hover:text-foreground transition-colors" />
        </button>
        <button
          onMouseEnter={() => navigate('up')}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-40 p-3 hover:bg-foreground/10 rounded-full transition-all group pointer-events-auto"
        >
          <ChevronUp className="w-6 h-6 text-foreground/40 group-hover:text-foreground transition-colors" />
        </button>
        <button
          onMouseEnter={() => navigate('down')}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 p-3 hover:bg-foreground/10 rounded-full transition-all group pointer-events-auto"
        >
          <ChevronDown className="w-6 h-6 text-foreground/40 group-hover:text-foreground transition-colors" />
        </button>

        {/* Product content */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={product.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center w-full max-w-lg [@media(max-height:760px)]:max-w-[min(42rem,calc(100vw-7rem))] max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain px-6 [@media(max-height:760px)]:px-5 pointer-events-auto my-auto"
            onClick={(e) => e.stopPropagation()}
            onWheelCapture={(e) => e.stopPropagation()}
          >
            {/* Close button — above image, left-aligned */}
            <button
              onClick={onClose}
              className="self-end mb-3 p-2 rounded-xl backdrop-blur-md bg-foreground/[0.08] border border-foreground/[0.12] hover:bg-foreground/[0.15] transition-all"
            >
              <X className="w-5 h-5 text-foreground/60" />
            </button>

            {/* Product image area */}
            <div className="aspect-square bg-secondary/30 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden shrink-0 [@media(max-height:760px)]:mb-3" style={{ width: expandDetails ? 'min(100%, 28rem, 42vh)' : 'min(100%, 32rem, 52vh)' }}>
              {product.images && product.images.length > 0 ? (
                <img
                  key={`${product.id}-${activeImage}`}
                  src={product.images[Math.min(activeImage, product.images.length - 1)].medium}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  draggable={false}
                  decoding="async"
                />
              ) : (
                <span className="font-display text-muted-foreground/15 text-lg tracking-[0.3em]">
                  {product.category.toUpperCase()}
                </span>
              )}
              {product.compare_at_price && (
                <div className="absolute top-3 left-3 bg-accent text-accent-foreground text-[10px] font-display font-bold px-2 py-1 rounded">
                  SALE
                </div>
              )}

              {product.images && product.images.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 flex h-12 z-10" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  {product.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setActiveImage(i); }}
                      onMouseEnter={() => setActiveImage(i)}
                      className="flex-1 relative group"
                    >
                      <div className={`absolute bottom-2 left-1 right-1 h-1 rounded-full transition-all duration-200 ${
                        activeImage === i
                          ? 'bg-foreground/80'
                          : 'bg-foreground/15 group-hover:bg-foreground/30'
                      }`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title + Price */}
            <div className={`w-full ${expandDetails ? '[@media(max-height:760px)]:grid [@media(max-height:760px)]:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] [@media(max-height:760px)]:items-start [@media(max-height:760px)]:gap-4' : ''}`}>
              <div className={`flex flex-col items-center ${expandDetails ? '[@media(max-height:760px)]:items-start [@media(max-height:760px)]:text-left [@media(max-height:760px)]:pl-2' : ''}`}>
                <h2 className={`font-display text-lg font-bold text-center tracking-wide text-foreground ${expandDetails ? '[@media(max-height:760px)]:text-left' : ''}`}>{product.title}</h2>
                <div className={`flex items-baseline gap-2 mt-1 ${expandDetails ? '[@media(max-height:760px)]:justify-start' : ''}`}>
                  <span className="font-display text-base text-foreground">${product.price}</span>
                  {product.compare_at_price && (
                    <span className="text-sm text-foreground/50 line-through">${product.compare_at_price}</span>
                  )}
                </div>
              </div>

              {expandDetails && (
                <p className="hidden [@media(max-height:760px)]:block pt-1 text-sm text-foreground/70 text-left leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Expand button */}
            <button
              onClick={() => setExpandDetails(!expandDetails)}
              onMouseEnter={() => setExpandDetails(true)}
              className="mt-3 [@media(max-height:760px)]:mt-2 p-2 hover:bg-secondary rounded-full transition-colors text-foreground"
            >
              {expandDetails ? <X className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {/* Expandable details */}
            <AnimatePresence>
              {expandDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden w-full"
                >
                  <div className="pt-4 pb-2 space-y-4 [@media(max-height:760px)]:pt-3 [@media(max-height:760px)]:space-y-3">
                    <p className="text-sm text-foreground/70 text-center leading-relaxed [@media(max-height:760px)]:hidden">
                      {product.description}
                    </p>

                    <div className="[@media(max-height:760px)]:grid [@media(max-height:760px)]:grid-cols-[auto_minmax(0,1fr)] [@media(max-height:760px)]:items-start [@media(max-height:760px)]:gap-x-4 [@media(max-height:760px)]:gap-y-2">
                      <div className="space-y-4 [@media(max-height:760px)]:min-w-[10.5rem] [@media(max-height:760px)]:space-y-2.5 mb-2 [@media(max-height:760px)]:mb-0">
                        {/* Variants */}
                        {product.variants.length > 1 && (
                          <div className="flex flex-wrap items-center justify-center gap-2 [@media(max-height:760px)]:justify-start [@media(max-height:760px)]:gap-1.5">
                            {product.variants.map(v => {
                              const lockSize = () => {
                                if (v.inventory_count === 0) return;
                                setSelectedVariant(v.id);
                                const group = getSizeGroup(product.product_category);
                                if (group) rememberedSizeByGroup.set(group, v.title);
                              };
                              return (
                              <button
                                key={v.id}
                                onMouseEnter={lockSize}
                                onFocus={lockSize}
                                onClick={lockSize}
                                className={`px-4 py-2 text-sm font-display rounded-md border transition-all [@media(max-height:760px)]:px-3 [@media(max-height:760px)]:py-1.5 ${
                                  selectedVariant === v.id
                                    ? 'border-foreground bg-foreground text-background'
                                    : v.inventory_count === 0
                                    ? 'border-foreground/20 text-foreground/30 cursor-not-allowed'
                                    : 'border-foreground/30 text-foreground hover:border-foreground/60'
                                }`}
                                disabled={v.inventory_count === 0}
                              >
                                {v.title}
                              </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSizeChartOpen(true); }}
                              title="Size chart"
                              className="px-3 py-2 text-[11px] font-display tracking-wider rounded-md border border-foreground/30 text-foreground/70 hover:text-foreground hover:border-foreground/60 transition-all flex items-center gap-1.5 [@media(max-height:760px)]:px-2.5 [@media(max-height:760px)]:py-1.5"
                            >
                              <Ruler className="w-3.5 h-3.5" />
                              SIZE CHART
                            </button>
                          </div>
                        )}

                        {/* Stock */}
                        {variant && (
                          <p className={`text-xs text-center [@media(max-height:760px)]:text-left ${
                            variant.inventory_count === 0 ? 'text-destructive' :
                            variant.inventory_count <= 5 ? 'text-warning' : 'text-success'
                          }`}>
                            {variant.inventory_count === 0 ? 'Out of Stock' :
                             variant.inventory_count <= 5 ? `Low Stock — ${variant.inventory_count} left` :
                              'In Stock'}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap justify-center gap-3 mt-2 [@media(max-height:760px)]:col-start-2 [@media(max-height:760px)]:row-start-1 [@media(max-height:760px)]:flex-nowrap [@media(max-height:760px)]:items-center [@media(max-height:760px)]:justify-start [@media(max-height:760px)]:gap-2 [@media(max-height:760px)]:min-w-0 [@media(max-height:760px)]:mt-0">
                        <button
                          onClick={handleAddToCart}
                          disabled={!canAdd || isOutOfStock}
                          className={`px-6 py-3 font-display font-semibold text-sm tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all [@media(max-height:760px)]:px-3.5 [@media(max-height:760px)]:py-2.5 [@media(max-height:760px)]:text-[11px] [@media(max-height:760px)]:shrink-0 ${
                            !canAdd || isOutOfStock
                              ? 'bg-foreground/10 text-foreground/50 cursor-not-allowed'
                              : 'bg-foreground text-background hover:opacity-90'
                          }`}
                        >
                          <ShoppingBag className="w-4 h-4" />
                          {isOutOfStock ? 'OUT OF STOCK' : !canAdd ? 'SELECT SIZE' : 'ADD TO CART'}
                        </button>
                        <button
                          onClick={() => {
                            const variantTitle = product.variants.find(v => v.id === selectedVariant)?.title ?? null;
                            openStyleKit(product, 'counterparts', variantTitle);
                          }}
                          className="px-4 py-3 border border-foreground/30 text-foreground font-display font-semibold text-[11px] tracking-wider rounded-lg flex items-center justify-center gap-2 hover:bg-foreground/5 transition-colors [@media(max-height:760px)]:px-3 [@media(max-height:760px)]:py-2.5 [@media(max-height:760px)]:text-[10.5px] [@media(max-height:760px)]:whitespace-nowrap [@media(max-height:760px)]:shrink-0"
                        >
                          <Layers className="w-4 h-4" />
                          BUILD A SET
                        </button>
                        <button
                          onClick={() => setIsSaved(!isSaved)}
                          className={`p-3 border rounded-lg transition-colors text-foreground [@media(max-height:760px)]:p-2.5 [@media(max-height:760px)]:shrink-0 ${
                            isSaved ? 'border-foreground/60' : 'border-foreground/30 hover:border-foreground/60'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Position indicator — bottom right */}
        <div className="absolute bottom-14 right-6 pointer-events-auto">
          <span className="text-[10px] font-display tracking-widest text-foreground/40">
            {posInFiltered} / {visibleIndices.length}
          </span>
        </div>
      </div>

      <SizeChartOverlay
        open={sizeChartOpen}
        category={product.product_category || product.category}
        onClose={() => setSizeChartOpen(false)}
      />
    </motion.div>
  );
});
