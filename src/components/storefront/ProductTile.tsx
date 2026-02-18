import { motion } from 'framer-motion';
import type { DemoProduct } from '@/data/demo-data';

interface ProductTileProps {
  product: DemoProduct;
  scale: number;
  isFocused: boolean;
  onClick: () => void;
}

export function ProductTile({ product, scale, isFocused, onClick }: ProductTileProps) {
  const showDetails = scale > 0.6;
  const showActions = scale > 0.8;

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`absolute cursor-pointer group ${isFocused ? 'tile-focus' : ''}`}
      style={{
        left: product.grid_position.x,
        top: product.grid_position.y,
        width: 220,
        height: 280,
      }}
      whileHover={{ scale: 1.04, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className="w-full h-full bg-card rounded-lg overflow-hidden border border-border/50 hover:border-border transition-colors flex flex-col">
        {/* Image placeholder */}
        <div className="flex-1 bg-secondary flex items-center justify-center relative overflow-hidden">
          <span className="font-display text-muted-foreground/30 text-xs tracking-widest">
            {product.category.toUpperCase()}
          </span>
          {product.compare_at_price && (
            <div className="absolute top-2 left-2 bg-accent text-accent-foreground text-[10px] font-display font-bold px-1.5 py-0.5 rounded">
              SALE
            </div>
          )}
        </div>

        {/* Info */}
        {showDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 space-y-1"
          >
            <p className="font-display text-xs font-medium truncate">{product.title}</p>
            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-semibold">${product.price}</span>
              {product.compare_at_price && (
                <span className="text-[10px] text-muted-foreground line-through">
                  ${product.compare_at_price}
                </span>
              )}
            </div>
            {showActions && (
              <div className="flex gap-1 mt-1">
                {product.variants.slice(0, 4).map((v) => (
                  <span key={v.id} className="text-[9px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">
                    {v.title}
                  </span>
                ))}
                {product.variants.length > 4 && (
                  <span className="text-[9px] px-1 text-muted-foreground">+{product.variants.length - 4}</span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
