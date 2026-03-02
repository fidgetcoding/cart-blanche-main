import { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
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
  const lastChangedFilter = useRef<'ribbon' | 'dropdown'>('ribbon');

  const allProducts = useMemo(() => getOrderedProducts(), [getOrderedProducts]);
  const categories = useMemo(() => getOrderedCategories(), [getOrderedCategories]);

  const productTypes = useMemo(() => {
    return ['ALL', ...PRODUCT_CATEGORIES.filter(c => c).map(c => c.toUpperCase())];
  }, []);

  const handleRibbonChange = useCallback((cat: string) => {
    lastChangedFilter.current = 'ribbon';
    setActiveCategory(cat);
    const filtered = allProducts.filter(p => {
      const matchesCat = cat === 'ALL' || p.category.toUpperCase() === cat;
      const matchesType = activeType === 'ALL' || p.product_category?.toUpperCase() === activeType;
      return matchesCat && matchesType;
    });
    if (filtered.length === 0 && activeType !== 'ALL') {
      setActiveType('ALL');
    }
  }, [allProducts, activeType]);

  const handleTypeChange = useCallback((type: string) => {
    lastChangedFilter.current = 'dropdown';
    setActiveType(type);
    const filtered = allProducts.filter(p => {
      const matchesCat = activeCategory === 'ALL' || p.category.toUpperCase() === activeCategory;
      const matchesType = type === 'ALL' || p.product_category?.toUpperCase() === type;
      return matchesCat && matchesType;
    });
    if (filtered.length === 0 && activeCategory !== 'ALL') {
      setActiveCategory('ALL');
    }
  }, [allProducts, activeCategory]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      const matchesCat = activeCategory === 'ALL' || p.category.toUpperCase() === activeCategory;
      const matchesType = activeType === 'ALL' || p.product_category?.toUpperCase() === activeType;
      return matchesCat && matchesType;
    });
  }, [allProducts, activeCategory, activeType]);

  if (loading) {
    return (
      <div className={`h-screen w-full flex items-center justify-center bg-background ${themeSettings.mode === 'light' ? 'light' : ''}`}>
        <p className="text-foreground tracking-[0.3em] text-[11px] uppercase" style={{ fontFamily: 'var(--font-display)' }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full bg-background text-foreground ${themeSettings.mode === 'light' ? 'light' : ''}`}>
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
              onClick={() => handleRibbonChange(cat)}
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

      {/* Sub-header: type selector + view toggle */}
      <div
        className="sticky top-[49px] z-20 flex items-center justify-between px-6 py-3 border-b border-border bg-background"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* Product type horizontal reveal */}
        <div
          className="flex items-center gap-0 overflow-hidden"
          onMouseEnter={() => setTypeDropdownOpen(true)}
          onMouseLeave={() => setTypeDropdownOpen(false)}
        >
          <button
            className="flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            {activeType === 'ALL' ? 'CATEGORY' : activeType}
            <motion.span
              animate={{ rotate: typeDropdownOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="inline-flex"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.span>
          </button>
          <AnimatePresence>
            {typeDropdownOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex items-center overflow-hidden ml-2"
              >
                <div className="w-px h-4 bg-border/60 mr-3 flex-shrink-0" />
                <div className="flex items-center gap-4 flex-nowrap">
                  {productTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => { handleTypeChange(type); setTypeDropdownOpen(false); }}
                      className={`text-[11px] tracking-[0.15em] uppercase whitespace-nowrap transition-colors ${
                        activeType === type ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
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

        {/* View toggle — hidden when type selector is expanded */}
        <AnimatePresence>
          {!typeDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 overflow-hidden"
            >
              <button
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
                onClick={() => setViewMode(6)}
                className="text-[11px] tracking-[0.15em] uppercase transition-colors px-2 py-1"
                style={{
                  opacity: viewMode === 6 ? 1 : 0.5,
                  borderBottom: viewMode === 6 ? '1px solid currentColor' : '1px solid transparent',
                }}
              >
                View by 6
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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
