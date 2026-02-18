import { motion } from 'framer-motion';
import type { DemoProduct } from '@/data/demo-data';

interface ProductTileProps {
  product: DemoProduct;
  scale: number;
  isFocused: boolean;
  onClick: () => void;
}

export function ProductTile({ product, scale, isFocused, onClick }: ProductTileProps) {
  // Show SKU label at reasonable zoom
  const showLabel = scale > 0.45;

  return (
    <motion.div
      layout
      onClick={onClick}
      className="absolute cursor-pointer group"
      style={{
        left: product.grid_position.x,
        top: product.grid_position.y,
        width: 220,
        height: 280,
      }}
      whileHover={{ scale: 1.04, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className="w-full h-full flex flex-col">
        {/* Product image area — clean white like Yeezy */}
        <div className="flex-1 bg-background flex items-center justify-center relative overflow-hidden">
          {/* Placeholder silhouette — will be replaced with real images */}
          <div className="w-3/4 h-3/4 bg-muted/40 rounded-sm" />
        </div>

        {/* SKU label underneath — like Yeezy's product codes */}
        {showLabel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-2 pb-1 text-center"
          >
            <p className="font-display text-[11px] font-medium tracking-[0.12em] text-foreground/70 uppercase">
              {product.id.toUpperCase().replace('P', 'CB-')}
            </p>
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
