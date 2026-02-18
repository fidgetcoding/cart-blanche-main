import { motion } from 'framer-motion';
import type { DemoProduct } from '@/data/demo-data';

interface ProductTileProps {
  product: DemoProduct;
  scale: number;
  isFocused: boolean;
  onClick: () => void;
  positionOverride?: { x: number; y: number };
}

export function ProductTile({ product, scale, isFocused, onClick, positionOverride }: ProductTileProps) {
  const pos = positionOverride || product.grid_position;
  // Show SKU label at reasonable zoom
  const showLabel = scale > 0.45;

  return (
    <motion.div
      layout
      onClick={onClick}
      className="absolute cursor-pointer group"
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
        {/* Product image area */}
          <div className="flex-1 bg-muted/40 rounded-lg flex items-center justify-center relative overflow-hidden">
          <div className="w-3/4 h-3/4 bg-muted/60 rounded-md" />
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

      {/* Focus indicator */}
      {isFocused && (
        <motion.div
          layoutId="tile-focus"
          className="absolute inset-0 border border-foreground/20 pointer-events-none"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </motion.div>
  );
}
