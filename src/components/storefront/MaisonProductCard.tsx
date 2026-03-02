import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DemoProduct } from '@/data/demo-data';
import { useTheme } from '@/contexts/ThemeContext';

interface MaisonProductCardProps {
  product: DemoProduct;
  viewMode: 3 | 6;
  onClick: () => void;
  index: number;
}

export function MaisonProductCard({ product, viewMode, onClick, index }: MaisonProductCardProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef(0);
  const wheelAccumulator = useRef(0);
  const cooldown = useRef(false);
  const { themeSettings } = useTheme();

  const images = product.images.length > 0 ? product.images : ['/placeholder.svg'];
  const hasMultiple = images.length > 1;

  const nextImage = useCallback(() => {
    if (cooldown.current) return;
    cooldown.current = true;
    setCurrentImage(prev => (prev + 1) % images.length);
    wheelAccumulator.current = 0;
    setTimeout(() => { cooldown.current = false; wheelAccumulator.current = 0; }, 450);
  }, [images.length]);

  const prevImage = useCallback(() => {
    if (cooldown.current) return;
    cooldown.current = true;
    setCurrentImage(prev => (prev - 1 + images.length) % images.length);
    wheelAccumulator.current = 0;
    setTimeout(() => { cooldown.current = false; wheelAccumulator.current = 0; }, 450);
  }, [images.length]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!hasMultiple) return;
    const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (!isHorizontal) return;
    e.preventDefault();
    e.stopPropagation();
    if (cooldown.current) {
      wheelAccumulator.current = 0;
      return;
    }
    wheelAccumulator.current += e.deltaX;
    if (Math.abs(wheelAccumulator.current) > 50) {
      if (wheelAccumulator.current > 0) nextImage();
      else prevImage();
    }
  }, [hasMultiple, nextImage, prevImage]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!hasMultiple) return;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) nextImage();
      else prevImage();
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="relative cursor-pointer group"
      style={{
        borderRight: '1px solid hsl(var(--border))',
        borderBottom: '1px solid hsl(var(--border))',
        ...borderGlowStyle,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); wheelAccumulator.current = 0; setCurrentImage(0); }}
      onClick={onClick}
    >
      {/* Image area */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: isCompact ? '3/4' : '3/4.2',
          backgroundColor: tileBg,
        }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
            style={{ backgroundColor: 'hsl(var(--background) / 0.92)' }}
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
              className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/60 mt-1.5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {product.variants.some(v => v.inventory_count === 0) ? 'JOIN THE WAITLIST' : 'ADD TO CART'}
            </p>
          </div>
        )}

        {/* Hover chevrons — view by 3 only */}
        {!isCompact && hasMultiple && isHovered && (
          <>
            <button
              onClick={e => { e.stopPropagation(); prevImage(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-[2]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
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
          <p
            className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50 mt-2"
            style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--font-size-body)' }}
          >
            {product.variants.some(v => v.inventory_count === 0) ? 'JOIN THE WAITLIST' : 'ADD TO CART'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
