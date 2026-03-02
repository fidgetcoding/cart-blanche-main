import { memo, useState, useCallback } from 'react';
import { ShoppingBag, Layers } from 'lucide-react';
import type { DemoProduct } from '@/data/demo-data';
import { useTheme } from '@/contexts/ThemeContext';

interface ProductTileProps {
  product: DemoProduct;
  scale: number;
  isFocused: boolean;
  isHovered: boolean;
  dimmed?: boolean;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onQuickAdd: (e: React.MouseEvent) => void;
  onQuickStyleKit: (e: React.MouseEvent) => void;
  positionOverride?: { x: number; y: number };
}

export const ProductTile = memo(function ProductTile({
  product, scale, isFocused, isHovered, dimmed, onClick, onHoverStart, onHoverEnd, onQuickAdd, onQuickStyleKit, positionOverride
}: ProductTileProps) {
  const pos = positionOverride || product.grid_position;
  const showLabel = scale > 0.45;
  const glowing = isFocused || isHovered;
  const showActions = glowing && scale > 0.4;
  const [imgLoaded, setImgLoaded] = useState(false);
  const { themeSettings } = useTheme();

  const handleLoad = useCallback(() => setImgLoaded(true), []);

  return (
    <div
      onClick={dimmed ? undefined : onClick}
      onMouseEnter={dimmed ? undefined : onHoverStart}
      onMouseLeave={dimmed ? undefined : onHoverEnd}
      className={`absolute ${dimmed ? 'pointer-events-none' : 'cursor-pointer'}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: 220,
        height: 280,
        opacity: dimmed ? 0.15 : 1,
        transform: glowing && !dimmed ? `scale(${themeSettings.tileHoverScale})` : 'scale(1)',
        zIndex: glowing ? 10 : 0,
        transition: 'opacity 0.4s ease, transform 0.2s ease',
        willChange: 'transform',
      }}
    >
      <div className="w-full h-full flex flex-col">
        <div className={`flex-1 bg-muted/40 rounded-lg flex items-center justify-center relative overflow-hidden transition-shadow duration-300`} style={glowing ? { boxShadow: `0 0 20px 2px ${themeSettings.tileHoverGlow}, 0 0 40px 4px ${themeSettings.tileHoverGlow}` } : undefined}>
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.title}
              loading="lazy"
              decoding="async"
              onLoad={handleLoad}
              className={`w-full h-full object-cover rounded-lg pointer-events-none transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-3/4 h-3/4 bg-muted/60 rounded-md pointer-events-none" />
          )}

          {/* Quick action buttons */}
          {showActions && (
            <div
              className="absolute bottom-2 right-2 flex gap-1 animate-in fade-in-0 duration-150"
            >
              <button
                onClick={onQuickAdd}
                className="p-1.5 rounded-md bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors"
                title="Quick Add"
              >
                <ShoppingBag className="w-3 h-3 text-foreground/70" />
              </button>
              <button
                onClick={onQuickStyleKit}
                className="p-1.5 rounded-md bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors"
                title="Style Kit"
              >
                <Layers className="w-3 h-3 text-foreground/70" />
              </button>
            </div>
          )}
        </div>

        {/* Product name + price */}
        {showLabel && (
          <div className="pt-2 pb-1 space-y-0.5">
            <p style={{ fontFamily: `'${themeSettings.displayFont}', sans-serif`, fontSize: `${themeSettings.displayFontSize}px`, color: themeSettings.displayFontColor || undefined }} className="font-medium tracking-[0.05em] text-foreground/80 truncate">
              {product.title}
            </p>
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: `'${themeSettings.numeralFont}', monospace`, fontSize: `${themeSettings.numeralFontSize}px`, color: themeSettings.numeralFontColor || undefined }} className="text-foreground/60">
                ${product.price}
              </span>
              {product.compare_at_price && (
                <span style={{ fontFamily: `'${themeSettings.numeralFont}', monospace`, fontSize: `${themeSettings.numeralFontSize}px` }} className="text-muted-foreground line-through">
                  ${product.compare_at_price}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
