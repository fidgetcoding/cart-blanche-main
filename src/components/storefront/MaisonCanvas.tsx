import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShoppingBag } from 'lucide-react';
import { useGridLayout } from '@/hooks/use-grid-layout';
import { useTheme } from '@/contexts/ThemeContext';
import { MaisonProductCard } from './MaisonProductCard';
import { MaisonProductDetail } from './MaisonProductDetail';
import { CartDrawer } from './CartDrawer';
import { useCart } from '@/contexts/CartContext';
import type { DemoProduct } from '@/data/demo-data';

// Inject Cormorant Garamond
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap';

export function MaisonCanvas() {
  const { themeSettings } = useTheme();
  const { loading, getOrderedProducts, getOrderedCategories } = useGridLayout();
  const { items, openCart, itemCount } = useCart();
  const [viewMode, setViewMode] = useState<3 | 6>(3);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Inject font
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }, []);

  // Derive theme colors
  const bgColor = themeSettings.mode === 'light' ? '#FAF7F2' : '#0a0a0a';
  const textColor = themeSettings.displayFontColor || (themeSettings.mode === 'light' ? '#1a1a1a' : '#f5f5f5');
  const borderColor = themeSettings.mode === 'light' ? '#e8e4de' : '#222';
  const mutedColor = themeSettings.mode === 'light' ? '#999' : '#666';
  const displayFont = `'${themeSettings.displayFont}', Georgia, serif`;
  const bodyFont = `'${themeSettings.bodyFont}', Georgia, serif`;
  const storeName = themeSettings.storeName || 'CART BLANCHE';
  const storeNameColor = themeSettings.storeNameColor || textColor;

  const allProducts = useMemo(() => getOrderedProducts(), [getOrderedProducts]);
  const categories = useMemo(() => getOrderedCategories(), [getOrderedCategories]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'ALL') return allProducts;
    return allProducts.filter(p => p.category.toUpperCase() === activeCategory);
  }, [allProducts, activeCategory]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <p style={{ fontFamily: displayFont, color: textColor, letterSpacing: '0.3em', fontSize: '11px', textTransform: 'uppercase' }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: bgColor, color: textColor }}>
      {/* Sticky header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: bgColor, borderBottom: `1px solid ${borderColor}`, fontFamily: displayFont }}
      >
        <div
          className="tracking-[0.3em] uppercase font-medium"
          style={{ fontSize: `${themeSettings.bodyFontSize}px`, color: storeNameColor, fontFamily: bodyFont }}
        >
          {storeName}
        </div>
        <button onClick={openCart} className="relative p-2 transition-colors" style={{ color: `${textColor}99` }}>
          <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
          {itemCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] flex items-center justify-center"
              style={{ backgroundColor: textColor, color: bgColor }}
            >
              {itemCount}
            </span>
          )}
        </button>
      </header>

      {/* Category ribbon */}
      <nav
        className="sticky top-[57px] z-20 flex items-center justify-center gap-8 px-6 py-3"
        style={{ backgroundColor: bgColor, borderBottom: `1px solid ${borderColor}`, fontFamily: bodyFont }}
      >
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="relative py-1 transition-colors"
            style={{
              fontSize: `${themeSettings.bodyFontSize}px`,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: activeCategory === cat ? textColor : mutedColor,
              fontWeight: activeCategory === cat ? 600 : 400,
            }}
          >
            {cat}
            {activeCategory === cat && (
              <motion.div
                layoutId="maison-cat-underline"
                className="absolute bottom-0 left-0 right-0 h-[1px]"
                style={{ backgroundColor: textColor }}
              />
            )}
          </button>
        ))}
      </nav>

      {/* Sub-header: category dropdown + view toggle */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: `1px solid ${borderColor}`, fontFamily: bodyFont }}
      >
        <div className="relative">
          <button
            onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
            className="flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase transition-colors"
            style={{ color: `${textColor}B3` }}
          >
            {activeCategory === 'ALL' ? 'ALL PRODUCTS' : activeCategory}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <AnimatePresence>
            {categoryDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 mt-1 py-2 min-w-[160px] z-20"
                style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
              >
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setCategoryDropdownOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-[11px] tracking-[0.15em] uppercase transition-colors"
                    style={{ color: activeCategory === cat ? textColor : mutedColor }}
                  >
                    {cat}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(3)}
            className="text-[11px] tracking-[0.15em] uppercase transition-colors px-2 py-1"
            style={{
              color: viewMode === 3 ? textColor : mutedColor,
              borderBottom: viewMode === 3 ? `1px solid ${textColor}` : '1px solid transparent',
            }}
          >
            View by 3
          </button>
          <button
            onClick={() => setViewMode(6)}
            className="text-[11px] tracking-[0.15em] uppercase transition-colors px-2 py-1"
            style={{
              color: viewMode === 6 ? textColor : mutedColor,
              borderBottom: viewMode === 6 ? `1px solid ${textColor}` : '1px solid transparent',
            }}
          >
            View by 6
          </button>
        </div>
      </div>

      {categoryDropdownOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setCategoryDropdownOpen(false)} />
      )}

      {/* Product grid */}
      <div className="px-0">
        <motion.div
          layout
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${viewMode}, 1fr)`,
            borderLeft: `1px solid ${borderColor}`,
            borderTop: `1px solid ${borderColor}`,
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

      {selectedProduct && (
        <MaisonProductDetail
          product={selectedProduct}
          products={filteredProducts}
          onClose={() => setSelectedProduct(null)}
          onNavigate={setSelectedProduct}
        />
      )}

      <CartDrawer />
    </div>
  );
}
