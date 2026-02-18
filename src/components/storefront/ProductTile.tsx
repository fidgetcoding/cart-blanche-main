import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Layers } from 'lucide-react';
import type { DemoProduct } from '@/data/demo-data';

interface ProductTileProps {
  product: DemoProduct;
  scale: number;
  isFocused: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onQuickAdd: (e: React.MouseEvent) => void;
  onQuickStyleKit: (e: React.MouseEvent) => void;
  positionOverride?: { x: number; y: number };
}

export function ProductTile({ product, scale, isFocused, isHovered, onClick, onHoverStart, onHoverEnd, onQuickAdd, onQuickStyleKit, positionOverride }: ProductTileProps) {
  const pos = positionOverride || product.grid_position;
  const showLabel = scale > 0.45;
  const glowing = isFocused || isHovered;
  const showActions = glowing && scale > 0.4;

  return (
    <motion.div
      layout
      onClick={onClick}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      className="absolute cursor-pointer"
      style={{
        left: pos.x,
        top: pos.y,
        width: 220,
        height: 280,
      }}
      whileHover={{ scale: 1.04, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className="w-full h-full flex flex-col">
        <div className={`flex-1 bg-muted/40 rounded-lg flex items-center justify-center relative overflow-hidden transition-shadow duration-300 ${glowing ? 'shadow-[0_0_20px_2px_hsla(0,0%,100%,0.08),0_0_40px_4px_hsla(0,0%,100%,0.04)]' : ''}`}>
          <div className="w-3/4 h-3/4 bg-muted/60 rounded-md" />

          {/* Quick action buttons */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-2 right-2 flex gap-1.5"
              >
                <button
                  onClick={onQuickAdd}
                  className="p-1.5 rounded-md bg-foreground/10 backdrop-blur-md border border-foreground/10 hover:bg-foreground/20 transition-colors"
                  title="Quick Add"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-foreground/80" />
                </button>
                <button
                  onClick={onQuickStyleKit}
                  className="p-1.5 rounded-md bg-foreground/10 backdrop-blur-md border border-foreground/10 hover:bg-foreground/20 transition-colors"
                  title="Style Kit"
                >
                  <Layers className="w-3.5 h-3.5 text-foreground/80" />
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