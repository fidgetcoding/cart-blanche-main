import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { DEMO_PRODUCTS, DEMO_HOTZONES, type DemoProduct } from '@/data/demo-data';
import { ProductTile } from '@/components/storefront/ProductTile';
import { HotzoneLayer } from '@/components/storefront/HotzoneLayer';
import { ProductView } from '@/components/storefront/ProductView';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { useCart } from '@/contexts/CartContext';

const CANVAS_W = 2000;
const CANVAS_H = 1600;

export function SpatialCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.55);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const { toggleCart, itemCount } = useCart();

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.25, Math.min(2, scale * delta));
    const newPanX = cursorX - (cursorX - pan.x) * (newScale / scale);
    const newPanY = cursorY - (cursorY - pan.y) * (newScale / scale);
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  }, [scale, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ x: pan.x, y: pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: panStart.x + (e.clientX - dragStart.x),
      y: panStart.y + (e.clientY - dragStart.y),
    });
  }, [isDragging, dragStart, panStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => { rootRef.current?.focus(); }, []);

  // Grid keyboard nav with wrapping — only active when NOT in product view
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (selectedIndex !== null) return; // ProductView handles its own keys

    const products = DEMO_PRODUCTS;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (focusedIndex === -1) { setFocusedIndex(0); return; }

      // Build grid rows sorted by Y then X
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
      setSelectedIndex(focusedIndex);
    }
    if (e.key === '=' || e.key === '+') setScale(s => Math.min(2, s * 1.15));
    if (e.key === '-') setScale(s => Math.max(0.25, s * 0.85));
  }, [focusedIndex, selectedIndex]);

  useEffect(() => {
    if (focusedIndex < 0) return;
    const p = DEMO_PRODUCTS[focusedIndex];
    const container = containerRef.current;
    if (!container || !p) return;
    const rect = container.getBoundingClientRect();
    setPan({
      x: rect.width / 2 - (p.grid_position.x + 110) * scale,
      y: rect.height / 2 - (p.grid_position.y + 140) * scale,
    });
  }, [focusedIndex, scale]);

  const zoomLabel = scale < 0.35 ? 'L0' : scale < 0.65 ? 'L1' : scale < 1.2 ? 'L2' : 'L3';

  return (
    <div ref={rootRef} className="relative w-full h-screen overflow-hidden bg-background select-none outline-none" tabIndex={0} onKeyDown={handleKeyDown} onClick={() => rootRef.current?.focus()}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
        <h1 className="font-display text-xl font-bold tracking-[0.2em]">CART BLANCHE</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs font-display text-muted-foreground tracking-widest">{zoomLabel}</span>
          <button onClick={toggleCart} className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <motion.span key={itemCount} initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <div style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0', width: CANVAS_W, height: CANVAS_H, position: 'relative',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}>
          <HotzoneLayer hotzones={DEMO_HOTZONES} scale={scale} />
          {DEMO_PRODUCTS.map((product, i) => (
            <ProductTile key={product.id} product={product} scale={scale}
              isFocused={focusedIndex === i} onClick={() => setSelectedIndex(i)} />
          ))}
        </div>
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-6 left-6 z-20 text-xs text-muted-foreground font-display tracking-wider space-y-1">
        <p>SCROLL TO ZOOM · DRAG TO PAN</p>
        <p>ARROW KEYS TO NAVIGATE · ENTER TO VIEW</p>
      </div>

      {/* Full-screen product view (Yeezy-style) */}
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
