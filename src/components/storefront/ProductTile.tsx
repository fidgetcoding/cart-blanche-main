import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Layers } from 'lucide-react';
import type { DemoProduct } from '@/data/demo-data';

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

export function ProductTile({ product, scale, isFocused, isHovered, dimmed, onClick, onHoverStart, onHoverEnd, onQuickAdd, onQuickStyleKit, positionOverride }: ProductTileProps) {
  const pos = positionOverride || product.grid_position;
  const showLabel = scale > 0.45;
  const glowing = isFocused || isHovered;
  const showActions = glowing && scale > 0.4;

  return (
    <motion.div
      layout
      onClick={dimmed ? undefined : onClick}
      onHoverStart={dimmed ? undefined : onHoverStart}
      onHoverEnd={dimmed ? undefined : onHoverEnd}
      className={`absolute ${dimmed ? 'pointer-events-none' : 'cursor-pointer'}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: 220,
        height: 280,
        opacity: dimmed ? 0.15 : 1,
        transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      whileHover={dimmed ? undefined : { scale: 1.04, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className="w-full h-full flex flex-col">
        <div className={`flex-1 bg-muted/40 rounded-lg flex items-center justify-center relative overflow-hidden transition-shadow duration-300 ${glowing ? 'shadow-[0_0_20px_2px_hsla(0,0%,100%,0.08),0_0_40px_4px_hsla(0,0%,100%,0.04)]' : ''}`}>
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-full h-full object-cover rounded-lg pointer-events-none"
            />
          ) : (
            <div className="w-3/4 h-3/4 bg-muted/60 rounded-md pointer-events-none" />
          )}

          {/* Quick action buttons — bottom-right of thumbnail */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-2 right-2 flex gap-1"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Product name + price */}
        {showLabel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-2 pb-1 space-y-0.5"
          >
            <p className="font-display text-[11px] font-medium tracking-[0.05em] text-foreground/80 truncate">
              {product.title}
            </p>
            <div className="flex items-center gap-2">
              <span className="font-body text-[10px] text-foreground/60">
                ${product.price}
              </span>
              {product.compare_at_price && (
                <span className="font-body text-[10px] text-muted-foreground line-through">
                  ${product.compare_at_price}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}