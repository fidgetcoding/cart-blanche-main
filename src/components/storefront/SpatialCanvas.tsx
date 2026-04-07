import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, LayoutDashboard, Instagram, Twitter, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ProductTile } from '@/components/storefront/ProductTile';
import { ProductView } from '@/components/storefront/ProductView';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { useCart } from '@/contexts/CartContext';
import { useGridLayout } from '@/hooks/use-grid-layout';

import { useStyleKit } from '@/contexts/StyleKitContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/contexts/ThemeContext';

const TILE_W = 220;
const TILE_H = 300;
const TILE_GAP = 6;
const MAX_SCALE = 2;
const MAX_ZOOM_THRESHOLD = 1.9;
const ZOOM_SENSITIVITY = 0.004;
const PINCH_ZOOM_SENSITIVITY = 0.012;
const COLS = 5;
const ITEMS_PER_PAGE = 20;

export function SpatialCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { themeSettings } = useTheme();

  // Load layout from Supabase
  const { loading: layoutLoading, getOrderedProducts, getOrderedCategories } = useGridLayout();
  const DEMO_PRODUCTS = useMemo(() => getOrderedProducts(), [getOrderedProducts]);
  const CATEGORIES = useMemo(() => getOrderedCategories(), [getOrderedCategories]);

  // Pagination: filter by Navigation Tag first, then paginate
  const [currentPage, setCurrentPage] = useState(0);
  const pageSwipeRef = useRef<number>(0);

  const [activeCategory, setActiveCategory] = useState('ALL');
  const activeCategoryRef = useRef('ALL');

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'ALL') return DEMO_PRODUCTS;
    return DEMO_PRODUCTS.filter(p => p.category.toUpperCase() === activeCategory);
  }, [DEMO_PRODUCTS, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const pageProducts = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Compute page-local grid positions for current page's products
  const displayPositions = useMemo(() => {
    const positions: Record<number, { x: number; y: number }> = {};
    const cols = COLS;
    pageProducts.forEach((product, idx) => {
      const globalIdx = DEMO_PRODUCTS.indexOf(product);
      if (globalIdx !== -1) {
        positions[globalIdx] = {
          x: (idx % cols) * (TILE_W + TILE_GAP),
          y: Math.floor(idx / cols) * (TILE_H + TILE_GAP),
        };
      }
    });
    return positions;
  }, [pageProducts, DEMO_PRODUCTS]);

  const [peekingAll, setPeekingAll] = useState(false);

  const CANVAS_W = COLS * (TILE_W + TILE_GAP) - TILE_GAP;
  const CANVAS_H = Math.max(1, Math.ceil(DEMO_PRODUCTS.length / COLS)) * (TILE_H + TILE_GAP) - TILE_GAP;

  // Keep canvas dimensions in refs for the animation loop
  const canvasDimsRef = useRef({ w: CANVAS_W, h: CANVAS_H });
  canvasDimsRef.current = { w: CANVAS_W, h: CANVAS_H };

  // Transform refs for high-frequency updates
  const transformRef = useRef({ x: 0, y: 0, scale: 0.5 });
  const targetTransformRef = useRef({ x: 0, y: 0, scale: 0.5 });
  const rafRef = useRef<number>(0);
  const animatingRef = useRef(false);
  const minScaleRef = useRef(0.3);

  // React state for UI that needs re-renders
  const [scaleState, setScaleState] = useState(0.5);
  const [footerGlass, setFooterGlass] = useState(false);
  const [footerIntroVisible, setFooterIntroVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, panStartX: 0, panStartY: 0, dragging: false });
  const didDragRef = useRef(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const categoryZoomRef = useRef<{ x: number; y: number; scale: number } | null>(null);
  const peekTimerRef = useRef<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const maxZoomTriggeredRef = useRef(false);
  const { toggleCart, itemCount } = useCart();
  
  const { addItem } = useCart();
  const { openStyleKit, isOpen: styleKitOpen } = useStyleKit();
  const navigate = useNavigate();

  // Touch gesture refs
  const touchRef = useRef<{
    startX: number; startY: number;
    panStartX: number; panStartY: number;
    lastDist: number; lastScale: number;
    lastCenterX: number; lastCenterY: number;
    touching: boolean; pinching: boolean;
  }>({ startX: 0, startY: 0, panStartX: 0, panStartY: 0, lastDist: 0, lastScale: 1, lastCenterX: 0, lastCenterY: 0, touching: false, pinching: false });

  // Keep ref in sync for animation loop
  useEffect(() => { activeCategoryRef.current = activeCategory; }, [activeCategory]);

  // Reset page when Navigation Tag changes
  useEffect(() => {
    setCurrentPage(0);
  }, [activeCategory]);

  // When StyleKit closes (e.g. after "ADD SET TO CART"), reset back to zoomed-out home view
  const prevStyleKitOpen = useRef(styleKitOpen);
  useEffect(() => {
    if (prevStyleKitOpen.current && !styleKitOpen) {
      setSelectedIndex(null);
      maxZoomTriggeredRef.current = false;
      requestAnimationFrame(() => rootRef.current?.focus());
    }
    prevStyleKitOpen.current = styleKitOpen;
  }, [styleKitOpen]);

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
    const padX = isMobile ? 20 : 120;
    const headerPad = isMobile ? 90 : 120;
    const bottomPad = isMobile ? 80 : 60;
    const fitScale = Math.min(
      (rect.width - padX * 2) / CANVAS_W,
      (rect.height - headerPad - bottomPad) / CANVAS_H
    );
    const s = Math.max(0.2, Math.min(1, fitScale));
    minScaleRef.current = s;
    const cx = (rect.width - CANVAS_W * s) / 2;
    const availH = rect.height - headerPad - bottomPad;
    const cy = headerPad + (availH - CANVAS_H * s) / 2;
    transformRef.current = { x: cx, y: cy, scale: s };
    targetTransformRef.current = { x: cx, y: cy, scale: s };
    setScaleState(s);
    applyTransform();
  }, [applyTransform, isMobile]);

  // Self-terminating animation loop — starts on demand, stops when idle
  const startAnimation = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const LERP_SPEED = 0.25;

    const tick = () => {
      if (!animatingRef.current) return;
      const t = transformRef.current;
      const target = targetTransformRef.current;

      let needsNextFrame = false;

      if (!dragRef.current.dragging && !touchRef.current.touching) {
        const dx = Math.abs(t.x - target.x);
        const dy = Math.abs(t.y - target.y);
        const ds = Math.abs(t.scale - target.scale);

        if (ds < 0.001 && activeCategoryRef.current === 'ALL') {
          const container = containerRef.current;
          if (container) {
            const rect = container.getBoundingClientRect();
            const scaledW = canvasDimsRef.current.w * target.scale;
            const scaledH = canvasDimsRef.current.h * target.scale;
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
          needsNextFrame = true;
        }
      } else {
        needsNextFrame = true;
      }

      // Check if canvas content extends into footer zone
      const ctr = containerRef.current;
      if (ctr) {
        const r = ctr.getBoundingClientRect();
        const canvasBottom = t.y + canvasDimsRef.current.h * t.scale;
        const footerZone = r.height - 50;
        const shouldGlass = canvasBottom > footerZone;
        const shouldClear = canvasBottom < footerZone - 20;
        if (shouldGlass) setFooterGlass(true);
        else if (shouldClear) setFooterGlass(false);
      }

      if (needsNextFrame) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        animatingRef.current = false;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [applyTransform]);

  useEffect(() => {
    startAnimation();
    return () => {
      animatingRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [startAnimation]);

  // Fit canvas to visible products when category/page changes
  const fitToVisibleProducts = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    if (peekingAll) {
      for (const p of DEMO_PRODUCTS) {
        const pos = p.grid_position;
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + TILE_W);
        maxY = Math.max(maxY, pos.y + TILE_H);
      }
    } else {
      const posEntries = Object.entries(displayPositions);
      if (posEntries.length === 0) return;
      for (const [, pos] of posEntries) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + TILE_W);
        maxY = Math.max(maxY, pos.y + TILE_H);
      }
    }
    if (minX === Infinity) return;

    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const padX = isMobile ? 20 : 120;
    const headerPad = isMobile ? 90 : 120;
    const bottomPad = isMobile ? 80 : 60;
    const fitScale = Math.min(
      (rect.width - padX * 2) / bboxW,
      (rect.height - headerPad - bottomPad) / bboxH
    );
    const s = Math.max(0.15, Math.min(1, fitScale));
    const scaledW = bboxW * s;
    const scaledH = bboxH * s;
    const cx = (rect.width - scaledW) / 2 - minX * s;
    const cy = headerPad + ((rect.height - headerPad - bottomPad) - scaledH) / 2 - minY * s;

    targetTransformRef.current = { x: cx, y: cy, scale: s };
    startAnimation();
    if (activeCategory !== 'ALL') {
      categoryZoomRef.current = { x: cx, y: cy, scale: s };
    }
    setScaleState(s);
    setPeekingAll(false);
  }, [activeCategory, displayPositions, isMobile, startAnimation, peekingAll, DEMO_PRODUCTS]);

  // Instant version of fitToVisibleProducts — snaps transform without animation
  const snapToFitVisible = useCallback(() => {
    fitToVisibleProducts();
    // Copy target to current transform immediately — no lerp
    const target = targetTransformRef.current;
    transformRef.current = { x: target.x, y: target.y, scale: target.scale };
    applyTransform();
  }, [fitToVisibleProducts, applyTransform]);

  useEffect(() => {
    fitToVisibleProducts();
  }, [fitToVisibleProducts]);

  // Re-fit when page changes
  useEffect(() => {
    fitToVisibleProducts();
  }, [currentPage, fitToVisibleProducts]);

  // Find the product index under a given screen coordinate
  const getProductAtCursor = useCallback((screenX: number, screenY: number) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const t = targetTransformRef.current;
    const canvasX = (screenX - rect.left - t.x) / t.scale;
    const canvasY = (screenY - rect.top - t.y) / t.scale;

    for (const [idxStr, pos] of Object.entries(displayPositions)) {
      const i = Number(idxStr);
      if (canvasX >= pos.x && canvasX <= pos.x + TILE_W && canvasY >= pos.y && canvasY <= pos.y + TILE_H) {
        return i;
      }
    }
    return null;
  }, [displayPositions]);

  // Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setFooterIntroVisible(false);
      
      const target = targetTransformRef.current;

      // Dead zone check: if cursor is NOT over a product tile
      const isOverProduct = getProductAtCursor(e.clientX, e.clientY) !== null;
      if (!isOverProduct) {
        // Horizontal scroll in dead zone = page change (carousel swipe) — only if multiple pages exist
        if (totalPages > 1) {
          const absX = Math.abs(e.deltaX);
          const absY = Math.abs(e.deltaY);
          if (absX > absY && absX > 15) {
            const now = Date.now();
            if (now - pageSwipeRef.current > 400) {
              pageSwipeRef.current = now;
              setCurrentPage(prev => {
                if (e.deltaX > 0) {
                  return prev >= totalPages - 1 ? 0 : prev + 1;
                } else {
                  return prev <= 0 ? totalPages - 1 : prev - 1;
                }
              });
            }
            return;
          }
        }
        // Vertical scroll in dead zone: only allow zoom OUT
        if (e.deltaY < 0) return;
      }

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
      // Trackpad pinch fires ctrlKey + small deltaY; scroll wheel fires larger deltaY
      const isPinch = e.ctrlKey;
      const sensitivity = isPinch ? PINCH_ZOOM_SENSITIVITY : ZOOM_SENSITIVITY;
      const delta = -e.deltaY * sensitivity;
      const oldScale = target.scale;
      const newScale = Math.max(minScaleRef.current, Math.min(MAX_SCALE, oldScale * Math.exp(delta)));
      const ratio = newScale / oldScale;
      target.x = cursorX - (cursorX - target.x) * ratio;
      target.y = cursorY - (cursorY - target.y) * ratio;
      target.scale = newScale;

      if (newScale < MAX_ZOOM_THRESHOLD) {
        maxZoomTriggeredRef.current = false;
      }

      // Two-stage zoom-out transition: peek → switch to ALL
      if (activeCategory !== 'ALL' && categoryZoomRef.current) {
        const zoomRatio = newScale / categoryZoomRef.current.scale;
        
        if (zoomRatio < 0.95 && !peekingAll) {
          // Stage 1: Start peeking — show all products dimmed
          setPeekingAll(true);
        } else if (zoomRatio >= 0.95 && peekingAll) {
          // User reversed zoom direction — cancel peek
          setPeekingAll(false);
          clearTimeout(peekTimerRef.current);
        }
        
        if (zoomRatio < 0.78) {
          // Stage 2: Commit to ALL view
          if (!peekTimerRef.current) {
            peekTimerRef.current = window.setTimeout(() => {
              setActiveCategory('ALL');
              categoryZoomRef.current = null;
              setPeekingAll(false);
              peekTimerRef.current = 0;
            }, 350);
          }
        } else {
          // Haven't crossed commit threshold — cancel any pending timer
          if (peekTimerRef.current) {
            clearTimeout(peekTimerRef.current);
            peekTimerRef.current = 0;
          }
        }
      }

      startAnimation();
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [getProductAtCursor, activeCategory, startAnimation, totalPages]);

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

    

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchRef.current = {
          startX: t.clientX, startY: t.clientY,
          panStartX: transformRef.current.x, panStartY: transformRef.current.y,
          lastDist: 0, lastScale: targetTransformRef.current.scale,
          lastCenterX: t.clientX, lastCenterY: t.clientY,
          touching: true, pinching: false,
        };
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const center = getTouchCenter(e.touches);
        touchRef.current.pinching = true;
        touchRef.current.lastDist = getTouchDist(e.touches);
        touchRef.current.lastScale = targetTransformRef.current.scale;
        touchRef.current.lastCenterX = center.x;
        touchRef.current.lastCenterY = center.y;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const tr = touchRef.current;
      if (!tr.touching) return;

      if (tr.pinching && e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        if (dist === 0 || tr.lastDist === 0) { tr.lastDist = dist; return; }
        const center = getTouchCenter(e.touches);
        const rect = container.getBoundingClientRect();
        const cx = center.x - rect.left;
        const cy = center.y - rect.top;

        // Pan: track center movement
        const panDx = center.x - tr.lastCenterX;
        const panDy = center.y - tr.lastCenterY;

        // Incremental scale
        const scaleFactor = dist / tr.lastDist;
        const oldScale = targetTransformRef.current.scale;
        const newScale = Math.max(minScaleRef.current, Math.min(MAX_SCALE, oldScale * scaleFactor));
        const ratio = newScale / oldScale;

        const target = targetTransformRef.current;
        // Apply pan + zoom around center
        target.x = cx - (cx - target.x - panDx) * ratio;
        target.y = cy - (cy - target.y - panDy) * ratio;
        target.scale = newScale;

        // Update tracking for next frame
        tr.lastDist = dist;
        tr.lastCenterX = center.x;
        tr.lastCenterY = center.y;

        // Apply immediately
        transformRef.current.x = target.x;
        transformRef.current.y = target.y;
        transformRef.current.scale = target.scale;
        applyTransform();

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
        // Check for horizontal swipe in dead zone = page change (only if multiple pages)
        if (!touchRef.current.pinching && totalPages > 1) {
          const dx = e.changedTouches[0].clientX - touchRef.current.startX;
          const dy = e.changedTouches[0].clientY - touchRef.current.startY;
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);
          if (absX > 60 && absX > absY * 2) {
            const wasOverProduct = getProductAtCursor(touchRef.current.startX, touchRef.current.startY) !== null;
            if (!wasOverProduct) {
              setCurrentPage(prev => {
                if (dx < 0) {
                  return prev >= totalPages - 1 ? 0 : prev + 1;
                } else {
                  return prev <= 0 ? totalPages - 1 : prev - 1;
                }
              });
            }
          }
        }
        touchRef.current.touching = false;
        setScaleState(targetTransformRef.current.scale);
        startAnimation();
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [applyTransform, startAnimation, totalPages, getProductAtCursor]);

  // Drag to pan (mouse)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Don't start drag from interactive elements (links, buttons, inputs)
    const target = e.target as HTMLElement;
    if (target?.closest('a, button, input, textarea, select, [contenteditable], [role="textbox"]')) return;
    didDragRef.current = false;
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      panStartX: transformRef.current.x, panStartY: transformRef.current.y,
      dragging: true,
    };
    setIsDragging(true);
    setFooterIntroVisible(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d.dragging) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      didDragRef.current = true;
    }
    const t = transformRef.current;
    t.x = d.panStartX + dx;
    t.y = d.panStartY + dy;
    targetTransformRef.current.x = t.x;
    targetTransformRef.current.y = t.y;
    applyTransform();
  }, [applyTransform]);

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
    setIsDragging(false);
    startAnimation();
  }, [startAnimation]);

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
    startAnimation();
  }, [startAnimation]);

  // Focus root on mount and refocus after any click within the canvas
  // BUT skip refocusing when user clicks inside inputs, textareas, or other interactive elements
  useEffect(() => {
    rootRef.current?.focus();
    const root = rootRef.current;
    if (!root) return;
    const refocus = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target?.closest('a, button, input, textarea, select, [contenteditable], [role="textbox"]')) return;
      setTimeout(() => root.focus(), 0);
    };
    root.addEventListener('click', refocus, true); // capture phase
    return () => root.removeEventListener('click', refocus, true);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (selectedIndex !== null) {
        // Close product detail overlay, reset zoom, and refocus root
        setSelectedIndex(null);
        maxZoomTriggeredRef.current = false;
        snapToFitVisible();
        requestAnimationFrame(() => rootRef.current?.focus());
        return;
      }
      // Zoom out to fit-all view
      setFocusedIndex(-1);
      setHoveredIndex(null);
      if (activeCategory !== 'ALL') {
        setActiveCategory('ALL');
        categoryZoomRef.current = null;
        setPeekingAll(false);
      }
      fitToVisibleProducts();
      return;
    }
    if (selectedIndex !== null) return;

    const visibleWithIndex = DEMO_PRODUCTS
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => displayPositions[i] !== undefined);

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (focusedIndex === -1) {
        setFocusedIndex(visibleWithIndex.length > 0 ? visibleWithIndex[0].i : 0);
        return;
      }

      const positions = displayPositions;
      const yPositions = [...new Set(visibleWithIndex.map(({ i }) => {
        const pos = positions[i];
        return pos ? pos.y : 0;
      }))].sort((a, b) => a - b);

      const rows: number[][] = yPositions.map(y =>
        visibleWithIndex
          .filter(({ i }) => {
            const pos = positions[i];
            return pos && pos.y === y;
          })
          .sort((a, b) => {
            const posA = positions[a.i];
            const posB = positions[b.i];
            return (posA?.x ?? 0) - (posB?.x ?? 0);
          })
          .map(({ i }) => i)
      );

      let rowIdx = -1, colIdx = -1;
      for (let r = 0; r < rows.length; r++) {
        const c = rows[r].indexOf(focusedIndex);
        if (c !== -1) { rowIdx = r; colIdx = c; break; }
      }
      if (rowIdx === -1) {
        // focusedIndex not in current category — jump to first visible
        setFocusedIndex(visibleWithIndex.length > 0 ? visibleWithIndex[0].i : 0);
        return;
      }

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
      const pos = displayPositions[focusedIndex];
      const container = containerRef.current;
      if (p && container && pos) {
        const rect = container.getBoundingClientRect();
        const zoomScale = 1.2;
        targetTransformRef.current.scale = zoomScale;
        targetTransformRef.current.x = rect.width / 2 - (pos.x + 110) * zoomScale;
        targetTransformRef.current.y = rect.height / 2 - (pos.y + 140) * zoomScale;
        setScaleState(zoomScale);
        setTimeout(() => setSelectedIndex(focusedIndex), 350);
      } else {
        setSelectedIndex(focusedIndex);
      }
    }
    if (e.key === '=' || e.key === '+') setScaleSmooth(Math.min(MAX_SCALE, targetTransformRef.current.scale * 1.15));
    if (e.key === '-') setScaleSmooth(Math.max(minScaleRef.current, targetTransformRef.current.scale * 0.85));
  }, [focusedIndex, selectedIndex, setScaleSmooth, isMobile, activeCategory, displayPositions, fitToVisibleProducts]);

  // Pan to focused product when zoomed in
  useEffect(() => {
    if (focusedIndex < 0) return;
    const p = DEMO_PRODUCTS[focusedIndex];
    const pos = displayPositions[focusedIndex];
    const container = containerRef.current;
    if (!container || !p || !pos) return;
    const rect = container.getBoundingClientRect();
    const s = targetTransformRef.current.scale;

    const fitScale = Math.min(rect.width / CANVAS_W, rect.height / CANVAS_H);
    if (s <= fitScale * 1.1) return;

    targetTransformRef.current.x = rect.width / 2 - (pos.x + 110) * s;
    targetTransformRef.current.y = rect.height / 2 - (pos.y + 140) * s;
  }, [focusedIndex, displayPositions]);

  const compactHeader = isMobile;

  return (
    <div ref={rootRef} className={`relative w-full h-full overflow-hidden dynamic-bg select-none outline-none ${themeSettings.mode === 'light' ? 'light' : ''}`} style={{ overscrollBehavior: 'none' }} tabIndex={0} onKeyDown={handleKeyDown} onClick={(e) => { if (e.target === rootRef.current || (e.target as HTMLElement).closest('[data-canvas-area]')) rootRef.current?.focus(); }}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 liquid-glass flex items-center justify-between px-4 md:px-6 py-3 md:py-5">
        {/* Left: Brand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-display font-semibold tracking-[0.2em] uppercase text-foreground" style={{ fontSize: '11px', color: themeSettings.storeNameColor || undefined }}>
            {themeSettings.storeName}
          </span>
        </div>

        {/* Center: Category nav — full on desktop, hamburger on mobile */}
        {!compactHeader ? (
          <nav className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1 bg-foreground/[0.06] backdrop-blur-xl border border-foreground/[0.08] rounded-lg px-1.5 py-1 shadow-[0_4px_30px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]">
              {CATEGORIES.map(cat => (
                <button style={{ fontSize: 'var(--font-size-body, 10px)', fontFamily: 'var(--font-body)', color: themeSettings.bodyFontColor || undefined }}
                  key={cat}
                  onMouseEnter={() => { if (cat !== activeCategory) { setActiveCategory(cat); } }}
                  onClick={() => { if (cat === activeCategory) { fitToVisibleProducts(); } else { setActiveCategory(cat); } }}
                  className={`tracking-[0.15em] uppercase transition-all duration-300 rounded-md px-4 py-1.5 whitespace-nowrap ${
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
                  onClick={() => { if (cat === activeCategory) { fitToVisibleProducts(); } else { setActiveCategory(cat); } }}
                  style={{ fontSize: 'var(--font-size-body, 10px)', fontFamily: 'var(--font-body)', color: themeSettings.bodyFontColor || undefined }}
                  className={`text-[10px] tracking-[0.12em] uppercase transition-all duration-200 rounded-md px-3 py-1.5 whitespace-nowrap flex-shrink-0 ${
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
          <button onClick={toggleCart} className={`relative p-2 md:p-2.5 rounded-xl backdrop-blur-md shadow-lg hover:shadow-xl transition-all ${themeSettings.mode === 'light' ? 'bg-foreground/10 border border-foreground/10 hover:bg-foreground/15' : 'bg-white/90 border border-white/20 hover:bg-white'}`}>
            <ShoppingBag className={`w-4 md:w-5 h-4 md:h-5 ${themeSettings.mode === 'light' ? 'text-foreground' : 'text-background'}`} />
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
      <div ref={containerRef} data-canvas-area className="w-full h-full cursor-grab active:cursor-grabbing touch-none" style={{ overscrollBehavior: 'none' }}
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
            const isOnPage = displayPositions[i] !== undefined;
            // Hide products not on current page unless peeking
            if (!isOnPage && !peekingAll) return null;
            // When peeking, use original positions for all; otherwise use page positions
            const posOverride = peekingAll ? undefined : displayPositions[i];
            const isDimmed = peekingAll && !isOnPage;
            return (
              <ProductTile key={product.id} product={product} scale={scaleState}
                isFocused={focusedIndex === i && hoveredIndex === null}
                isHovered={hoveredIndex === i}
                dimmed={isDimmed}
                onClick={() => { if (!didDragRef.current) setSelectedIndex(i); }}
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
      <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-500 ${footerGlass ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-end justify-between px-4 md:px-6 py-3 md:py-5 relative">
          {/* Hints */}
          <div className={`tracking-wider space-y-0.5 cursor-default transition-colors duration-700 ${footerIntroVisible ? 'text-foreground/80' : themeSettings.mode === 'light' ? 'text-muted-foreground/60 hover:text-foreground/90' : 'text-muted-foreground/30 hover:text-foreground/80'}`} style={{ fontSize: '10px', fontFamily: 'var(--font-body)' }}>
            <p className="block md:hidden">HOVER OVER ITEMS & PINCH TO ZOOM · DRAG TO PAN · TAP TO VIEW</p>
            <p className="hidden md:block">HOVER OVER ITEMS & SCROLL / PINCH TO ZOOM · DRAG TO PAN · CLICK TO VIEW</p>
          </div>
          {/* Pagination indicator — centered */}
          <div className={`absolute left-1/2 -translate-x-1/2 bottom-3 md:bottom-5 tracking-widest cursor-default transition-colors duration-700 ${footerIntroVisible ? 'text-foreground/80' : 'text-muted-foreground/30 hover:text-foreground/80'}`} style={{ fontSize: '10px', fontFamily: 'var(--font-display)' }}>
            PAGE {currentPage + 1} / {totalPages}
          </div>
          {/* Social icons */}
          <div className="flex items-center gap-2 md:gap-3">
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className={`p-1.5 md:p-2 transition-colors duration-700 ${footerIntroVisible ? 'text-foreground/80' : 'text-muted-foreground/50 hover:text-foreground'}`}>
              <Instagram className="w-3.5 md:w-4 h-3.5 md:h-4" />
            </a>
            <a href="https://www.youtube.com/watch?v=Aq5WXmQQooo&list=RDAq5WXmQQooo&start_radio=1&pp=ygUJcmljayByb2xsoAcB" target="_blank" rel="noopener noreferrer" className={`p-1.5 md:p-2 transition-colors duration-700 ${footerIntroVisible ? 'text-foreground/80' : 'text-muted-foreground/50 hover:text-foreground'}`}>
              <Twitter className="w-3.5 md:w-4 h-3.5 md:h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Full-screen product view */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <ProductView
            productIndex={pageProducts.findIndex(p => p === DEMO_PRODUCTS[selectedIndex!])}
            products={pageProducts}
            categories={CATEGORIES}
            onClose={() => {
              setFocusedIndex(selectedIndex);
              setSelectedIndex(null);
              maxZoomTriggeredRef.current = false;
              snapToFitVisible();
              // Safety: re-snap after overlay exit animation completes
              setTimeout(() => snapToFitVisible(), 350);
              setTimeout(() => rootRef.current?.focus(), 50);
            }}
            onNavigate={(newIdx) => {
              // Convert page-local index back to global index
              const product = pageProducts[newIdx];
              if (product) {
                const globalIdx = DEMO_PRODUCTS.indexOf(product);
                if (globalIdx !== -1) setSelectedIndex(globalIdx);
              }
            }}
            activeCategory={activeCategory}
            onCategoryChange={(cat) => {
              setActiveCategory(cat);
              // Schedule re-fit after positions recompute for the new category
              requestAnimationFrame(() => {
                setTimeout(() => fitToVisibleProducts(), 50);
              });
            }}
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
