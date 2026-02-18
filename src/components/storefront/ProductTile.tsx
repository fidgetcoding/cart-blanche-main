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
          <div className={`flex-1 bg-muted/40 rounded-lg flex items-center justify-center relative overflow-hidden transition-shadow duration-300 group-hover:shadow-[0_0_20px_2px_hsla(0,0%,100%,0.08),0_0_40px_4px_hsla(0,0%,100%,0.04)] ${isFocused ? 'shadow-[0_0_20px_2px_hsla(0,0%,100%,0.08),0_0_40px_4px_hsla(0,0%,100%,0.04)]' : ''}`}>
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

      {/* Focus uses glow on thumbnail, no outline */}
    </motion.div>
  );
}
