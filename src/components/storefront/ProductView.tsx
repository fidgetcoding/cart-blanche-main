import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, ShoppingBag, Layers, Ruler, Plus } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react';
import type { DemoProduct } from '@/data/demo-data';
import { useCart } from '@/contexts/CartContext';
import { useStyleKit } from '@/contexts/StyleKitContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SizeChartOverlay } from './SizeChartOverlay';
import { GenderSymbol } from './GenderSymbol';
import { splitSentences } from '@/lib/format-description';
import { WaitlistModal } from './WaitlistModal';
import { getSwatchStyle } from '@/lib/swatch-style';

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
  activeGenders?: string[];
  onToggleGender?: (g: string) => void;
  availableGenders?: Set<string>;
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

// ─── Adjacent Item Peeks — feature flag + tuning state ──────────────────────
type PeekFade = 'none' | 'soft' | 'strong';
interface PeekConfig {
  width: number;
  opacity: number;
  blur: number;
  edgeFade: PeekFade;
}
const PEEK_CONFIG_DEFAULT: PeekConfig = { width: 18, opacity: 0.7, blur: 1, edgeFade: 'soft' };
const PEEK_STORAGE_KEY = 'cb-peeks-config';

function getPeekFlag(): 'off' | 'on' | 'dev' {
  if (typeof window === 'undefined') return 'on';
  const v = new URLSearchParams(window.location.search).get('peeks');
  if (v === 'dev') return 'dev';
  if (v === '0' || v === 'off') return 'off';
  return 'on';
}

function loadPeekConfig(): PeekConfig {
  if (typeof window === 'undefined') return PEEK_CONFIG_DEFAULT;
  try {
    const raw = window.localStorage.getItem(PEEK_STORAGE_KEY);
    if (!raw) return PEEK_CONFIG_DEFAULT;
    const parsed = JSON.parse(raw);
    return {
      width: typeof parsed.width === 'number' ? parsed.width : PEEK_CONFIG_DEFAULT.width,
      opacity: typeof parsed.opacity === 'number' ? parsed.opacity : PEEK_CONFIG_DEFAULT.opacity,
      blur: typeof parsed.blur === 'number' ? parsed.blur : PEEK_CONFIG_DEFAULT.blur,
      edgeFade: ['none', 'soft', 'strong'].includes(parsed.edgeFade) ? parsed.edgeFade : PEEK_CONFIG_DEFAULT.edgeFade,
    };
  } catch {
    return PEEK_CONFIG_DEFAULT;
  }
}

function fadeMaskFor(direction: 'left' | 'right' | 'top' | 'bottom', edgeFade: PeekFade): string | undefined {
  if (edgeFade === 'none') return undefined;
  const stop = edgeFade === 'soft' ? 40 : 70;
  const dir = direction === 'left' ? 'to right'
            : direction === 'right' ? 'to left'
            : direction === 'top' ? 'to bottom'
            : 'to top';
  return `linear-gradient(${dir}, transparent 0%, black ${stop}%)`;
}

export const ProductView = forwardRef<HTMLDivElement, ProductViewProps>(function ProductView({ productIndex, products, categories, onClose, onNavigate, activeCategory, onCategoryChange, activeGenders = [], onToggleGender, availableGenders }, _ref) {
  const DEMO_PRODUCTS = products;
  const CATEGORIES = categories;
  const { themeSettings } = useTheme();

  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  
  const [expandDetails, setExpandDetails] = useState(false);

  // Adjacent Item Peeks — feature flag + tuning state
  const peekFlag = useMemo(() => getPeekFlag(), []);
  const [peekConfig, setPeekConfig] = useState<PeekConfig>(loadPeekConfig);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (peekFlag !== 'dev') return;
    try { window.localStorage.setItem(PEEK_STORAGE_KEY, JSON.stringify(peekConfig)); } catch { /* ignore */ }
  }, [peekConfig, peekFlag]);

  const peeksVisible = peekFlag !== 'off' && !isMobile && !expandDetails;
  const peekNeighbors = useMemo(() => {
    if (!peeksVisible) return null;
    const dirs: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'right', 'up', 'down'];
    const out: Record<'left' | 'right' | 'up' | 'down', DemoProduct | null> = { left: null, right: null, up: null, down: null };
    for (const dir of dirs) {
      const idx = getWrappingNeighbor(productIndex, dir, products, activeCategory);
      if (idx !== productIndex) out[dir] = products[idx] ?? null;
    }
    return out;
  }, [peeksVisible, productIndex, products, activeCategory]);
  const [activeImage, setActiveImage] = useState(0);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const { addItem, openCart, itemCount } = useCart();
  const { openStyleKit } = useStyleKit();
  const scrollCooldown = useRef(true);

  // Release initial cooldown after mount
  useEffect(() => {
    const timer = setTimeout(() => { scrollCooldown.current = false; }, 600);
    return () => clearTimeout(timer);
  }, []);

  const product = DEMO_PRODUCTS[productIndex];
  const [selectedColorwayId, setSelectedColorwayId] = useState<string | null>(
    product.colorways && product.colorways.length > 0 ? product.colorways[0].id : null
  );
  const [colorwayPage, setColorwayPage] = useState(0);

  // Resolve the selected colorway object. If null (no colorways) or
  // the id doesn't match any colorway (defensive), this is null.
  const selectedColorway = product.colorways?.find(c => c.id === selectedColorwayId) || null;
  // Filter product.images by colorway_id. An image with no colorway_id
  // (untagged) is always visible. An image tagged with a specific
  // colorway is only visible when that colorway is selected.
  const displayImages = product.images.filter(img =>
    !img.colorway_id || img.colorway_id === selectedColorwayId
  );

  const VISIBLE_COLORWAYS = 10;
  const allColorways = product.colorways || [];
  const totalColorwayPages = Math.max(1, Math.ceil(allColorways.length / VISIBLE_COLORWAYS));
  const safeColorwayPage = Math.min(colorwayPage, Math.max(0, totalColorwayPages - 1));
  const colorwaysToShow = allColorways.slice(
    safeColorwayPage * VISIBLE_COLORWAYS,
    (safeColorwayPage + 1) * VISIBLE_COLORWAYS
  );

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
    const group = getSizeGroup(product?.product_type);
    const remembered = group ? rememberedSizeByGroup.get(group) : undefined;
    const match = remembered
      ? product?.variants.find(v =>
          v.title === remembered &&
          v.inventory_count > 0 &&
          (!v.colorway_id || v.colorway_id === (product?.colorways?.[0]?.id ?? null))
        )
      : undefined;
    setSelectedVariant(match ? match.id : null);
    setExpandDetails(false);
    setActiveImage(0);
    setColorwayPage(0);
    setSelectedColorwayId(
      product.colorways && product.colorways.length > 0 ? product.colorways[0].id : null
    );
    // Preload worn/alternate images for the SELECTED colorway in
    // background. Only the currently-displayed images need preloading;
    // images for other colorways will load when their swatch is selected.
    if (displayImages && displayImages.length > 0) {
      displayImages.forEach((src, i) => {
        if (i === 0) return; // already visible
        const img = new Image();
        img.src = src.medium;
      });
    }
  }, [productIndex]);

  // Preserve image index when colorway changes. If the new
  // colorway has fewer images than current index, clamp to last.
  useEffect(() => {
    setActiveImage(prev => Math.min(prev, Math.max(0, displayImages.length - 1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColorwayId]);

  // When colorway changes, try to keep the same SIZE selected by
  // looking up the equivalent variant in the new colorway. If the
  // matching variant is OOS or doesn't exist, clear selection.
  useEffect(() => {
    if (!selectedVariant) return;
    const current = product.variants.find(v => v.id === selectedVariant);
    if (!current) { setSelectedVariant(null); return; }
    if (current.colorway_id && current.colorway_id !== selectedColorwayId) {
      const equivalent = product.variants.find(
        v => v.title === current.title &&
             (!v.colorway_id || v.colorway_id === selectedColorwayId) &&
             v.inventory_count > 0
      );
      setSelectedVariant(equivalent ? equivalent.id : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColorwayId]);

  // Auto-page: ensure the selected colorway is always on the visible page.
  useEffect(() => {
    if (!selectedColorwayId) return;
    const idx = allColorways.findIndex(c => c.id === selectedColorwayId);
    if (idx < 0) return;
    const targetPage = Math.floor(idx / VISIBLE_COLORWAYS);
    if (targetPage !== colorwayPage) setColorwayPage(targetPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColorwayId]);

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
  // Zone rule: horizontal swipes INSIDE the product image card cycle that
  // product's photos. Everywhere else, and vertical anywhere, navigates
  // between products.
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (scrollCooldown.current) return;
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    if (absX < 15 && absY < 15) return;

    const insideImage =
      (e.target as Element)?.closest?.('[data-image-zone]') != null;
    const isHorizontal = absX > absY;
    const imageCount = displayImages.length;

    // Horizontal swipe inside image card → cycle photos (wrap around)
    if (insideImage && isHorizontal && imageCount > 1) {
      scrollCooldown.current = true;
      setTimeout(() => { scrollCooldown.current = false; }, 800);
      setActiveImage(prev =>
        e.deltaX > 0
          ? (prev + 1) % imageCount
          : (prev - 1 + imageCount) % imageCount
      );
      return;
    }

    // Horizontal swipe inside image card with only one photo → consume gesture
    // so it doesn't fall through to product navigation.
    if (insideImage && isHorizontal && imageCount <= 1) {
      return;
    }

    // All other cases: existing product-navigation behavior.
    scrollCooldown.current = true;
    setTimeout(() => { scrollCooldown.current = false; }, 800);
    if (absX > absY) {
      navigate(e.deltaX > 0 ? 'right' : 'left');
    } else {
      navigate(e.deltaY > 0 ? 'down' : 'up');
    }
  }, [navigate, product]);

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
  const isWholeProductOutOfStock = product.variants.every(v => v.inventory_count === 0);

  const availableVariants = product.variants.filter(
    v => !v.colorway_id || v.colorway_id === selectedColorwayId
  );
  const isCurrentColorwayOutOfStock = availableVariants.length > 0 &&
    availableVariants.every(v => v.inventory_count === 0);

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
      colorwayId: selectedColorway?.id,
      colorwayName: selectedColorway?.name,
    });
  };

  const colorwayWheelLockRef = useRef(false);
  const colorwayTouchStartY = useRef<number | null>(null);

  const handleColorwayWheel = (e: React.WheelEvent) => {
    if (totalColorwayPages <= 1) return;
    e.stopPropagation();
    if (colorwayWheelLockRef.current) return;
    if (Math.abs(e.deltaY) < 10) return;
    if (e.deltaY > 0) {
      setColorwayPage(p => Math.min(p + 1, totalColorwayPages - 1));
    } else {
      setColorwayPage(p => Math.max(p - 1, 0));
    }
    colorwayWheelLockRef.current = true;
    setTimeout(() => { colorwayWheelLockRef.current = false; }, 800);
  };

  const handleColorwayTouchStart = (e: React.TouchEvent) => {
    colorwayTouchStartY.current = e.touches[0].clientY;
  };

  const handleColorwayTouchEnd = (e: React.TouchEvent) => {
    if (totalColorwayPages <= 1) return;
    if (colorwayTouchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - colorwayTouchStartY.current;
    colorwayTouchStartY.current = null;
    if (Math.abs(deltaY) < 30) return;
    if (deltaY < 0) {
      setColorwayPage(p => Math.min(p + 1, totalColorwayPages - 1));
    } else {
      setColorwayPage(p => Math.max(p - 1, 0));
    }
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

      {/* ── Adjacent Item Peeks — gated on URL param + viewport + details state ── */}
      {peeksVisible && peekNeighbors && (
        <>
          {peekNeighbors.left && peekNeighbors.left.images?.[0] && (
            <div
              aria-hidden
              className="absolute top-1/2 -translate-y-1/2 left-0 pointer-events-none bg-no-repeat"
              style={{
                width: `${peekConfig.width}%`,
                height: '50vh',
                opacity: peekConfig.opacity,
                filter: peekConfig.blur > 0 ? `blur(${peekConfig.blur}px)` : undefined,
                backgroundImage: `url(${peekNeighbors.left.images[0].medium})`,
                backgroundSize: 'auto 100%',
                backgroundPosition: 'right center',
                maskImage: fadeMaskFor('left', peekConfig.edgeFade),
                WebkitMaskImage: fadeMaskFor('left', peekConfig.edgeFade),
              }}
            />
          )}
          {peekNeighbors.right && peekNeighbors.right.images?.[0] && (
            <div
              aria-hidden
              className="absolute top-1/2 -translate-y-1/2 right-0 pointer-events-none bg-no-repeat"
              style={{
                width: `${peekConfig.width}%`,
                height: '50vh',
                opacity: peekConfig.opacity,
                filter: peekConfig.blur > 0 ? `blur(${peekConfig.blur}px)` : undefined,
                backgroundImage: `url(${peekNeighbors.right.images[0].medium})`,
                backgroundSize: 'auto 100%',
                backgroundPosition: 'left center',
                maskImage: fadeMaskFor('right', peekConfig.edgeFade),
                WebkitMaskImage: fadeMaskFor('right', peekConfig.edgeFade),
              }}
            />
          )}
          {peekNeighbors.up && peekNeighbors.up.images?.[0] && (
            <div
              aria-hidden
              className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none bg-no-repeat"
              style={{
                width: '40vw',
                height: `${peekConfig.width}%`,
                opacity: peekConfig.opacity,
                filter: peekConfig.blur > 0 ? `blur(${peekConfig.blur}px)` : undefined,
                backgroundImage: `url(${peekNeighbors.up.images[0].medium})`,
                backgroundSize: '100% auto',
                backgroundPosition: 'center bottom',
                maskImage: fadeMaskFor('top', peekConfig.edgeFade),
                WebkitMaskImage: fadeMaskFor('top', peekConfig.edgeFade),
              }}
            />
          )}
          {peekNeighbors.down && peekNeighbors.down.images?.[0] && (
            <div
              aria-hidden
              className="absolute left-1/2 -translate-x-1/2 bottom-0 pointer-events-none bg-no-repeat"
              style={{
                width: '40vw',
                height: `${peekConfig.width}%`,
                opacity: peekConfig.opacity,
                filter: peekConfig.blur > 0 ? `blur(${peekConfig.blur}px)` : undefined,
                backgroundImage: `url(${peekNeighbors.down.images[0].medium})`,
                backgroundSize: '100% auto',
                backgroundPosition: 'center top',
                maskImage: fadeMaskFor('bottom', peekConfig.edgeFade),
                WebkitMaskImage: fadeMaskFor('bottom', peekConfig.edgeFade),
              }}
            />
          )}
        </>
      )}

      {/* ── Dev panel — live-tuning controls, only when ?peeks=dev ── */}
      {peekFlag === 'dev' && (
        <div
          className="absolute top-4 right-4 z-50 pointer-events-auto bg-background/95 backdrop-blur-md border border-foreground/20 rounded-lg p-3 text-[10px] font-display tracking-wider text-foreground/80"
          style={{ width: '220px' }}
        >
          <div className="text-[9px] tracking-[0.2em] text-foreground/50 mb-2">PEEKS — DEV PANEL</div>
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-2">
              <span>WIDTH</span>
              <input type="range" min={5} max={25} step={1} value={peekConfig.width}
                onChange={(e) => setPeekConfig(c => ({ ...c, width: Number(e.target.value) }))}
                className="flex-1 mx-2" />
              <span className="w-8 text-right text-foreground">{peekConfig.width}%</span>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span>OPACITY</span>
              <input type="range" min={10} max={60} step={1} value={Math.round(peekConfig.opacity * 100)}
                onChange={(e) => setPeekConfig(c => ({ ...c, opacity: Number(e.target.value) / 100 }))}
                className="flex-1 mx-2" />
              <span className="w-8 text-right text-foreground">{Math.round(peekConfig.opacity * 100)}%</span>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span>BLUR</span>
              <input type="range" min={0} max={16} step={1} value={peekConfig.blur}
                onChange={(e) => setPeekConfig(c => ({ ...c, blur: Number(e.target.value) }))}
                className="flex-1 mx-2" />
              <span className="w-8 text-right text-foreground">{peekConfig.blur}px</span>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span>FADE</span>
              <select value={peekConfig.edgeFade}
                onChange={(e) => setPeekConfig(c => ({ ...c, edgeFade: e.target.value as PeekFade }))}
                className="flex-1 ml-2 bg-foreground/10 border border-foreground/15 rounded px-2 py-1 text-foreground text-[10px]">
                <option value="none">none</option>
                <option value="soft">soft</option>
                <option value="strong">strong</option>
              </select>
            </label>
          </div>
          <div className="flex gap-1 mt-3">
            <button onClick={() => setPeekConfig({ width: 8, opacity: 0.18, blur: 4, edgeFade: 'soft' })}
              className="flex-1 px-2 py-1 bg-foreground/10 hover:bg-foreground/20 rounded text-[9px]">SUBTLE</button>
            <button onClick={() => setPeekConfig({ width: 14, opacity: 0.32, blur: 2, edgeFade: 'soft' })}
              className="flex-1 px-2 py-1 bg-foreground/10 hover:bg-foreground/20 rounded text-[9px]">MOD</button>
            <button onClick={() => setPeekConfig({ width: 22, opacity: 0.48, blur: 0, edgeFade: 'none' })}
              className="flex-1 px-2 py-1 bg-foreground/10 hover:bg-foreground/20 rounded text-[9px]">BOLD</button>
          </div>
          <div className="mt-2 text-[9px] text-foreground/40 leading-relaxed">
            Spec: w {peekConfig.width}% · o {peekConfig.opacity.toFixed(2)} · b {peekConfig.blur}px · fade {peekConfig.edgeFade}
          </div>
        </div>
      )}

      {/* Content layer — pointer-events-none container, auto on interactive children */}
      <div className="absolute inset-0 flex flex-col items-center justify-start overflow-y-auto pt-20 pb-8 pointer-events-none">

        {/* Category tabs + gender symbols — centered as one group, mirroring SpatialCanvas header */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-3">
          <div className="flex items-center gap-0.5 bg-foreground/[0.08] backdrop-blur-xl border border-foreground/[0.12] rounded-lg px-1 py-0.5">
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

          {/* Gender symbols — only when more than one gender exists in current view */}
          {onToggleGender && availableGenders && availableGenders.size > 1 && (
            <div className="flex items-center gap-2">
              {['MEN', 'WOMEN', 'UNISEX'].map(g => {
                const isActive = activeGenders.includes(g);
                return (
                  <button
                    key={g}
                    onClick={(e) => { e.stopPropagation(); onToggleGender(g); }}
                    className={`p-1 transition-all duration-200 ${
                      isActive
                        ? 'text-foreground opacity-100'
                        : 'text-muted-foreground opacity-40 hover:opacity-80'
                    }`}
                    title={g.charAt(0) + g.slice(1).toLowerCase()}
                    aria-pressed={isActive}
                  >
                    <GenderSymbol gender={g.toLowerCase()} size={20} />
                  </button>
                );
              })}
            </div>
          )}
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
          aria-label="More details"
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
            onWheelCapture={(e) => {
              const insideImage = (e.target as Element)?.closest?.('[data-image-zone]') != null;
              const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
              // Horizontal swipes inside the image card fall through to the body
              // wheel handler so photo cycling can run.
              if (insideImage && isHorizontal) return;
              // Vertical swipes anywhere fall through so the body wheel handler
              // can navigate to the next/previous product (up/down).
              if (!isHorizontal) return;
              // Remaining case: horizontal swipe over the title/price/button area
              // — suppress so we don't accidentally jump products while the
              // shopper is interacting with content right next to the image.
              e.stopPropagation();
            }}
          >
            {/* Close button — above image, left-aligned */}
            <button
              onClick={onClose}
              className="self-end mb-3 p-2 rounded-xl backdrop-blur-md bg-foreground/[0.08] border border-foreground/[0.12] hover:bg-foreground/[0.15] transition-all"
            >
              <X className="w-5 h-5 text-foreground/60" />
            </button>

            {/* Product image area */}
            <div data-image-zone="true" className="aspect-square bg-secondary/30 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden shrink-0 [@media(max-height:760px)]:mb-3" style={{ width: expandDetails ? 'min(100%, 28rem, 42vh)' : 'min(100%, 32rem, 52vh)' }}>
              {displayImages && displayImages.length > 0 ? (
                <img
                  key={`${product.id}-${selectedColorwayId || 'default'}-${activeImage}`}
                  src={displayImages[Math.min(activeImage, displayImages.length - 1)].medium}
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

              {allColorways.length >= 1 && (
                <>
                  {totalColorwayPages > 1 && (
                    <div
                      className="absolute right-9 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {Array.from({ length: totalColorwayPages }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setColorwayPage(i); }}
                          className={`w-1 h-1 rounded-full transition-all ${
                            i === safeColorwayPage ? 'bg-foreground/95' : 'bg-foreground/30'
                          }`}
                          aria-label={`Color page ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 z-20"
                    style={{ overscrollBehavior: 'contain' }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onWheel={handleColorwayWheel}
                    onTouchStart={handleColorwayTouchStart}
                    onTouchEnd={handleColorwayTouchEnd}
                  >
                    {colorwaysToShow.map((c) => {
                      const active = selectedColorwayId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedColorwayId(c.id); }}
                          title={c.name}
                          className={`w-4 h-4 rounded-full border transition-all shrink-0 ${
                            active
                              ? 'border-foreground/60 ring-1 ring-foreground/40 ring-offset-1 ring-offset-background/30'
                              : 'border-foreground/30 hover:border-foreground/60'
                          }`}
                          style={getSwatchStyle(c)}
                        />
                      );
                    })}
                  </div>
                </>
              )}

              {displayImages && displayImages.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 flex h-12 z-10" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  {displayImages.map((_, i) => (
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

            {/* Title + Price (inline) */}
            <div className={`w-full ${expandDetails ? '[@media(max-height:760px)]:grid [@media(max-height:760px)]:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] [@media(max-height:760px)]:items-start [@media(max-height:760px)]:gap-4' : ''}`}>
              <div className={`flex flex-col items-center ${expandDetails ? '[@media(max-height:760px)]:items-start [@media(max-height:760px)]:text-left [@media(max-height:760px)]:pl-2' : ''}`}>
                <div className={`flex items-baseline justify-center gap-3 ${expandDetails ? '[@media(max-height:760px)]:justify-start' : ''}`}>
                  <h2 className={`font-display text-lg font-bold tracking-wide text-foreground ${expandDetails ? '[@media(max-height:760px)]:text-left' : ''}`}>{product.title}</h2>
                  <span className="font-display text-base text-foreground">
                    ${product.price}
                  </span>
                  {product.compare_at_price && (
                    <span className="text-sm text-foreground/50 line-through">${product.compare_at_price}</span>
                  )}
                  {(variant ? variant.inventory_count === 0 : isCurrentColorwayOutOfStock) ? (
                    <span className="text-destructive tracking-wider text-sm">(OUT OF STOCK)</span>
                  ) : variant && variant.inventory_count > 0 && variant.inventory_count <= 5 ? (
                    <span className="text-warning tracking-wider text-sm">(LOW STOCK)</span>
                  ) : null}
                </div>
              </div>

              {expandDetails && (
                <p className="hidden [@media(max-height:760px)]:block pt-1 text-sm text-foreground/70 text-left leading-relaxed">
                  {splitSentences(product.description).map((s, i) => (
                    <span key={i} className="block">{s}</span>
                  ))}
                </p>
              )}
            </div>

            {/* Expand button — only renders in collapsed state. When expanded,
                an X button renders below the action buttons (see after AnimatePresence). */}
            {!expandDetails && !isWholeProductOutOfStock && (
              <button
                onClick={() => setExpandDetails(true)}
                onMouseEnter={() => setExpandDetails(true)}
                className={`mt-1 rounded-full transition-all text-foreground hover:bg-secondary ring-1 ring-transparent hover:ring-foreground/20 flex items-center justify-center gap-1.5 ${
                  themeSettings.yzExpandTriggerStyle === 'icon'
                    ? 'p-2'
                    : 'px-4 py-2 font-display font-semibold text-sm tracking-wider'
                }`}
              >
                {themeSettings.yzExpandTriggerStyle === 'text' ? (
                  <span>ADD TO CART</span>
                ) : themeSettings.yzExpandTriggerStyle === 'icon_text' ? (
                  <>
                    <span>ADD TO CART</span>
                    <Plus className="w-4 h-4" />
                  </>
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>
            )}

            {!expandDetails && isWholeProductOutOfStock && (
              <button
                onClick={() => setWaitlistOpen(true)}
                className="mt-1 px-4 py-2 font-display font-semibold text-sm tracking-wider text-foreground/80 hover:text-foreground transition-colors"
              >
                JOIN THE WAITLIST
              </button>
            )}

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
                      {splitSentences(product.description).map((s, i) => (
                        <span key={i} className="block">{s}</span>
                      ))}
                    </p>

                    <div className="[@media(max-height:760px)]:grid [@media(max-height:760px)]:grid-cols-[auto_minmax(0,1fr)] [@media(max-height:760px)]:items-start [@media(max-height:760px)]:gap-x-4 [@media(max-height:760px)]:gap-y-2">
                      <div className="space-y-4 [@media(max-height:760px)]:min-w-[10.5rem] [@media(max-height:760px)]:space-y-2.5 mb-2 [@media(max-height:760px)]:mb-0">
                        {/* Variants */}
                        {availableVariants.length > 1 && (
                          <div className="flex flex-wrap items-center justify-center gap-2 [@media(max-height:760px)]:justify-start [@media(max-height:760px)]:gap-1.5">
                            {availableVariants.map(v => {
                              const lockSize = () => {
                                setSelectedVariant(v.id);
                                const group = getSizeGroup(product.product_type);
                                if (group) rememberedSizeByGroup.set(group, v.title);
                              };
                              const isOOSVariant = v.inventory_count === 0;
                              return (
                              <button
                                key={v.id}
                                onMouseEnter={lockSize}
                                onFocus={lockSize}
                                onClick={lockSize}
                                className={`h-9 px-4 text-sm font-display rounded-md border transition-all flex items-center justify-center [@media(max-height:760px)]:px-3 ${
                                  selectedVariant === v.id
                                    ? isOOSVariant
                                      ? 'border-dashed border-foreground bg-foreground text-background'
                                      : 'border-foreground bg-foreground text-background'
                                    : isOOSVariant
                                    ? 'border-dashed border-foreground/40 text-foreground/60 hover:border-foreground/70 cursor-pointer'
                                    : 'border-foreground/30 text-foreground hover:border-foreground/60'
                                }`}
                              >
                                {v.title}
                              </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSizeChartOpen(true); }}
                              title="Size chart"
                              className="h-9 px-3 text-[11px] font-display tracking-wider rounded-md border border-foreground/30 text-foreground/70 hover:text-foreground hover:border-foreground/60 transition-all flex items-center gap-1.5 [@media(max-height:760px)]:px-2.5"
                            >
                              <Ruler className="w-3.5 h-3.5" />
                              SIZE CHART
                            </button>
                          </div>
                        )}

                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap justify-center gap-3 mt-2 [@media(max-height:760px)]:col-start-2 [@media(max-height:760px)]:row-start-1 [@media(max-height:760px)]:flex-nowrap [@media(max-height:760px)]:items-center [@media(max-height:760px)]:justify-start [@media(max-height:760px)]:gap-2 [@media(max-height:760px)]:min-w-0 [@media(max-height:760px)]:mt-0">
                        <button
                          onClick={() => {
                            if (!canAdd) return;
                            if (isOutOfStock) {
                              setWaitlistOpen(true);
                            } else {
                              handleAddToCart();
                            }
                          }}
                          disabled={!canAdd}
                          className={`px-6 py-3 font-display font-semibold text-sm tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all [@media(max-height:760px)]:h-9 [@media(max-height:760px)]:py-0 [@media(max-height:760px)]:px-3 [@media(max-height:760px)]:text-[11px] [@media(max-height:760px)]:min-w-0 ${
                            !canAdd
                              ? 'bg-foreground/10 text-foreground/50 cursor-not-allowed'
                              : 'bg-foreground text-background hover:opacity-90'
                          }`}
                        >
                          <ShoppingBag className="w-4 h-4 shrink-0" />
                          <span className="[@media(max-height:760px)]:truncate">{!canAdd ? 'SELECT SIZE' : isOutOfStock ? 'JOIN THE WAITLIST' : 'ADD TO CART'}</span>
                        </button>
                        <button
                          onClick={() => {
                            const variantTitle = product.variants.find(v => v.id === selectedVariant)?.title ?? null;
                            openStyleKit(product, 'counterparts', variantTitle, activeGenders);
                          }}
                          className="px-4 py-3 border border-foreground/30 text-foreground font-display font-semibold text-[11px] tracking-wider rounded-lg flex items-center justify-center gap-2 hover:bg-foreground/5 transition-colors [@media(max-height:760px)]:h-9 [@media(max-height:760px)]:py-0 [@media(max-height:760px)]:px-2.5 [@media(max-height:760px)]:text-[10.5px] [@media(max-height:760px)]:whitespace-nowrap [@media(max-height:760px)]:min-w-0"
                        >
                          <Layers className="w-4 h-4 shrink-0" />
                          BUILD A SET
                        </button>
                      </div>
                    </div>

                    {/* Close (X) — moved below the action buttons */}
                    <div className="flex justify-center pt-1">
                      <button
                        onClick={() => setExpandDetails(false)}
                        onMouseEnter={() => setExpandDetails(false)}
                        className="p-2 rounded-full transition-all text-foreground hover:bg-secondary ring-1 ring-transparent hover:ring-foreground/20 flex items-center justify-center"
                        aria-label="Close details"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Navigation hints — bottom left */}
        <div className="group absolute bottom-14 left-6 pointer-events-auto cursor-default">
          <p className="text-[10px] tracking-wider text-muted-foreground/30 group-hover:text-foreground/80 transition-colors duration-700" style={{ fontFamily: 'var(--font-body)' }}>
            <span className="hidden md:inline">SWIPE OR USE ARROW-KEYS TO CYCLE PRODUCT & PHOTOS</span>
            <span className="md:hidden">SWIPE OR USE ARROW-KEYS TO CYCLE PRODUCT & PHOTOS</span>
          </p>
        </div>

        {/* Position indicator — bottom right */}
        <div className="absolute bottom-14 right-6 pointer-events-auto">
          <span className="text-[10px] font-display tracking-widest text-foreground/40">
            {posInFiltered} / {visibleIndices.length}
          </span>
        </div>
      </div>

      <SizeChartOverlay
        open={sizeChartOpen}
        category={product.product_type || product.category}
        onClose={() => setSizeChartOpen(false)}
        placement="right-drawer"
      />
      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        product={product}
        lockedSize={variant && variant.inventory_count === 0 ? variant.title : undefined}
      />
    </motion.div>
  );
});
