import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useGridLayout } from '@/hooks/use-grid-layout';
import { MaisonProductCard } from './MaisonProductCard';
import { MaisonProductDetail } from './MaisonProductDetail';
import { CartDrawer } from './CartDrawer';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PRODUCT_CATEGORIES } from '@/data/demo-data';
import { ShoppingBag } from 'lucide-react';
import type { DemoProduct } from '@/data/demo-data';

export function MaisonCanvas() {
  const { loading, getOrderedProducts, getOrderedCategories } = useGridLayout();
  const { items, openCart, itemCount } = useCart();
  const { themeSettings } = useTheme();
  const [viewMode, setViewMode] = useState<3 | 6>(3);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeType, setActiveType] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct | null>(null);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  const allProducts = useMemo(() => getOrderedProducts(), [getOrderedProducts]);
  const categories = useMemo(() => getOrderedCategories(), [getOrderedCategories]);

  // Product types from PRODUCT_CATEGORIES
  const productTypes = useMemo(() => {
    return ['ALL', ...PRODUCT_CATEGORIES.filter(c => c).map(c => c.toUpperCase())];
  }, []);

  const filteredProducts = useMemo(() => {
    let result = allProducts;
    if (activeCategory !== 'ALL') {
      result = result.filter(p => p.category.toUpperCase() === activeCategory);
    }
    if (activeType !== 'ALL') {
      result = result.filter(p => p.product_category?.toUpperCase() === activeType);
    }
    return result;
  }, [allProducts, activeCategory, activeType]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <p className="text-foreground tracking-[0.3em] text-[11px] uppercase" style={{ fontFamily: 'var(--font-display)' }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Sticky header with integrated category nav */}
      <header
        className="sticky top-0 z-30 flex items-center px-6 py-3 bg-background border-b border-border"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {/* Store name — left */}
        <div
          className="text-sm tracking-[0.3em] uppercase font-medium flex-shrink-0"
          style={{ color: themeSettings.storeNameColor || undefined }}
        >
          {themeSettings.storeName}
        </div>

        {/* Category links — center */}
        <nav className="flex-1 flex items-center justify-center gap-8" style={{ fontFamily: 'var(--font-body)' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onMouseEnter={() => setActiveCategory(cat)}
              onClick={() => setActiveCategory(cat)}
              className="relative py-1 transition-colors"
              style={{
                fontSize: 'var(--font-size-body)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: activeCategory === cat ? (themeSettings.bodyFontColor || undefined) : undefined,
                fontWeight: activeCategory === cat ? 600 : 400,
                opacity: activeCategory === cat ? 1 : 0.5,
              }}
            >
              {cat}
              {activeCategory === cat && (
                <motion.div
                  layoutId="maison-cat-underline"
                  className="absolute bottom-0 left-0 right-0 h-[1px] bg-foreground"
                />
              )}
            </button>
          ))}
        </nav>

        {/* Cart — right */}
        <button onClick={openCart} className="relative p-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
          {itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-foreground text-background rounded-full text-[9px] flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </button>
      </header>

      {/* Sub-header: type dropdown + view toggle */}
      <div
        className="sticky top-[49px] z-20 flex items-center justify-between px-6 py-3 border-b border-border bg-background"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* Product type dropdown */}
        <div className="relative" onMouseEnter={() => setTypeDropdownOpen(true)} onMouseLeave={() => setTypeDropdownOpen(false)}>
          <button
            className="flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            {activeType === 'ALL' ? 'ALL TYPES' : activeType}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <AnimatePresence>
            {typeDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 pt-1 z-20"
              >
                <div className="py-2 min-w-[160px] bg-background border border-border">
                  {productTypes.map(type => (
                    <button
                      key={type}
                      onMouseEnter={() => setActiveType(type)}
                      onClick={() => { setActiveType(type); setTypeDropdownOpen(false); }}
                      className={`block w-full text-left px-4 py-2 text-[11px] tracking-[0.15em] uppercase hover:bg-muted/40 transition-colors ${
                        activeType === type ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-3">
          <button
            onMouseEnter={() => setViewMode(3)}
            onClick={() => setViewMode(3)}
            className="text-[11px] tracking-[0.15em] uppercase transition-colors px-2 py-1"
            style={{
              opacity: viewMode === 3 ? 1 : 0.5,
              borderBottom: viewMode === 3 ? '1px solid currentColor' : '1px solid transparent',
            }}
          >
            View by 3
          </button>
          <button
            onMouseEnter={() => setViewMode(6)}
            onClick={() => setViewMode(6)}
            className="text-[11px] tracking-[0.15em] uppercase transition-colors px-2 py-1"
            style={{
              opacity: viewMode === 6 ? 1 : 0.5,
              borderBottom: viewMode === 6 ? '1px solid currentColor' : '1px solid transparent',
            }}
          >
            View by 6
          </button>
        </div>
      </div>


      {/* Product grid */}
      <div className="px-0">
        <motion.div
          layout
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${viewMode}, 1fr)`,
            borderLeft: '1px solid hsl(var(--border))',
            borderTop: '1px solid hsl(var(--border))',
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, i) => (
              <MaisonProductCard
                key={product.id}
                product={product}
                viewMode={viewMode}
                onClick={() => setSelectedProduct(product)}
                index={i}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Product detail overlay */}
      {selectedProduct && (
        <MaisonProductDetail
          product={selectedProduct}
          products={filteredProducts}
          onClose={() => setSelectedProduct(null)}
          onNavigate={setSelectedProduct}
        />
      )}

      {/* Cart drawer */}
      <CartDrawer />
    </div>
  );
}
