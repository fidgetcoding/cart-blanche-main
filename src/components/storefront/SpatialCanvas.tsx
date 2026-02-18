import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { ProductView } from '@/components/storefront/ProductView';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { useCart } from '@/contexts/CartContext';

const CATEGORIES = ['ALL', ...new Set(DEMO_PRODUCTS.map(p => p.category.toUpperCase()))];

export function SpatialCanvas() {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { toggleCart, itemCount } = useCart();
  const navigate = useNavigate();

  const filteredProducts = activeCategory === 'ALL'
    ? DEMO_PRODUCTS
    : DEMO_PRODUCTS.filter(p => p.category.toUpperCase() === activeCategory);

  // Map filtered product back to its index in the full DEMO_PRODUCTS array
  const getGlobalIndex = (filteredIdx: number) => {
    const product = filteredProducts[filteredIdx];
    return DEMO_PRODUCTS.findIndex(p => p.id === product.id);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed top bar */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="font-display text-xl font-bold tracking-[0.2em]">CART BLANCHE</h1>

          {/* Category tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`font-display text-[11px] tracking-[0.15em] px-3 py-1.5 transition-colors ${
                  activeCategory === cat
                    ? 'text-foreground'
                    : 'text-muted-foreground/40 hover:text-muted-foreground'
                }`}
              >
                {cat.replace('-', ' ')}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={toggleCart} className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <motion.span key={itemCount} initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </motion.span>
              )}
            </button>
            <button onClick={() => navigate('/admin')} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile category tabs */}
        <div className="md:hidden overflow-x-auto no-scrollbar px-6 pb-3 flex gap-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`font-display text-[11px] tracking-[0.15em] px-3 py-1.5 whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'text-foreground'
                  : 'text-muted-foreground/40 hover:text-muted-foreground'
              }`}
            >
              {cat.replace('-', ' ')}
            </button>
          ))}
        </div>
      </header>

      {/* Product grid — Yeezy style: flat, no borders, just images + names */}
      <main className="px-4 pb-12">
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-[2px]"
        >
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, i) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                onClick={() => setSelectedIndex(getGlobalIndex(i))}
                className="cursor-pointer group"
              >
                {/* Product image */}
                <div className="aspect-[3/4] bg-[hsl(0_0%_7%)] flex items-center justify-center relative overflow-hidden">
                  <span className="font-display text-[hsl(0_0%_16%)] text-[9px] tracking-[0.2em] uppercase select-none">
                    {product.category}
                  </span>
                  {product.compare_at_price && (
                    <div className="absolute top-2 left-2 bg-accent text-accent-foreground text-[8px] font-display font-bold px-1.5 py-0.5">
                      SALE
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-foreground/[0.03] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Product name — Yeezy uses short codes, we show title */}
                <div className="py-2 px-1">
                  <p className="font-display text-[11px] text-foreground/60 truncate">{product.title}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Full-screen product view */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <ProductView
            productIndex={selectedIndex}
            onClose={() => setSelectedIndex(null)}
            onNavigate={(newIdx) => setSelectedIndex(newIdx)}
          />
        )}
      </AnimatePresence>

      {/* Cart */}
      <CartDrawer />
    </div>
  );
}
