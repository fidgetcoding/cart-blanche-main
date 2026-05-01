import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import type { DemoProduct } from '@/data/demo-data';
import { getImageUrl } from '@/data/demo-data';
import { useCart } from '@/contexts/CartContext';

interface ProductDetailOverlayProps {
  product: DemoProduct | null;
  onClose: () => void;
}

export function ProductDetailOverlay({ product, onClose }: ProductDetailOverlayProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const { addItem } = useCart();

  if (!product) return null;

  const variant = product.variants.find(v => v.id === selectedVariant);
  const canAdd = product.variants.length <= 1 || selectedVariant !== null;
  const isOutOfStock = variant ? variant.inventory_count === 0 : false;

  const handleAddToCart = () => {
    if (!canAdd || isOutOfStock) return;
    const v = variant || product.variants[0];
    if (!v) return;
    addItem({
      productId: product.id,
      variantId: v.id,
      title: product.title,
      variantTitle: v.title,
      price: v.price ?? product.price,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-md z-30 flex items-center justify-center p-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="liquid-glass rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex"
          onClick={e => e.stopPropagation()}
        >
          {/* Image */}
          <div className="w-1/2 bg-secondary flex items-center justify-center relative overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <img
                src={getImageUrl(product.images[0], 'medium')}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display text-muted-foreground/20 text-sm tracking-widest">
                {product.category.toUpperCase()}
              </span>
            )}
            {product.compare_at_price && (
              <div className="absolute top-4 left-4 bg-accent text-accent-foreground text-xs font-display font-bold px-2 py-1 rounded">
                SALE
              </div>
            )}
          </div>

          {/* Details */}
          <div className="w-1/2 p-8 flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground font-display tracking-widest mb-1">
                  {product.category.toUpperCase()}
                </p>
                <h2 className="font-display text-2xl font-bold">{product.title}</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-baseline gap-3 mt-3">
              <span className="font-display text-2xl font-bold">${product.price}</span>
              {product.compare_at_price && (
                <span className="text-muted-foreground line-through text-lg">
                  ${product.compare_at_price}
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              {splitSentences(product.description).map((s, i) => (
                <span key={i} className="block">{s}</span>
              ))}
            </p>

            {/* Variants */}
            {product.variants.length > 1 && (
              <div className="mt-6">
                <p className="text-xs font-display tracking-widest text-muted-foreground mb-2">SELECT SIZE</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v.id)}
                      className={`px-4 py-2 text-sm font-display rounded-md border transition-all ${
                        selectedVariant === v.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : v.inventory_count === 0
                          ? 'border-border text-muted-foreground/40 cursor-not-allowed'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                      disabled={v.inventory_count === 0}
                    >
                      {v.title}
                      {v.inventory_count === 0 && ' ✕'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock indicator */}
            {variant && (
              <p className={`text-xs mt-3 ${
                variant.inventory_count === 0 ? 'text-destructive' :
                variant.inventory_count <= 5 ? 'text-warning' : 'text-success'
              }`}>
                {variant.inventory_count === 0 ? 'Out of Stock' :
                 variant.inventory_count <= 5 ? `Low Stock — ${variant.inventory_count} left` :
                 'In Stock'}
              </p>
            )}

            <div className="mt-auto pt-6 flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!canAdd || isOutOfStock}
                className={`flex-1 py-3 font-display font-semibold text-sm tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all ${
                  !canAdd || isOutOfStock
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                {isOutOfStock ? 'OUT OF STOCK' : !canAdd ? 'SELECT SIZE' : 'ADD TO CART'}
              </button>
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`p-3 border rounded-lg transition-colors ${
                  isSaved ? 'border-accent text-accent' : 'border-border hover:border-muted-foreground'
                }`}
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
