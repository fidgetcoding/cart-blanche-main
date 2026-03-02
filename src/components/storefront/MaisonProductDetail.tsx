import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DemoProduct } from '@/data/demo-data';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';

interface MaisonProductDetailProps {
  product: DemoProduct | null;
  products: DemoProduct[]; // filtered set for navigation
  onClose: () => void;
  onNavigate: (product: DemoProduct) => void;
}

export function MaisonProductDetail({ product, products, onClose, onNavigate }: MaisonProductDetailProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const { addItem } = useCart();
  const { themeSettings } = useTheme();

  const currentIndex = product ? products.findIndex(p => p.id === product.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < products.length - 1;

  // Reset image when product changes
  useEffect(() => {
    setCurrentImage(0);
    setSelectedVariant(null);
  }, [product?.id]);

  // Keyboard navigation
  useEffect(() => {
    if (!product) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(products[currentIndex - 1]);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(products[currentIndex + 1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [product, hasPrev, hasNext, currentIndex, products, onClose, onNavigate]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(deltaX) > 60) {
      if (deltaX > 0 && hasNext) onNavigate(products[currentIndex + 1]);
      else if (deltaX < 0 && hasPrev) onNavigate(products[currentIndex - 1]);
    }
  }, [hasPrev, hasNext, currentIndex, products, onNavigate]);

  if (!product) return null;

  const images = product.images.length > 0 ? product.images : ['/placeholder.svg'];
  const variant = product.variants.find(v => v.id === selectedVariant);
  const isOutOfStock = variant ? variant.inventory_count === 0 : product.variants.every(v => v.inventory_count === 0);

  const handleAddToCart = () => {
    const v = variant || product.variants[0];
    if (!v || isOutOfStock) return;
    addItem({
      productId: product.id,
      variantId: v.id,
      title: product.title,
      variantTitle: v.title,
      price: v.price ?? product.price,
      image: product.images[0],
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        onClick={onClose}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Prev product arrow */}
        {hasPrev && (
          <button
            onClick={e => { e.stopPropagation(); onNavigate(products[currentIndex - 1]); }}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
          </button>
        )}

        {/* Next product arrow */}
        {hasNext && (
          <button
            onClick={e => { e.stopPropagation(); onNavigate(products[currentIndex + 1]); }}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors z-10"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={1.5} />
          </button>
        )}

        {/* Product content */}
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center max-w-lg w-full px-6"
          onClick={e => e.stopPropagation()}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {/* Image */}
          <div className="relative w-full" style={{ aspectRatio: '3/4' }}>
            <img
              src={images[currentImage]}
              alt={product.title}
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>

          {/* Image pagination dots */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-4">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === currentImage ? 'bg-foreground' : 'bg-foreground/25'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Product info */}
          <div className="text-center mt-6">
            <h2
              className="text-sm tracking-[0.2em] uppercase text-foreground"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--font-size-display)',
                color: themeSettings.displayFontColor || undefined,
              }}
            >
              {product.title}
            </h2>
            <p
              className="text-sm tracking-[0.1em] text-muted-foreground mt-2"
              style={{
                fontFamily: 'var(--font-numeral)',
                fontSize: 'var(--font-size-numeral)',
                color: themeSettings.numeralFontColor || undefined,
              }}
            >
              ${product.price}
            </p>

            {/* Size selection */}
            {product.variants.length > 1 && (
              <div className="flex gap-2 justify-center mt-4">
                {product.variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v.id === selectedVariant ? null : v.id)}
                    className={`px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase border transition-colors ${
                      v.id === selectedVariant
                        ? 'bg-foreground text-background border-foreground'
                        : v.inventory_count === 0
                          ? 'border-border text-muted-foreground/40 line-through cursor-not-allowed'
                          : 'border-border text-foreground hover:border-foreground'
                    }`}
                    disabled={v.inventory_count === 0}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`mt-5 px-8 py-3 text-[10px] tracking-[0.25em] uppercase border transition-colors ${
                isOutOfStock
                  ? 'border-border text-muted-foreground cursor-not-allowed'
                  : 'border-foreground text-foreground hover:bg-foreground hover:text-background'
              }`}
            >
              {isOutOfStock ? 'JOIN THE WAITLIST' : 'ADD TO CART'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
