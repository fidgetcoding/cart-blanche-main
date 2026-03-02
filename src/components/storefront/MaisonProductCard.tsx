import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DemoProduct } from '@/data/demo-data';
import { useTheme } from '@/contexts/ThemeContext';
import { useCart } from '@/contexts/CartContext';

interface MaisonProductCardProps {
  product: DemoProduct;
  viewMode: 3 | 6;
  onClick: () => void;
  index: number;
}

export function MaisonProductCard({ product, viewMode, onClick, index }: MaisonProductCardProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const { addItem } = useCart();
  
  const cooldown = useRef(false);
  const imageAreaRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { themeSettings } = useTheme();

  const images = product.images.length > 0 ? product.images : ['/placeholder.svg'];
  const hasMultiple = images.length > 1;

  const nextImage = useCallback(() => {
    if (cooldown.current) return;
    cooldown.current = true;
    setCurrentImage(prev => (prev + 1) % images.length);
    setTimeout(() => { cooldown.current = false; }, 250);
  }, [images.length]);

  const prevImage = useCallback(() => {
    if (cooldown.current) return;
    cooldown.current = true;
    setCurrentImage(prev => (prev - 1 + images.length) % images.length);
    setTimeout(() => { cooldown.current = false; }, 250);
  }, [images.length]);

  // Wheel handler — dead simple: one swipe = one transition, then ignore everything for 800ms
  useEffect(() => {
    const el = imageAreaRef.current;
    if (!el || !hasMultiple) return;

    let blocked = false;
    let blockTimer: ReturnType<typeof setTimeout> | null = null;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;

      e.preventDefault();
      e.stopPropagation();

      if (blocked) return;
      if (Math.abs(e.deltaX) < 15) return;

      if (e.deltaX > 0) {
        setCurrentImage(prev => (prev + 1) % images.length);
      } else {
        setCurrentImage(prev => (prev - 1 + images.length) % images.length);
      }

      blocked = true;
      if (blockTimer) clearTimeout(blockTimer);
      blockTimer = setTimeout(() => { blocked = false; }, 800);
    };

    let touchStartClientX = 0;

    const onTouchStart = (e: TouchEvent) => {
      touchStartClientX = e.touches[0].clientX;
    };

    const onTouchMove = (e: TouchEvent) => {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartClientX);
      if (deltaX > 10) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const deltaX = touchStartClientX - e.changedTouches[0].clientX;
      if (Math.abs(deltaX) > 40) {
        if (deltaX > 0) nextImage();
        else prevImage();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      if (blockTimer) clearTimeout(blockTimer);
    };
  }, [hasMultiple, images.length, nextImage, prevImage]);

  // Focus card on hover for keyboard support
  useEffect(() => {
    if (isHovered && hasMultiple && cardRef.current) {
      cardRef.current.focus({ preventScroll: true });
    }
  }, [isHovered, hasMultiple]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!hasMultiple) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      nextImage();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      prevImage();
    }
  }, [hasMultiple, nextImage, prevImage]);


  const isCompact = viewMode === 6;

  // Thumbnail background: respect tileBgMode setting
  const tileBg = themeSettings.tileBgMode === 'transparent'
    ? 'transparent'
    : (themeSettings.mode === 'light' ? '#ececec' : '#151515');

  // Hover glow for view-3: subtle border glow using tileHoverGlow color
  const borderGlowStyle = !isCompact && isHovered
    ? { boxShadow: `inset 0 0 12px 1px ${themeSettings.tileHoverGlow}, 0 0 8px 1px ${themeSettings.tileHoverGlow}` }
    : {};

  return (
    <motion.div
      ref={cardRef}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="relative cursor-pointer group"
      style={{
        outline: 'none',
        borderRight: '1px solid hsl(var(--border))',
        borderBottom: '1px solid hsl(var(--border))',
        ...borderGlowStyle,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      onClick={onClick}
    >
      {/* Image area */}
      <div
        ref={imageAreaRef}
        className="relative overflow-hidden"
        style={{
          aspectRatio: isCompact ? '3/4' : '3/4.2',
          backgroundColor: tileBg,
          touchAction: 'pan-y',
        }}
      >
        {/* Image carousel strip */}
        <div
          className="h-full will-change-transform"
          style={{
            display: 'flex',
            width: `${images.length * 100}%`,
            transform: `translateX(-${(currentImage * 100) / images.length}%)`,
            transition: 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
          }}
        >
          {images.map((img, i) => (
            <div
              key={i}
              className="h-full flex-shrink-0 flex items-center justify-center"
              style={{ width: `${100 / images.length}%`, padding: '8%' }}
            >
              <img
                src={img}
                alt={product.title}
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Hover overlay — view by 6 only: frosted overlay revealing product info */}
        {isCompact && isHovered && (
          <div
            className="absolute inset-0 backdrop-blur-sm flex flex-col items-center justify-end pb-4 transition-opacity duration-200 z-[1]"
            style={{ backgroundColor: 'hsl(var(--background) / 0.65)' }}
          >
            <p
              className="tracking-[0.12em] uppercase leading-relaxed text-center px-3"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--font-size-display)',
                color: themeSettings.displayFontColor || undefined,
              }}
            >
              {product.title}
            </p>
            <p
              className="tracking-[0.08em] text-muted-foreground mt-1"
              style={{
                fontFamily: 'var(--font-numeral)',
                fontSize: 'var(--font-size-numeral)',
                color: themeSettings.numeralFontColor || undefined,
              }}
            >
              ${product.price}
            </p>
            <p
              className="text-[9px] tracking-[0.15em] uppercase mt-1.5"
              style={{ fontFamily: 'var(--font-body)', color: themeSettings.bodyFontColor || 'hsl(var(--muted-foreground))' }}
            >
              {product.variants.some(v => v.inventory_count === 0) ? 'JOIN THE WAITLIST' : 'ADD TO CART'}
            </p>
          </div>
        )}

        {/* Hover chevrons — view by 3 only */}
        {!isCompact && hasMultiple && isHovered && (
          <>
            <button
              onMouseEnter={() => prevImage()}
              onClick={e => { e.stopPropagation(); prevImage(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-[2]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onMouseEnter={() => nextImage()}
              onClick={e => { e.stopPropagation(); nextImage(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-[2]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Pagination dots — view by 3 only, on hover */}
        {!isCompact && hasMultiple && isHovered && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-[2]">
            {images.map((_, i) => (
              <button
                key={i}
                onMouseEnter={() => setCurrentImage(i)}
                onClick={e => { e.stopPropagation(); setCurrentImage(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentImage ? 'bg-foreground' : 'bg-foreground/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Text area — view by 3 only */}
      {!isCompact && (
        <div className="px-4 py-4 text-center">
          <p
            className="tracking-[0.15em] uppercase leading-relaxed"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--font-size-display)',
              color: themeSettings.displayFontColor || undefined,
            }}
          >
            {product.title}
          </p>
          <p
            className="tracking-[0.1em] text-muted-foreground mt-1.5"
            style={{
              fontFamily: 'var(--font-numeral)',
              fontSize: 'var(--font-size-numeral)',
              color: themeSettings.numeralFontColor || undefined,
            }}
          >
            ${product.price}
          </p>
          <div
            className="relative mt-2 h-6 flex items-center justify-center"
            onMouseEnter={() => setShowSizes(true)}
            onMouseLeave={() => setShowSizes(false)}
          >
            <AnimatePresence mode="wait">
              {!showSizes || product.variants.length <= 1 ? (
                <motion.p
                  key="cta"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-[10px] tracking-[0.2em] uppercase cursor-pointer"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--font-size-body)',
                    color: themeSettings.bodyFontColor || 'hsl(var(--muted-foreground))',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (product.variants.length === 1 && product.variants[0].inventory_count > 0) {
                      addItem({
                        productId: product.id,
                        variantId: product.variants[0].id,
                        title: product.title,
                        variantTitle: product.variants[0].title,
                        price: product.variants[0].price ?? product.price,
                        image: product.images[0],
                      });
                    }
                  }}
                >
                  {product.variants.every(v => v.inventory_count === 0) ? 'JOIN THE WAITLIST' : 'ADD TO CART'}
                </motion.p>
              ) : (
                <motion.div
                  key="sizes"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center gap-2"
                >
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (v.inventory_count === 0) return;
                        addItem({
                          productId: product.id,
                          variantId: v.id,
                          title: product.title,
                          variantTitle: v.title,
                          price: v.price ?? product.price,
                          image: product.images[0],
                        });
                      }}
                      disabled={v.inventory_count === 0}
                      className={`text-[10px] tracking-[0.12em] uppercase transition-colors ${
                        v.inventory_count === 0
                          ? 'text-muted-foreground/30 line-through cursor-not-allowed'
                          : 'text-muted-foreground hover:text-foreground cursor-pointer'
                      }`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {v.title}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
