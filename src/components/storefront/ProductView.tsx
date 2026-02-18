import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Heart, X, ShoppingBag, Layers } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { DemoProduct } from '@/data/demo-data';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { useCart } from '@/contexts/CartContext';
import { useStyleKit } from '@/contexts/StyleKitContext';

interface ProductViewProps {
  productIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

// Build a grid-aware navigation system
function buildNavGrid(products: DemoProduct[]) {
  // Sort products into rows by Y position, then by X within each row
  const yPositions = [...new Set(products.map(p => p.grid_position.y))].sort((a, b) => a - b);
  const rows: number[][] = yPositions.map(y => {
    return products
      .map((p, i) => ({ i, p }))
      .filter(({ p }) => p.grid_position.y === y)
      .sort((a, b) => a.p.grid_position.x - b.p.grid_position.x)
      .map(({ i }) => i);
  });

  return { rows, yPositions };
}

function getWrappingNeighbor(
  currentIndex: number,
  direction: 'up' | 'down' | 'left' | 'right',
  products: DemoProduct[]
): number {
  const { rows } = buildNavGrid(products);

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

export function ProductView({ productIndex, onClose, onNavigate }: ProductViewProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [expandDetails, setExpandDetails] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const { addItem } = useCart();
  const { openStyleKit } = useStyleKit();
  const scrollCooldown = useRef(true); // Start with cooldown to absorb momentum from zoom-in

  // Release initial cooldown after mount
  useEffect(() => {
    const timer = setTimeout(() => { scrollCooldown.current = false; }, 600);
    return () => clearTimeout(timer);
  }, []);

  const product = DEMO_PRODUCTS[productIndex];

  // Reset variant selection when product changes
  useEffect(() => {
    setSelectedVariant(null);
    setExpandDetails(false);
    setActiveImage(0);
  }, [productIndex]);

  const navigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const newIndex = getWrappingNeighbor(productIndex, direction, DEMO_PRODUCTS);
    onNavigate(newIndex);
  }, [productIndex, onNavigate]);

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
      className="fixed inset-0 z-30 bg-background flex flex-col items-center justify-center"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-40 p-2 hover:bg-secondary rounded-lg transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Navigation arrows — always visible on all 4 sides */}
      <button
        onClick={() => navigate('left')}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 hover:bg-secondary/80 rounded-full transition-all group"
      >
        <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
      <button
        onClick={() => navigate('right')}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 hover:bg-secondary/80 rounded-full transition-all group"
      >
        <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
      <button
        onClick={() => navigate('up')}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-40 p-3 hover:bg-secondary/80 rounded-full transition-all group"
      >
        <ChevronUp className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
      <button
        onClick={() => navigate('down')}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 p-3 hover:bg-secondary/80 rounded-full transition-all group"
      >
        <ChevronDown className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {/* Product content — Yeezy style: big image centered, info below */}
      <AnimatePresence mode="wait">
        <motion.div
          key={product.id}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex flex-col items-center max-w-lg w-full px-6"
        >
          {/* Product image area */}
          <div className="w-full aspect-square bg-secondary/30 rounded-lg flex items-center justify-center mb-6 relative">
            <span className="font-display text-muted-foreground/15 text-lg tracking-[0.3em]">
              {product.category.toUpperCase()}
            </span>
            {product.compare_at_price && (
              <div className="absolute top-4 left-4 bg-accent text-accent-foreground text-[10px] font-display font-bold px-2 py-1 rounded">
                SALE
              </div>
            )}
          </div>

          {/* Image dots */}
          <div className="flex gap-1.5 mb-4" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setActiveImage(i); }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  activeImage === i ? 'bg-foreground' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          {/* Title + Price */}
          <h2 className="font-display text-lg font-bold text-center tracking-wide">{product.title}</h2>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-base">${product.price}</span>
            {product.compare_at_price && (
              <span className="text-sm text-muted-foreground line-through">${product.compare_at_price}</span>
            )}
          </div>

          {/* Expand button to show details */}
          <button
            onClick={() => setExpandDetails(!expandDetails)}
            className="mt-3 p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <Plus className={`w-5 h-5 transition-transform duration-200 ${expandDetails ? 'rotate-45' : ''}`} />
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
                <div className="pt-4 pb-2 space-y-4">
                  <p className="text-sm text-muted-foreground text-center leading-relaxed">
                    {product.description}
                  </p>

                  {/* Variants */}
                  {product.variants.length > 1 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {product.variants.map(v => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v.id)}
                          className={`px-4 py-2 text-sm font-display rounded-md border transition-all ${
                            selectedVariant === v.id
                              ? 'border-primary bg-primary text-primary-foreground'
                              : v.inventory_count === 0
                              ? 'border-border text-muted-foreground/40 cursor-not-allowed'
                              : 'border-border hover:border-muted-foreground'
                          }`}
                          disabled={v.inventory_count === 0}
                        >
                          {v.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Stock */}
                  {variant && (
                    <p className={`text-xs text-center ${
                      variant.inventory_count === 0 ? 'text-destructive' :
                      variant.inventory_count <= 5 ? 'text-warning' : 'text-success'
                    }`}>
                      {variant.inventory_count === 0 ? 'Out of Stock' :
                       variant.inventory_count <= 5 ? `Low Stock — ${variant.inventory_count} left` :
                       'In Stock'}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={handleAddToCart}
                      disabled={!canAdd || isOutOfStock}
                      className={`px-6 py-3 font-display font-semibold text-sm tracking-wider rounded-lg flex items-center gap-2 transition-all ${
                        !canAdd || isOutOfStock
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-primary text-primary-foreground hover:opacity-90'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {isOutOfStock ? 'OUT OF STOCK' : !canAdd ? 'SELECT SIZE' : 'ADD TO CART'}
                    </button>
                    <button
                      onClick={() => openStyleKit(product)}
                      className="px-4 py-3 border border-border font-display font-semibold text-[11px] tracking-wider rounded-lg flex items-center gap-2 hover:bg-secondary transition-colors"
                    >
                      <Layers className="w-4 h-4" />
                      BUILD A SET
                    </button>
                    <button
                      onClick={() => setIsSaved(!isSaved)}
                      className={`p-3 border rounded-lg transition-colors ${
                        isSaved ? 'border-accent text-accent' : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Category label at bottom */}
      <div className="absolute bottom-14 left-6">
        <span className="text-[10px] font-display tracking-[0.3em] text-muted-foreground/40">
          {product.category.toUpperCase()}
        </span>
      </div>

      {/* Position indicator */}
      <div className="absolute bottom-14 right-6">
        <span className="text-[10px] font-display tracking-widest text-muted-foreground/40">
          {productIndex + 1} / {DEMO_PRODUCTS.length}
        </span>
      </div>
    </motion.div>
  );
}
