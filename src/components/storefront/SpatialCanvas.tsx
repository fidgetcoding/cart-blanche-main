import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, User, LayoutDashboard, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DEMO_PRODUCTS, DEMO_HOTZONES, type DemoProduct } from '@/data/demo-data';
import { ProductTile } from '@/components/storefront/ProductTile';
import { HotzoneLayer } from '@/components/storefront/HotzoneLayer';
import { ProductView } from '@/components/storefront/ProductView';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { useCart } from '@/contexts/CartContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CANVAS_W = 2000;
const CANVAS_H = 1600;
const MIN_SCALE = 0.55;
const MAX_SCALE = 2;
const ZOOM_SENSITIVITY = 0.0025;

export function SpatialCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Use refs for high-frequency transform updates (no re-renders)
  const transformRef = useRef({ x: 0, y: 0, scale: 0.55 });
  const targetTransformRef = useRef({ x: 0, y: 0, scale: 0.55 });
  const rafRef = useRef<number>(0);

  // React state only for UI that needs re-renders
  const [scaleState, setScaleState] = useState(0.55);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, panStartX: 0, panStartY: 0, dragging: false });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const { toggleCart, itemCount } = useCart();
  const navigate = useNavigate();

  // Apply transform directly to DOM
  const applyTransform = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const { x, y, scale } = transformRef.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, []);

  // Smooth interpolation loop
  useEffect(() => {
    let running = true;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const LERP_SPEED = 0.18;

    const tick = () => {
      if (!running) return;
      const t = transformRef.current;
      const target = targetTransformRef.current;

      // Only interpolate when not dragging (dragging is direct)
      if (!dragRef.current.dragging) {
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

  // Wheel handler — updates target, lerp loop smoothly catches up
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scaleUpdateTimer: number;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const target = targetTransformRef.current;
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const oldScale = target.scale;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * (1 + delta)));
      const ratio = newScale / oldScale;

      target.x = cursorX - (cursorX - target.x) * ratio;
      target.y = cursorY - (cursorY - target.y) * ratio;
      target.scale = newScale;

      // Debounced React state update for zoom label
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
  }, []);

  // Dragging — direct manipulation (no lerp)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panStartX: transformRef.current.x,
      panStartY: transformRef.current.y,
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
    // Keep target in sync
    targetTransformRef.current.x = t.x;
    targetTransformRef.current.y = t.y;
    applyTransform();
  }, [applyTransform]);

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
    setIsDragging(false);
  }, []);

  // Set scale from zoom level buttons
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

  useEffect(() => { rootRef.current?.focus(); }, []);

  // Grid keyboard nav with wrapping
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
      // Zoom into the product first, then open detail view
      const p = DEMO_PRODUCTS[focusedIndex];
      const container = containerRef.current;
      if (p && container) {
        const rect = container.getBoundingClientRect();
        const zoomScale = 1.2;
        targetTransformRef.current.scale = zoomScale;
        targetTransformRef.current.x = rect.width / 2 - (p.grid_position.x + 110) * zoomScale;
        targetTransformRef.current.y = rect.height / 2 - (p.grid_position.y + 140) * zoomScale;
        setScaleState(zoomScale);
        // Open detail view after zoom animation
        setTimeout(() => setSelectedIndex(focusedIndex), 350);
      } else {
        setSelectedIndex(focusedIndex);
      }
    }
    if (e.key === '=' || e.key === '+') setScaleSmooth(Math.min(MAX_SCALE, targetTransformRef.current.scale * 1.15));
    if (e.key === '-') setScaleSmooth(Math.max(MIN_SCALE, targetTransformRef.current.scale * 0.85));
  }, [focusedIndex, selectedIndex, setScaleSmooth]);

  // Pan to focused product
  useEffect(() => {
    if (focusedIndex < 0) return;
    const p = DEMO_PRODUCTS[focusedIndex];
    const container = containerRef.current;
    if (!container || !p) return;
    const rect = container.getBoundingClientRect();
    const s = targetTransformRef.current.scale;
    targetTransformRef.current.x = rect.width / 2 - (p.grid_position.x + 110) * s;
    targetTransformRef.current.y = rect.height / 2 - (p.grid_position.y + 140) * s;
  }, [focusedIndex]);

  const zoomLabel = scaleState < 0.65 ? 'L1' : scaleState < 1.2 ? 'L2' : 'L3';
  const zoomLevels = ['L1', 'L2', 'L3'];
  const zoomScales = [0.55, 0.9, 1.5];

  return (
    <div ref={rootRef} className="relative w-full h-screen overflow-hidden bg-background select-none outline-none" tabIndex={0} onKeyDown={handleKeyDown} onClick={() => rootRef.current?.focus()}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
        <h1 className="font-display text-xl font-bold tracking-[0.2em]">CART BLANCHE</h1>
        <div className="flex items-center gap-1">
          {zoomLevels.map((level, i) => (
            <button
              key={level}
              onClick={() => setScaleSmooth(zoomScales[i])}
              className={`font-display text-[11px] tracking-[0.15em] px-3 py-1.5 transition-colors ${
                zoomLabel === level
                  ? 'text-foreground'
                  : 'text-muted-foreground/40 hover:text-muted-foreground'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleCart} className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <motion.span key={itemCount} initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </motion.span>
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <User className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 bg-popover border border-border shadow-lg">
              <DropdownMenuItem onClick={() => navigate('/admin')} className="gap-2 cursor-pointer">
                <LayoutDashboard className="w-4 h-4" />
                Admin Portal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/auth')} className="gap-2 cursor-pointer">
                <LogIn className="w-4 h-4" />
                Sign In
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Canvas */}
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
            transform: `translate3d(0px, 0px, 0) scale(0.55)`,
          }}
        >
          <HotzoneLayer hotzones={DEMO_HOTZONES} scale={scaleState} />
          {DEMO_PRODUCTS.map((product, i) => (
            <ProductTile key={product.id} product={product} scale={scaleState}
              isFocused={focusedIndex === i} onClick={() => setSelectedIndex(i)} />
          ))}
        </div>
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-6 left-6 z-20 text-xs text-muted-foreground font-display tracking-wider space-y-1">
        <p>SCROLL TO ZOOM · DRAG TO PAN</p>
        <p>ARROW KEYS TO NAVIGATE · ENTER TO VIEW</p>
      </div>

      {/* Full-screen product view */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <ProductView
            productIndex={selectedIndex}
            onClose={() => {
              setFocusedIndex(selectedIndex);
              setSelectedIndex(null);
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
