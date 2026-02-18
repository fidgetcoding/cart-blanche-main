import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, LayoutDashboard, Instagram, Twitter, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { ProductTile } from '@/components/storefront/ProductTile';
import { ProductView } from '@/components/storefront/ProductView';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { useCart } from '@/contexts/CartContext';

import { useStyleKit } from '@/contexts/StyleKitContext';
import { useIsMobile } from '@/hooks/use-mobile';

const TILE_W = 220;
const TILE_H = 300;
const TILE_GAP = 6;
const CANVAS_W = 1360;
const CANVAS_H = 1230;
const MAX_SCALE = 2;
const MAX_ZOOM_THRESHOLD = 1.9;
const ZOOM_SENSITIVITY = 0.0025;

const CATEGORIES = ['ALL', ...new Set(DEMO_PRODUCTS.map(p => p.category.toUpperCase()))];

export function SpatialCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Transform refs for high-frequency updates
  const transformRef = useRef({ x: 0, y: 0, scale: 0.5 });
  const targetTransformRef = useRef({ x: 0, y: 0, scale: 0.5 });
  const rafRef = useRef<number>(0);
  const minScaleRef = useRef(0.3);

  // React state for UI that needs re-renders
  const [scaleState, setScaleState] = useState(0.5);
  const [footerGlass, setFooterGlass] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, panStartX: 0, panStartY: 0, dragging: false });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const activeCategoryRef = useRef('ALL');
  const [peekingAll, setPeekingAll] = useState(false);
  const categoryZoomRef = useRef<{ x: number; y: number; scale: number } | null>(null);
  const peekTimerRef = useRef<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const maxZoomTriggeredRef = useRef(false);
  const { toggleCart, itemCount } = useCart();
  
  const { addItem } = useCart();
  const { openStyleKit } = useStyleKit();
  const navigate = useNavigate();

  // Touch gesture refs
  const touchRef = useRef<{
    startX: number; startY: number;
    panStartX: number; panStartY: number;
    lastDist: number; lastScale: number;
    touching: boolean; pinching: boolean;
  }>({ startX: 0, startY: 0, panStartX: 0, panStartY: 0, lastDist: 0, lastScale: 1, touching: false, pinching: false });

  // Keep ref in sync for animation loop
  useEffect(() => { activeCategoryRef.current = activeCategory; }, [activeCategory]);

  // Compute reflowed positions when filtering by category
  const overridePositions = useMemo(() => {
    if (activeCategory === 'ALL') return null;
    const visible = DEMO_PRODUCTS
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.category.toUpperCase() === activeCategory);
    if (visible.length === 0) return null;

    const count = visible.length;
    const cols = isMobile ? 2 : Math.ceil(Math.sqrt(count));

    const positions: Record<number, { x: number; y: number }> = {};
    visible.forEach(({ i }, idx) => {
      positions[i] = {
        x: (idx % cols) * (TILE_W + TILE_GAP),
        y: Math.floor(idx / cols) * (TILE_H + TILE_GAP),
      };
    });
    return positions;
  }, [activeCategory, isMobile]);

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
    const padX = isMobile ? 16 : 40;
    const headerPad = isMobile ? 90 : 100;
    const bottomPad = isMobile ? 60 : 80;
    const fitScale = Math.min(
      (rect.width - padX * 2) / CANVAS_W,
      (rect.height - headerPad - bottomPad) / CANVAS_H
    );
    const s = Math.max(0.3, Math.min(1, fitScale));
    minScaleRef.current = s;
    const cx = (rect.width - CANVAS_W * s) / 2;
    const availH = rect.height - headerPad - bottomPad;
    const cy = headerPad + (availH - CANVAS_H * s) / 2;
    transformRef.current = { x: cx, y: cy, scale: s };
    targetTransformRef.current = { x: cx, y: cy, scale: s };
    setScaleState(s);
    applyTransform();
  }, [applyTransform, isMobile]);

  // Fit canvas to visible products when category changes
  const fitToVisibleProducts = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const visibleWithIndex = DEMO_PRODUCTS
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => activeCategory === 'ALL' || p.category.toUpperCase() === activeCategory);
    if (visibleWithIndex.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const { p, i } of visibleWithIndex) {
      const pos = overridePositions ? overridePositions[i] : p.grid_position;
      if (!pos) continue;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + TILE_W);
      maxY = Math.max(maxY, pos.y + TILE_H);
    }

    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const padX = isMobile ? 20 : 120;
    const headerPad = isMobile ? 90 : 120;
    const bottomPad = isMobile ? 70 : 100;
    const fitScale = Math.min(
      (rect.width - padX * 2) / bboxW,
      (rect.height - headerPad - bottomPad) / bboxH
    );
    // Cap at 1.0 so filtered views don't blow up too large
    const s = Math.max(0.15, Math.min(1, fitScale));
    const scaledW = bboxW * s;
    const scaledH = bboxH * s;
    const cx = (rect.width - scaledW) / 2 - minX * s;
    const cy = headerPad + ((rect.height - headerPad - bottomPad) - scaledH) / 2 - minY * s;

    targetTransformRef.current = { x: cx, y: cy, scale: s };
    if (activeCategory !== 'ALL') {
      categoryZoomRef.current = { x: cx, y: cy, scale: s };
    }
    setScaleState(s);
    setPeekingAll(false);
  }, [activeCategory, overridePositions, isMobile]);

  useEffect(() => {
    fitToVisibleProducts();
  }, [fitToVisibleProducts]);

  // Smooth interpolation loop
  useEffect(() => {
    let running = true;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const LERP_SPEED = 0.18;

    const tick = () => {
      if (!running) return;
      const t = transformRef.current;
      const target = targetTransformRef.current;

      if (!dragRef.current.dragging && !touchRef.current.touching) {
        const dx = Math.abs(t.x - target.x);
        const dy = Math.abs(t.y - target.y);
        const ds = Math.abs(t.scale - target.scale);

        // When scale is stable, apply boundary constraints (only for ALL view)
        // For filtered views, fitToVisibleProducts already computed the correct centered position
        if (ds < 0.001 && activeCategoryRef.current === 'ALL') {
          const container = containerRef.current;
          if (container) {
            const rect = container.getBoundingClientRect();
            const scaledW = CANVAS_W * target.scale;
            const scaledH = CANVAS_H * target.scale;
            const headerPad = 100;
            const bottomPad = 80;
            const sidePad = 80;

            if (scaledW <= rect.width && scaledH <= rect.height - headerPad) {
              target.x = (rect.width - scaledW) / 2;
              const availH = rect.height - headerPad - bottomPad;
              target.y = headerPad + (availH - scaledH) / 2;
            } else {
              if (scaledW > rect.width) {
                const minX = rect.width - scaledW - sidePad;
                const maxX = sidePad;
                target.x = Math.max(minX, Math.min(maxX, target.x));
              } else {
                target.x = (rect.width - scaledW) / 2;
              }
              if (scaledH > rect.height - headerPad) {
                const minY = rect.height - scaledH - bottomPad;
                const maxY = headerPad;
                target.y = Math.max(minY, Math.min(maxY, target.y));
              } else {
                const availH = rect.height - headerPad;
                target.y = headerPad + (availH - scaledH) / 2;
              }
            }
          }
        }

        if (dx > 0.1 || dy > 0.1 || ds > 0.0001) {
          t.x = lerp(t.x, target.x, LERP_SPEED);
          t.y = lerp(t.y, target.y, LERP_SPEED);
          t.scale = lerp(t.scale, target.scale, LERP_SPEED);
          applyTransform();
        }
      }

      // Check if canvas content extends into footer zone
      const ctr = containerRef.current;
      if (ctr) {
        const r = ctr.getBoundingClientRect();
        const canvasBottom = t.y + CANVAS_H * t.scale;
        const footerZone = r.height - 70;
        // Use hysteresis: require more clearance to turn off than to turn on
        const shouldGlass = canvasBottom > footerZone;
        const shouldClear = canvasBottom < footerZone - 20;
        if (shouldGlass) setFooterGlass(true);
        else if (shouldClear) setFooterGlass(false);
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
    const canvasX = (screenX - rect.left - t.x) / t.scale;
    const canvasY = (screenY - rect.top - t.y) / t.scale;

    for (let i = 0; i < DEMO_PRODUCTS.length; i++) {
      const p = DEMO_PRODUCTS[i];
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

      if (newScale < MAX_ZOOM_THRESHOLD) {
        maxZoomTriggeredRef.current = false;
      }

      // Peek-all: when zooming out with a category filter active
      if (activeCategory !== 'ALL' && categoryZoomRef.current) {
        if (newScale < categoryZoomRef.current.scale * 0.85) {
          setPeekingAll(true);
        }
      }

      // On scroll idle, commit to ALL if peeking
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = window.setTimeout(() => {
        setScaleState(targetTransformRef.current.scale);
        if (activeCategory !== 'ALL' && categoryZoomRef.current) {
          if (targetTransformRef.current.scale < categoryZoomRef.current.scale * 0.85) {
            // Commit to ALL view: reset category, clear peek state
            setActiveCategory('ALL');
            categoryZoomRef.current = null;
            setPeekingAll(false);
          }
        }
      }, 300);

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
  }, [getProductAtCursor, activeCategory]);

  // Touch gestures (pan + pinch-to-zoom)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getTouchDist = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touches: TouchList) => {
      if (touches.length < 2) return { x: touches[0].clientX, y: touches[0].clientY };
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    };

    let scaleUpdateTimer: number;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchRef.current = {
          startX: t.clientX, startY: t.clientY,
          panStartX: transformRef.current.x, panStartY: transformRef.current.y,
          lastDist: 0, lastScale: targetTransformRef.current.scale,
          touching: true, pinching: false,
        };
      } else if (e.touches.length === 2) {
        e.preventDefault();
        touchRef.current.pinching = true;
        touchRef.current.lastDist = getTouchDist(e.touches);
        touchRef.current.lastScale = targetTransformRef.current.scale;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const tr = touchRef.current;
      if (!tr.touching) return;

      if (tr.pinching && e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        const center = getTouchCenter(e.touches);
        const rect = container.getBoundingClientRect();
        const cx = center.x - rect.left;
        const cy = center.y - rect.top;

        const scaleFactor = dist / tr.lastDist;
        const oldScale = targetTransformRef.current.scale;
        const newScale = Math.max(minScaleRef.current, Math.min(MAX_SCALE, tr.lastScale * scaleFactor));
        const ratio = newScale / oldScale;

        const target = targetTransformRef.current;
        target.x = cx - (cx - target.x) * ratio;
        target.y = cy - (cy - target.y) * ratio;
        target.scale = newScale;

        // Also apply pan during pinch
        transformRef.current.x = target.x;
        transformRef.current.y = target.y;
        transformRef.current.scale = target.scale;
        applyTransform();

        clearTimeout(scaleUpdateTimer);
        scaleUpdateTimer = window.setTimeout(() => {
          setScaleState(targetTransformRef.current.scale);
        }, 80);
      } else if (e.touches.length === 1 && !tr.pinching) {
        const t = e.touches[0];
        const dx = t.clientX - tr.startX;
        const dy = t.clientY - tr.startY;
        transformRef.current.x = tr.panStartX + dx;
        transformRef.current.y = tr.panStartY + dy;
        targetTransformRef.current.x = transformRef.current.x;
        targetTransformRef.current.y = transformRef.current.y;
        applyTransform();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchRef.current.pinching = false;
      }
      if (e.touches.length === 0) {
        touchRef.current.touching = false;
        setScaleState(targetTransformRef.current.scale);
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      clearTimeout(scaleUpdateTimer);
    };
  }, [applyTransform]);

  // Drag to pan (mouse)
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

  // Focus root on mount and refocus after any click within the canvas
  useEffect(() => {
    rootRef.current?.focus();
    const root = rootRef.current;
    if (!root) return;
    const refocus = () => { setTimeout(() => root.focus(), 0); };
    root.addEventListener('click', refocus, true); // capture phase
    return () => root.removeEventListener('click', refocus, true);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (selectedIndex !== null) {
        // Close product detail overlay and refocus root
        setSelectedIndex(null);
        maxZoomTriggeredRef.current = false;
        requestAnimationFrame(() => rootRef.current?.focus());
        return;
      }
      // Zoom out to fit-all view
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const padX = isMobile ? 16 : 40;
        const padY = isMobile ? 60 : 80;
        const fitScale = Math.min(
          (rect.width - padX * 2) / CANVAS_W,
          (rect.height - padY * 2) / CANVAS_H
        );
        const s = Math.max(0.3, Math.min(1, fitScale));
        const cx = (rect.width - CANVAS_W * s) / 2;
        const cy = (rect.height - CANVAS_H * s) / 2;
        targetTransformRef.current = { x: cx, y: cy, scale: s };
        setScaleState(s);
        setFocusedIndex(-1);
        setHoveredIndex(null);
        if (activeCategory !== 'ALL') {
          setActiveCategory('ALL');
          categoryZoomRef.current = null;
          setPeekingAll(false);
        }
      }
      return;
    }
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
      setHoveredIndex(null);
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
  }, [focusedIndex, selectedIndex, setScaleSmooth, isMobile, activeCategory]);

  // Pan to focused product when zoomed in
  useEffect(() => {
    if (focusedIndex < 0) return;
    const p = DEMO_PRODUCTS[focusedIndex];
    const container = containerRef.current;
    if (!container || !p) return;
    const rect = container.getBoundingClientRect();
    const s = targetTransformRef.current.scale;

    const fitScale = Math.min(rect.width / CANVAS_W, rect.height / CANVAS_H);
    if (s <= fitScale * 1.1) return;

    targetTransformRef.current.x = rect.width / 2 - (p.grid_position.x + 110) * s;
    targetTransformRef.current.y = rect.height / 2 - (p.grid_position.y + 140) * s;
  }, [focusedIndex]);

  const compactHeader = isMobile || isTablet;

  return (
    <div ref={rootRef} className="relative w-full h-screen overflow-hidden dynamic-bg select-none outline-none" tabIndex={0} onKeyDown={handleKeyDown} onClick={() => rootRef.current?.focus()}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 liquid-glass flex items-center justify-between px-4 md:px-6 py-3 md:py-5">
        {/* Left: Brand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-display text-xs md:text-sm font-semibold tracking-[0.2em] text-foreground uppercase">
            CART BLANCHE
          </span>
        </div>

        {/* Center: Category nav — full on desktop, hamburger on mobile */}
        {!compactHeader ? (
          <nav className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1 bg-foreground/[0.06] backdrop-blur-xl border border-foreground/[0.08] rounded-lg px-1.5 py-1 shadow-[0_4px_30px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`font-display text-[11px] tracking-[0.15em] uppercase transition-all duration-300 rounded-md px-4 py-1.5 whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-foreground/[0.12] text-foreground font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_3px_rgba(0,0,0,0.2)]'
                      : 'text-muted-foreground hover:text-foreground/80 hover:bg-foreground/[0.05]'
                  }`}
                >
                  {cat === 'ALL' ? 'ALL' : cat.replace('-', ' ')}
                </button>
              ))}
            </div>
          </nav>
        ) : (
          /* Mobile/tablet: scrollable category pills */
          <div className="flex-1 mx-3 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1.5 w-max">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`font-display text-[10px] tracking-[0.12em] uppercase transition-all duration-200 rounded-md px-3 py-1.5 whitespace-nowrap flex-shrink-0 ${
                    activeCategory === cat
                      ? 'bg-foreground/[0.15] text-foreground font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {cat === 'ALL' ? 'ALL' : cat.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
          <button onClick={() => navigate('/admin')} className="group flex items-center gap-1.5 p-1.5 md:p-2 hover:opacity-70 transition-opacity" title="Smart Portal">
            <LayoutDashboard className="w-4 h-4 text-foreground/70" />
            <span className="overflow-hidden max-w-0 group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out text-[10px] font-display tracking-wider text-foreground/60 whitespace-nowrap">SMART PORTAL</span>
          </button>
          <button onClick={toggleCart} className="relative p-2 md:p-2.5 rounded-xl bg-foreground/10 border border-foreground/10 hover:bg-foreground/20 hover:border-foreground/20 transition-all">
            <ShoppingBag className="w-4 md:w-5 h-4 md:h-5 text-foreground" />
            {itemCount > 0 && (
              <motion.span key={itemCount} initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-foreground text-background text-[9px] font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      {/* Spatial Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
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
          {DEMO_PRODUCTS.map((product, i) => {
            const isInCategory = activeCategory === 'ALL' || product.category.toUpperCase() === activeCategory;
            // Hide non-matching products unless we're peeking
            if (!isInCategory && !peekingAll) return null;
            // When peeking, use original positions for all; when filtered, use overrides
            const posOverride = peekingAll ? undefined : (overridePositions ? overridePositions[i] : undefined);
            const isDimmed = peekingAll && !isInCategory;
            return (
              <ProductTile key={product.id} product={product} scale={scaleState}
                isFocused={focusedIndex === i && hoveredIndex === null}
                isHovered={hoveredIndex === i}
                dimmed={isDimmed}
                onClick={() => setSelectedIndex(i)}
                onHoverStart={() => { setHoveredIndex(i); setFocusedIndex(-1); }}
                onHoverEnd={() => setHoveredIndex(null)}
                onQuickAdd={(e) => {
                  e.stopPropagation();
                  const v = product.variants[0];
                  if (v) addItem({ productId: product.id, variantId: v.id, title: product.title, variantTitle: v.title, price: v.price ?? product.price });
                }}
                onQuickStyleKit={(e) => {
                  e.stopPropagation();
                  openStyleKit(product);
                }}
                positionOverride={posOverride} />
            );
          })}
        </div>
      </div>

      {/* Unified bottom footer */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className={`absolute inset-0 liquid-glass transition-opacity duration-500 pointer-events-none ${footerGlass ? 'opacity-100' : 'opacity-0'}`} />
        <div className="relative flex items-end justify-between px-4 md:px-6 py-3 md:py-5">
          {/* Hints */}
          <div className={`text-[10px] md:text-xs font-display tracking-wider space-y-0.5 cursor-default transition-colors duration-500 hover:text-foreground/80 ${footerGlass ? 'text-muted-foreground/60' : 'text-muted-foreground/30'}`}>
            <p className="block md:hidden">PINCH TO ZOOM · DRAG TO PAN · TAP TO VIEW</p>
            <div className="hidden md:block space-y-0.5">
              <p>SCROLL TO ZOOM · DRAG TO PAN · CLICK TO VIEW</p>
              <p>ARROW KEYS TO NAVIGATE · ENTER TO VIEW</p>
            </div>
          </div>
          {/* Social icons */}
          <div className="flex items-center gap-2 md:gap-3">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-1.5 md:p-2 text-muted-foreground/50 hover:text-foreground transition-colors">
              <Instagram className="w-3.5 md:w-4 h-3.5 md:h-4" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-1.5 md:p-2 text-muted-foreground/50 hover:text-foreground transition-colors">
              <Twitter className="w-3.5 md:w-4 h-3.5 md:h-4" />
            </a>
          </div>
        </div>
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

// Tablet detection hook
function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsTablet(w >= 768 && w <= 1024);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isTablet;
}