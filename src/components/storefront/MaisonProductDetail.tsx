import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { DemoProduct } from '@/data/demo-data';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';

interface MaisonProductDetailProps {
  product: DemoProduct | null;
  products: DemoProduct[];
  allProducts: DemoProduct[];
  onClose: () => void;
  onNavigate: (product: DemoProduct) => void;
  onBuildSet: (product: DemoProduct) => void;
}

function ExpandableRow({ title, product }: { title: string; product: DemoProduct }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-full flex items-center justify-between py-4 text-[10px] tracking-[0.15em] uppercase text-foreground hover:text-foreground/80 transition-colors"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {title}
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-[10px] leading-[1.8] text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>
              {title === 'MORE DETAILS' && (product.description || 'No additional details available.')}
              {title === 'SHIPPING & RETURNS' && 'Complimentary shipping on all orders. Returns accepted within 30 days of delivery.'}
              {title === 'CONTACT US' && 'For inquiries, reach out to support@cartblanche.com'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MaisonProductDetail({ product, products, allProducts, onClose, onNavigate, onBuildSet }: MaisonProductDetailProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [currentVisibleImage, setCurrentVisibleImage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const { themeSettings } = useTheme();

  // Reset state on product change
  useEffect(() => {
    setSelectedVariant(null);
    setCurrentVisibleImage(0);
    // Scroll left column back to top
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [product?.id]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!product) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [product, onClose]);

  // IntersectionObserver for image counter
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !product) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-image-index'));
            if (!isNaN(idx)) setCurrentVisibleImage(idx);
          }
        });
      },
      { root: container, threshold: 0.5 }
    );

    container.querySelectorAll('[data-image-index]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [product?.id]);

  if (!product) return null;

  const images = product.images.length > 0 ? product.images : ['/placeholder.svg'];
  const variant = product.variants.find(v => v.id === selectedVariant);
  const isOutOfStock = variant ? variant.inventory_count === 0 : product.variants.every(v => v.inventory_count === 0);

  const handleAddToCart = () => {
    const v = variant || product.variants[0];
    if (!v || isOutOfStock) return;
    addItem({
      productId: product.id,
      variantId: v.id,
      title: product.title,
      variantTitle: v.title,
      price: v.price ?? product.price,
      image: product.images[0],
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-1 overflow-hidden"
      onClick={onClose}
    >
      {/* LEFT COLUMN: Vertical image scroll */}
      <div
        ref={scrollContainerRef}
        className="w-[55%] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Image counter — positioned along left edge */}
        {images.length > 1 && (
          <div
            className="sticky top-1/2 -translate-y-1/2 float-left ml-4 z-10 flex flex-col items-center text-[11px] text-muted-foreground"
            style={{ fontFamily: 'var(--font-numeral)' }}
          >
            <span>{currentVisibleImage + 1}</span>
            <div className="w-px h-3 bg-foreground/30 my-1" />
            <span>{images.length}</span>
          </div>
        )}

        {/* All images stacked vertically */}
        {images.map((img, i) => (
          <div key={i} data-image-index={i} className="w-full">
            <img
              src={img}
              alt={`${product.title} ${i + 1}`}
              className="w-full h-auto object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* RIGHT COLUMN: Info + carousel */}
      <div className="w-[45%] overflow-y-auto border-l border-border" onClick={e => e.stopPropagation()}>
        {/* Product info */}
        <div className="px-10 py-8">
          {/* Category label */}
          <p
            className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {product.category.toUpperCase()}
          </p>

          {/* Title */}
          <h1
            className="tracking-[0.15em] uppercase mt-3"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'calc(var(--font-size-display) * 1.4)',
              color: themeSettings.displayFontColor || undefined,
            }}
          >
            {product.title}
          </h1>

          {/* Price */}
          <div className="flex items-center gap-3 mt-2">
            <p style={{
              fontFamily: 'var(--font-numeral)',
              fontSize: 'var(--font-size-numeral)',
              color: themeSettings.numeralFontColor || undefined,
            }}>
              ${product.price}
            </p>
            {product.compare_at_price && (
              <p className="line-through text-muted-foreground/50" style={{
                fontFamily: 'var(--font-numeral)',
                fontSize: 'var(--font-size-numeral)',
              }}>
                ${product.compare_at_price}
              </p>
            )}
          </div>

          {/* Size selector */}
          {product.variants.length > 1 && (
            <div className="mt-8">
              <p
                className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                SELECT SIZE
              </p>
              <div className="flex gap-2 flex-wrap">
                {product.variants.map(v => (
                  <button
                    key={v.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedVariant(v.id === selectedVariant ? null : v.id); }}
                    className={`px-4 py-2 text-[10px] tracking-[0.15em] uppercase border transition-colors ${
                      v.id === selectedVariant
                        ? 'bg-foreground text-background border-foreground'
                        : v.inventory_count === 0
                          ? 'border-border text-muted-foreground/30 line-through cursor-not-allowed'
                          : 'border-border text-foreground hover:border-foreground'
                    }`}
                    disabled={v.inventory_count === 0}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ADD TO CART — full width, solid bg */}
          <button
            onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}
            disabled={isOutOfStock}
            className={`w-full py-3.5 mt-8 text-[10px] tracking-[0.25em] uppercase transition-colors ${
              isOutOfStock
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-foreground text-background hover:bg-foreground/90'
            }`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {isOutOfStock ? 'JOIN THE WAITLIST' : 'ADD TO CART'}
          </button>

          {/* BUILD A SET — full width, outline */}
          <button
            onClick={(e) => { e.stopPropagation(); onBuildSet(product); }}
            className="w-full py-3.5 mt-3 border border-foreground text-foreground text-[10px] tracking-[0.25em] uppercase transition-colors hover:bg-foreground hover:text-background"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            BUILD A SET
          </button>

          {/* Description */}
          <p
            className="mt-8 text-[11px] leading-[1.8] tracking-wide text-muted-foreground uppercase"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {product.description}
          </p>

          {/* Expandable sections */}
          <div className="mt-6 space-y-0">
            <ExpandableRow title="MORE DETAILS" product={product} />
            <ExpandableRow title="SHIPPING & RETURNS" product={product} />
            <ExpandableRow title="CONTACT US" product={product} />
          </div>
        </div>

        {/* Horizontal "You May Also Like" carousel */}
        <div className="border-t border-border px-10 py-6 mt-auto">
          <p
            className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            YOU MAY ALSO LIKE
          </p>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {allProducts.filter(p => p.id !== product.id).map(p => (
              <div
                key={p.id}
                onClick={(e) => { e.stopPropagation(); onNavigate(p); }}
                className="flex-shrink-0 w-[140px] cursor-pointer group"
              >
                <div
                  className="aspect-[3/4] overflow-hidden"
                  style={{ backgroundColor: themeSettings.tileBgMode === 'transparent' ? 'transparent' : (themeSettings.mode === 'light' ? '#ececec' : '#151515') }}
                >
                  <img
                    src={p.images[0] || '/placeholder.svg'}
                    alt={p.title}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    draggable={false}
                  />
                </div>
                <p
                  className="mt-2 text-[9px] tracking-[0.12em] uppercase truncate"
                  style={{ fontFamily: 'var(--font-display)', color: themeSettings.displayFontColor || undefined }}
                >
                  {p.title}
                </p>
                <p
                  className="text-[9px] tracking-[0.08em] text-muted-foreground"
                  style={{ fontFamily: 'var(--font-numeral)' }}
                >
                  ${p.price}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
