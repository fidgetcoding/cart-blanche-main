import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
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
  onQuickAdd?: (e: React.MouseEvent) => void;
  onQuickStyleKit?: (e: React.MouseEvent) => void;
  positionOverride?: { x: number; y: number };
  /** The Quick Add and Style Kit buttons on hover. The store shows them; the landing turns them off. */
  actions?: boolean;
}

/** Thumbnails this page has already loaded and shown. */
const shownThumbs = new Set<string>();

export const ProductTile = memo(function ProductTile({
  product, scale, isFocused, isHovered, dimmed, onClick, onHoverStart, onHoverEnd, onQuickAdd, onQuickStyleKit, positionOverride, actions = true
}: ProductTileProps) {
  const pos = positionOverride || product.grid_position;
  const showLabel = scale > 0.45;
  const glowing = isFocused || isHovered;
  const showActions = actions && glowing && scale > 0.4;
  // A photo this page has already shown (a tile remounting on a page flip, a filter or a return from a product)
  // shows at once, eagerly and decoded in step. Fading it in from nothing blanked every tile on the canvas for a
  // moment, because a lazy image starts out unloaded even when the browser has it.
  const src = product.images?.[0]?.thumb;
  const [seen] = useState(() => !!src && shownThumbs.has(src));
  const [imgLoaded, setImgLoaded] = useState(seen);
  const imgRef = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) setImgLoaded(true);
  }, []);
  const { themeSettings } = useTheme();

  const handleLoad = useCallback(() => { if (src) shownThumbs.add(src); setImgLoaded(true); }, [src]);

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
        <div className={`flex-1 rounded-lg flex items-center justify-center relative overflow-hidden transition-shadow duration-300`} style={{
          backgroundColor: themeSettings.tileBgMode === 'transparent' ? 'transparent' : (themeSettings.mode === 'light' ? '#ececec' : '#151515'),
          ...(glowing ? { boxShadow: `0 0 20px 2px ${themeSettings.tileHoverGlow}, 0 0 40px 4px ${themeSettings.tileHoverGlow}` } : {}),
        }}>
          {product.images && product.images.length > 0 ? (
            <img
              ref={imgRef}
              src={product.images[0].thumb}
              alt={product.title}
              loading={seen ? 'eager' : 'lazy'}
              decoding={seen ? 'sync' : 'async'}
              onLoad={handleLoad}
              className={`w-full h-full object-cover rounded-lg pointer-events-none transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="w-3/4 h-3/4 bg-muted/60 rounded-md pointer-events-none" />
          )}

          {/* Quick action buttons — Phase 5: removed backdrop-blur */}
          {showActions && (
            <div className="absolute bottom-2 right-2 flex gap-1 animate-in fade-in-0 duration-150">
              <button
                onClick={onQuickAdd}
                className="p-1.5 rounded-md bg-background/80 hover:bg-background/90 transition-colors"
                title="Quick Add"
              >
                <ShoppingBag className="w-3 h-3 text-foreground/70" />
              </button>
              <button
                onClick={onQuickStyleKit}
                className="p-1.5 rounded-md bg-background/80 hover:bg-background/90 transition-colors"
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
