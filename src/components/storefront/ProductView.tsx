import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Heart, X, ShoppingBag, Layers } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { DemoProduct } from '@/data/demo-data';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { useCart } from '@/contexts/CartContext';
import { useStyleKit } from '@/contexts/StyleKitContext';

const CATEGORIES = ['ALL', ...new Set(DEMO_PRODUCTS.map(p => p.category.toUpperCase()))];

interface ProductViewProps {
  productIndex: number;
  filteredIndices?: number[];
  activeCategory?: string;
  onCategoryChange?: (cat: string) => void;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

export function ProductView({ productIndex, filteredIndices, activeCategory, onCategoryChange, onClose, onNavigate }: ProductViewProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [expandDetails, setExpandDetails] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const { addItem, openCart, itemCount } = useCart();
  const { openStyleKit } = useStyleKit();
  const scrollCooldown = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => { scrollCooldown.current = false; }, 600);
    return () => clearTimeout(timer);
  }, []);

  const product = DEMO_PRODUCTS[productIndex];

  useEffect(() => {
    setSelectedVariant(null);
    setExpandDetails(false);
    setActiveImage(0);
  }, [productIndex]);

  // Navigation using filteredIndices
  const navigateFiltered = useCallback((direction: 'next' | 'prev') => {
    const indices = filteredIndices ?? DEMO_PRODUCTS.map((_, i) => i);
    const pos = indices.indexOf(productIndex);
    if (pos === -1) return;
    const newPos = direction === 'next'
      ? (pos + 1) % indices.length
      : (pos - 1 + indices.length) % indices.length;
    onNavigate(indices[newPos]);
  }, [productIndex, filteredIndices, onNavigate]);

  // Scroll wheel navigation
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (scrollCooldown.current) return;
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    if (absX < 15 && absY < 15) return;
    scrollCooldown.current = true;
    setTimeout(() => { scrollCooldown.current = false; }, 800);
    navigateFiltered((absX > absY ? e.deltaX > 0 : e.deltaY > 0) ? 'next' : 'prev');
  }, [navigateFiltered]);

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
      navigateFiltered((absX > absY ? dx < 0 : dy < 0) ? 'next' : 'prev');
      touchStart.current = null;
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [navigateFiltered]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          navigateFiltered('prev');
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          navigateFiltered('next');
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateFiltered, onClose]);

  if (!product) return null;

  const indices = filteredIndices ?? DEMO_PRODUCTS.map((_, i) => i);
  const posInList = indices.indexOf(productIndex);
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
      className="fixed inset-0 z-30 flex flex-col items-center justify-center"
    >
      {/* Backdrop — click to close */}
      <div className="absolute inset-0 bg-background" onClick={onClose} />

      {/* Category pills — top-left */}
      {activeCategory && onCategoryChange && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-1 bg-foreground/[0.06] backdrop-blur-xl border border-foreground/[0.08] rounded-lg px-1.5 py-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={(e) => {
                e.stopPropagation();
                onCategoryChange(cat);
              }}
              className={`text-[11px] font-display tracking-[0.15em] uppercase rounded-md px-3 py-1.5 transition-colors ${
                activeCategory === cat
                  ? 'bg-foreground/[0.12] text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground/80'
              }`}
            >
              {cat === 'ALL' ? 'ALL' : cat.replace('-', ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Top-right: cart button */}
      <div className="absolute top-6 right-6 z-40">
        <button
          onClick={(e) => { e.stopPropagation(); openCart(); }}
          className="relative p-2 md:p-2.5 rounded-xl bg-white/90 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white hover:shadow-xl transition-all"
        >
          <ShoppingBag className="w-4 md:w-5 h-4 md:h-5 text-background" />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-foreground text-background text-[9px] font-bold rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={() => navigateFiltered('prev')}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 hover:bg-secondary/80 rounded-full transition-all group"
      >
        <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
      <button
        onClick={() => navigateFiltered('next')}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 hover:bg-secondary/80 rounded-full transition-all group"
      >
        <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {/* Product content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={product.id}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center max-w-lg w-full px-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Product image area */}
          <div className="w-full aspect-square bg-secondary/30 rounded-lg flex items-center justify-center mb-6 relative">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 p-1.5 bg-background/60 backdrop-blur-sm hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="font-display text-muted-foreground/15 text-lg tracking-[0.3em]">
              {product.category.toUpperCase()}
            </span>
            {product.compare_at_price && (
              <div className="absolute top-3 left-3 bg-accent text-accent-foreground text-[10px] font-display font-bold px-2 py-1 rounded">
                SALE
              </div>
            )}

            {/* Image selector zones */}
            <div className="absolute bottom-0 left-0 right-0 flex h-12 z-10" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              {[0, 1, 2].map((i) => (
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
          </div>

          {/* Title + Price */}
          <h2 className="font-display text-lg font-bold text-center tracking-wide">{product.title}</h2>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-base">${product.price}</span>
            {product.compare_at_price && (
              <span className="text-sm text-muted-foreground line-through">${product.compare_at_price}</span>
            )}
          </div>

          {/* Expand button */}
          <button
            onClick={() => setExpandDetails(!expandDetails)}
            onMouseEnter={() => setExpandDetails(true)}
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
                      onClick={() => {
                        const variantTitle = product.variants.find(v => v.id === selectedVariant)?.title ?? null;
                        openStyleKit(product, 'counterparts', variantTitle);
                      }}
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
      <div className="absolute bottom-14 left-6 z-10">
        <span className="text-[10px] font-display tracking-[0.3em] text-muted-foreground/40">
          {product.category.toUpperCase()}
        </span>
      </div>

      {/* Position indicator — scoped to filtered list */}
      <div className="absolute bottom-14 right-6 z-10">
        <span className="text-[10px] font-display tracking-widest text-muted-foreground/40">
          {posInList + 1} / {indices.length}
        </span>
      </div>
    </motion.div>
  );
}
