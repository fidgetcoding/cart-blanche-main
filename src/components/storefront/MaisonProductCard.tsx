import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import type { DemoProduct } from '@/data/demo-data';

interface MaisonProductCardProps {
  product: DemoProduct;
  viewMode: 3 | 6;
  onClick: () => void;
  index: number;
}

export function MaisonProductCard({ product, viewMode, onClick, index }: MaisonProductCardProps) {
  const { themeSettings } = useTheme();
  const [currentImage, setCurrentImage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef(0);
  const wheelAccumulator = useRef(0);
  const cooldown = useRef(false);

  const images = product.images.length > 0 ? product.images : ['/placeholder.svg'];
  const hasMultiple = images.length > 1;

  // Derive theme values
  const bgColor = themeSettings.mode === 'light' ? '#FAF7F2' : '#0a0a0a';
  const textColor = themeSettings.displayFontColor || (themeSettings.mode === 'light' ? '#1a1a1a' : '#f5f5f5');
  const borderColor = themeSettings.mode === 'light' ? '#e8e4de' : '#222';
  const mutedColor = themeSettings.mode === 'light' ? '#666666' : '#999';
  const displayFont = `'${themeSettings.displayFont}', Georgia, serif`;
  const numeralFont = `'${themeSettings.numeralFont}', monospace`;
  const ctaColor = themeSettings.mode === 'light' ? 'rgba(26,26,26,0.5)' : 'rgba(245,245,245,0.5)';

  const nextImage = useCallback(() => {
    if (cooldown.current) return;
    cooldown.current = true;
    setCurrentImage(prev => (prev + 1) % images.length);
    setTimeout(() => { cooldown.current = false; }, 300);
  }, [images.length]);

  const prevImage = useCallback(() => {
    if (cooldown.current) return;
    cooldown.current = true;
    setCurrentImage(prev => (prev - 1 + images.length) % images.length);
    setTimeout(() => { cooldown.current = false; }, 300);
  }, [images.length]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!hasMultiple || viewMode === 6) return;
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    e.stopPropagation();
    wheelAccumulator.current += e.deltaX;
    if (Math.abs(wheelAccumulator.current) > 50) {
      if (wheelAccumulator.current > 0) nextImage();
      else prevImage();
      wheelAccumulator.current = 0;
    }
  }, [hasMultiple, viewMode, nextImage, prevImage]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!hasMultiple || viewMode === 6) return;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) nextImage();
      else prevImage();
    }
  }, [hasMultiple, viewMode, nextImage, prevImage]);

  const isCompact = viewMode === 6;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="relative cursor-pointer group"
      style={{ borderRight: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); wheelAccumulator.current = 0; }}
      onClick={onClick}
    >
      {/* Image area */}
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: isCompact ? '3/4' : '3/4.2' }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full will-change-transform"
          style={{
            transform: `translateX(-${currentImage * 100}%)`,
            transition: 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
          }}
        >
          {images.map((img, i) => (
            <div key={i} className="min-w-full h-full flex-shrink-0">
              <img
                src={img}
                alt={product.title}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Hover chevrons — view by 3 only */}
        {!isCompact && hasMultiple && isHovered && (
          <>
            <button
              onClick={e => { e.stopPropagation(); prevImage(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center transition-colors"
              style={{ color: `${textColor}99` }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); nextImage(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center transition-colors"
              style={{ color: `${textColor}99` }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Pagination dots — view by 3 only, on hover */}
        {!isCompact && hasMultiple && isHovered && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setCurrentImage(i); }}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{ backgroundColor: i === currentImage ? textColor : `${textColor}4D` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Text area — view by 3 only */}
      {!isCompact && (
        <div className="px-4 py-4 text-center" style={{ fontFamily: displayFont }}>
          <p
            className="tracking-[0.15em] uppercase leading-relaxed"
            style={{ fontSize: `${themeSettings.displayFontSize}px`, color: textColor }}
          >
            {product.title}
          </p>
          <p
            className="tracking-[0.1em] mt-1.5"
            style={{ fontSize: `${themeSettings.numeralFontSize}px`, color: themeSettings.numeralFontColor || mutedColor, fontFamily: numeralFont }}
          >
            ${product.price}
          </p>
          <p
            className="text-[10px] tracking-[0.2em] uppercase mt-2"
            style={{ color: ctaColor }}
          >
            {product.variants.some(v => v.inventory_count === 0) ? 'JOIN THE WAITLIST' : 'ADD TO CART'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
