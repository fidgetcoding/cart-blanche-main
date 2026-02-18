import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, LayoutDashboard, Instagram, Twitter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { ProductTile } from '@/components/storefront/ProductTile';
import { ProductView } from '@/components/storefront/ProductView';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { useCart } from '@/contexts/CartContext';

const CANVAS_W = 1360;
const CANVAS_H = 1230;
const MAX_SCALE = 2;
const MAX_ZOOM_THRESHOLD = 1.9; // trigger detail view near max
const ZOOM_SENSITIVITY = 0.0025;

const CATEGORIES = ['ALL', ...new Set(DEMO_PRODUCTS.map(p => p.category.toUpperCase()))];

export function SpatialCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Transform refs for high-frequency updates
  const transformRef = useRef({ x: 0, y: 0, scale: 0.5 });
  const targetTransformRef = useRef({ x: 0, y: 0, scale: 0.5 });
  const rafRef = useRef<number>(0);
  const minScaleRef = useRef(0.3);

  // React state for UI that needs re-renders
  const [scaleState, setScaleState] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, panStartX: 0, panStartY: 0, dragging: false });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const hoveredIndexRef = useRef<number | null>(null);
  const maxZoomTriggeredRef = useRef(false);
  const { toggleCart, itemCount } = useCart();
  const navigate = useNavigate();

  // Apply transform directly to DOM
  const applyTransform = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const { x, y, scale } = transformRef.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, []);

  // Calculate initial scale to fit everything, and center
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // Fit canvas into viewport with padding
    const padX = 40, padY = 80;
    const fitScale = Math.min(
      (rect.width - padX * 2) / CANVAS_W,
      (rect.height - padY * 2) / CANVAS_H
    );
    const s = Math.max(0.2, Math.min(1, fitScale));
    minScaleRef.current = s * 0.8; // allow slight zoom out beyond fit
    const cx = (rect.width - CANVAS_W * s) / 2;
    const cy = (rect.height - CANVAS_H * s) / 2;
    transformRef.current = { x: cx, y: cy, scale: s };
    targetTransformRef.current = { x: cx, y: cy, scale: s };
    setScaleState(s);
    applyTransform();
  }, [applyTransform]);

  // Smooth interpolation loop
  useEffect(() => {
    let running = true;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const LERP_SPEED = 0.18;

    const tick = () => {
      if (!running) return;
      const t = transformRef.current;
      const target = targetTransformRef.current;

      // When zoomed out enough that the grid fits in the viewport, re-center
      if (!dragRef.current.dragging) {
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const scaledW = CANVAS_W * target.scale;
          const scaledH = CANVAS_H * target.scale;

          // If canvas fits horizontally, center X
          if (scaledW <= rect.width) {
            target.x = (rect.width - scaledW) / 2;
          }
          // If canvas fits vertically, center Y
          if (scaledH <= rect.height) {
            target.y = (rect.height - scaledH) / 2;
          }
        }

        const dx = Math.abs(t.x - target.x);
        const dy = Math.abs(t.y - target.y);
        const ds = Math.abs(t.scale - target.scale);

        if (dx > 0.1 || dy > 0.1 || ds > 0.0001) {
          t.x = lerp(t.x, target.x, LERP_SPEED);
          t.y = lerp(t.y, target.y, LERP_SPEED);
          t.scale = lerp(t.scale, target.scale, LERP_SPEED);
          applyTransform();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [applyTransform]);

  // Find the product index under a given screen coordinate
  const getProductAtCursor = useCallback((screenX: number, screenY: number) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const t = targetTransformRef.current;
    // Convert screen coords to canvas coords
    const canvasX = (screenX - rect.left - t.x) / t.scale;
    const canvasY = (screenY - rect.top - t.y) / t.scale;

    // Check each product tile (approx 220x280 size)
    const products = DEMO_PRODUCTS;
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (activeCategory !== 'ALL' && p.category.toUpperCase() !== activeCategory) continue;
      const gx = p.grid_position.x;
      const gy = p.grid_position.y;
      if (canvasX >= gx && canvasX <= gx + 220 && canvasY >= gy && canvasY <= gy + 280) {
        return i;
      }
    }
    return null;
  }, [activeCategory]);

  // Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let scaleUpdateTimer: number;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // If already at max and zooming in further, open detail view
      const target = targetTransformRef.current;
      if (target.scale >= MAX_ZOOM_THRESHOLD && e.deltaY < 0 && !maxZoomTriggeredRef.current) {
        const idx = getProductAtCursor(e.clientX, e.clientY);
        if (idx !== null) {
          maxZoomTriggeredRef.current = true;
          setSelectedIndex(idx);
          setFocusedIndex(idx);
          return;
        }
      }

      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const oldScale = target.scale;
      const newScale = Math.max(minScaleRef.current, Math.min(MAX_SCALE, oldScale * (1 + delta)));
      const ratio = newScale / oldScale;
      target.x = cursorX - (cursorX - target.x) * ratio;
      target.y = cursorY - (cursorY - target.y) * ratio;
      target.scale = newScale;

      // Reset max zoom trigger when zooming out
      if (newScale < MAX_ZOOM_THRESHOLD) {
        maxZoomTriggeredRef.current = false;
      }

      clearTimeout(scaleUpdateTimer);
      scaleUpdateTimer = window.setTimeout(() => {
        setScaleState(targetTransformRef.current.scale);
      }, 80);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
      clearTimeout(scaleUpdateTimer);
    };
  }, [getProductAtCursor]);

  // Drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      panStartX: transformRef.current.x, panStartY: transformRef.current.y,
      dragging: true,
    };
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d.dragging) return;
    const t = transformRef.current;
    t.x = d.panStartX + (e.clientX - d.startX);
    t.y = d.panStartY + (e.clientY - d.startY);
    targetTransformRef.current.x = t.x;
    targetTransformRef.current.y = t.y;
    applyTransform();
  }, [applyTransform]);

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
    setIsDragging(false);
  }, []);

  // Smooth zoom to scale
  const setScaleSmooth = useCallback((newScale: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const target = targetTransformRef.current;
    const ratio = newScale / target.scale;
    target.x = cx - (cx - target.x) * ratio;
    target.y = cy - (cy - target.y) * ratio;
    target.scale = newScale;
    setScaleState(newScale);
  }, []);

  // Focus root on mount
  useEffect(() => { rootRef.current?.focus(); }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (selectedIndex !== null) return;

    const products = DEMO_PRODUCTS;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (focusedIndex === -1) { setFocusedIndex(0); return; }

      const yPositions = [...new Set(products.map(p => p.grid_position.y))].sort((a, b) => a - b);
      const rows: number[][] = yPositions.map(y =>
        products
          .map((p, i) => ({ i, p }))
          .filter(({ p }) => p.grid_position.y === y)
          .sort((a, b) => a.p.grid_position.x - b.p.grid_position.x)
          .map(({ i }) => i)
      );

      let rowIdx = -1, colIdx = -1;
      for (let r = 0; r < rows.length; r++) {
        const c = rows[r].indexOf(focusedIndex);
        if (c !== -1) { rowIdx = r; colIdx = c; break; }
      }
      if (rowIdx === -1) return;

      const row = rows[rowIdx];
      let newIdx = focusedIndex;
      switch (e.key) {
        case 'ArrowRight': newIdx = row[(colIdx + 1) % row.length]; break;
        case 'ArrowLeft': newIdx = row[colIdx - 1 < 0 ? row.length - 1 : colIdx - 1]; break;
        case 'ArrowDown': {
          const nr = (rowIdx + 1) % rows.length;
          newIdx = rows[nr][Math.min(colIdx, rows[nr].length - 1)];
          break;
        }
        case 'ArrowUp': {
          const nr = rowIdx - 1 < 0 ? rows.length - 1 : rowIdx - 1;
          newIdx = rows[nr][Math.min(colIdx, rows[nr].length - 1)];
          break;
        }
      }
      setFocusedIndex(newIdx);
    }

    if (e.key === 'Enter' && focusedIndex >= 0) {
      const p = DEMO_PRODUCTS[focusedIndex];
      const container = containerRef.current;
      if (p && container) {
        const rect = container.getBoundingClientRect();
        const zoomScale = 1.2;
        targetTransformRef.current.scale = zoomScale;
        targetTransformRef.current.x = rect.width / 2 - (p.grid_position.x + 110) * zoomScale;
        targetTransformRef.current.y = rect.height / 2 - (p.grid_position.y + 140) * zoomScale;
        setScaleState(zoomScale);
        setTimeout(() => setSelectedIndex(focusedIndex), 350);
      } else {
        setSelectedIndex(focusedIndex);
      }
    }
    if (e.key === '=' || e.key === '+') setScaleSmooth(Math.min(MAX_SCALE, targetTransformRef.current.scale * 1.15));
    if (e.key === '-') setScaleSmooth(Math.max(minScaleRef.current, targetTransformRef.current.scale * 0.85));
  }, [focusedIndex, selectedIndex, setScaleSmooth]);

  // Pan to focused product when zoomed in
  useEffect(() => {
    if (focusedIndex < 0) return;
    const p = DEMO_PRODUCTS[focusedIndex];
    const container = containerRef.current;
    if (!container || !p) return;
    const rect = container.getBoundingClientRect();
    const s = targetTransformRef.current.scale;

    // Only pan if zoomed in beyond fit
    const fitScale = Math.min(rect.width / CANVAS_W, rect.height / CANVAS_H);
    if (s <= fitScale * 1.1) return;

    // Always center the focused tile when zoomed in
    targetTransformRef.current.x = rect.width / 2 - (p.grid_position.x + 110) * s;
    targetTransformRef.current.y = rect.height / 2 - (p.grid_position.y + 140) * s;
  }, [focusedIndex]);

  return (
    <div ref={rootRef} className="relative w-full h-screen overflow-hidden bg-background select-none outline-none" tabIndex={0} onKeyDown={handleKeyDown} onClick={() => rootRef.current?.focus()}>
      {/* Top bar — Yeezy style: + left, categories center, bag right */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
        <span className="font-display text-sm font-semibold tracking-[0.2em] text-foreground uppercase">
          CART BLANCHE
        </span>

        {/* Centered category nav */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5 bg-foreground/[0.06] backdrop-blur-xl border border-foreground/[0.08] rounded-full px-2 py-1 shadow-[0_4px_30px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`font-display text-[11px] tracking-[0.15em] uppercase transition-all duration-300 rounded-full px-4 py-1.5 ${
                  activeCategory === cat
                    ? 'bg-foreground/[0.12] text-foreground font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_3px_rgba(0,0,0,0.2)]'
                    : 'text-muted-foreground hover:text-foreground/80 hover:bg-foreground/[0.05]'
                }`}
              >
                {cat === 'ALL' ? 'NEW' : cat.replace('-', ' ')}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <button onClick={toggleCart} className="relative p-2 hover:opacity-70 transition-opacity">
            <ShoppingBag className="w-5 h-5 text-foreground/70" />
            {itemCount > 0 && (
              <motion.span key={itemCount} initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-foreground text-background text-[9px] font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </motion.span>
            )}
          </button>
          <button onClick={() => navigate('/admin')} className="p-2 hover:opacity-70 transition-opacity">
            <LayoutDashboard className="w-5 h-5 text-foreground/70" />
          </button>
        </div>
      </div>

      {/* Spatial Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <div
          ref={canvasRef}
          style={{
            transformOrigin: '0 0',
            width: CANVAS_W,
            height: CANVAS_H,
            position: 'relative',
            willChange: 'transform',
          }}
        >
          {/* No hotzone layer — clean grid */}
          {DEMO_PRODUCTS.map((product, i) => {
            // Filter by category — hide non-matching tiles
            if (activeCategory !== 'ALL' && product.category.toUpperCase() !== activeCategory) return null;
            return (
              <ProductTile key={product.id} product={product} scale={scaleState}
                isFocused={focusedIndex === i} onClick={() => setSelectedIndex(i)} />
            );
          })}
        </div>
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-6 left-6 z-20 text-xs text-muted-foreground/50 font-display tracking-wider space-y-1">
        <p>SCROLL TO ZOOM · DRAG TO PAN</p>
        <p>ARROW KEYS TO NAVIGATE · ENTER TO VIEW</p>
      </div>

      {/* Social icons */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground/50 hover:text-foreground transition-colors">
          <Instagram className="w-4 h-4" />
        </a>
        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground/50 hover:text-foreground transition-colors">
          <Twitter className="w-4 h-4" />
        </a>
      </div>

      {/* Full-screen product view */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <ProductView
            productIndex={selectedIndex}
            onClose={() => {
              setFocusedIndex(selectedIndex);
              setSelectedIndex(null);
              maxZoomTriggeredRef.current = false;
              setTimeout(() => rootRef.current?.focus(), 50);
            }}
            onNavigate={(newIdx) => setSelectedIndex(newIdx)}
          />
        )}
      </AnimatePresence>

      {/* Cart */}
      <CartDrawer />
    </div>
  );
}
