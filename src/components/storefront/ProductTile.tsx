import { motion } from 'framer-motion';
import type { DemoProduct } from '@/data/demo-data';

interface ProductTileProps {
  product: DemoProduct;
  scale: number;
  isFocused: boolean;
  onClick: () => void;
}

export function ProductTile({ product, scale, isFocused, onClick }: ProductTileProps) {
  const showTitle = scale > 0.6;
  const showPrice = scale > 0.75;

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`absolute cursor-pointer group`}
      style={{
        left: product.grid_position.x,
        top: product.grid_position.y,
        width: 220,
        height: 280,
      }}
      whileHover={{ scale: 1.03, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Product image area — no borders, just a subtle surface */}
      <div
        className="w-full h-full flex flex-col transition-opacity duration-200"
        style={{ opacity: isFocused ? 1 : 0.85 }}
      >
        <div className="flex-1 bg-[hsl(0_0%_8%)] relative overflow-hidden">
          {product.compare_at_price && (
            <div className="absolute top-2 left-2 bg-accent text-accent-foreground text-[9px] font-display font-bold px-1.5 py-0.5">
              SALE
            </div>
          )}
        </div>

        {/* Title + price fade in at closer zoom */}
        {showTitle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-2.5 space-y-0.5"
          >
            <p className="font-display text-[11px] font-medium text-foreground/70 truncate">{product.title}</p>
            {showPrice && (
              <div className="flex items-center gap-2">
                <span className="font-display text-[11px] text-foreground/50">${product.price}</span>
                {product.compare_at_price && (
                  <span className="text-[10px] text-muted-foreground/40 line-through">
                    ${product.compare_at_price}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Focus indicator — subtle border, not a ring */}
      {isFocused && (
        <motion.div
          layoutId="tile-focus"
          className="absolute inset-0 border border-accent/40 pointer-events-none"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </motion.div>
  );
}
