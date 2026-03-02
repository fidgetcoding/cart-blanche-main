import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DemoProduct } from '@/data/demo-data';

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

  const images = product.images.length > 0 ? product.images : ['/placeholder.svg'];
  const hasMultiple = images.length > 1;

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
      style={{ borderRight: '1px solid #e8e4de', borderBottom: '1px solid #e8e4de' }}
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
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); nextImage(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors"
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
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentImage ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a]/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Text area — view by 3 only */}
      {!isCompact && (
        <div className="px-4 py-4 text-center" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          <p className="text-xs tracking-[0.15em] uppercase text-[#1a1a1a] leading-relaxed">
            {product.title}
          </p>
          <p className="text-xs tracking-[0.1em] text-[#666666] mt-1.5">
            ${product.price}
          </p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#1a1a1a]/50 mt-2">
            {product.variants.some(v => v.inventory_count === 0) ? 'JOIN THE WAITLIST' : 'ADD TO CART'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
