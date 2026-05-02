import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, LayoutDashboard } from 'lucide-react';
import { useGridLayout } from '@/hooks/use-grid-layout';
import { MaisonProductCard } from './MaisonProductCard';
import { MaisonProductDetail } from './MaisonProductDetail';
import { CartDrawer } from './CartDrawer';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useStyleKit } from '@/contexts/StyleKitContext';
import { StyleKitView } from './StyleKitView';


import { ShoppingBag } from 'lucide-react';
import type { DemoProduct } from '@/data/demo-data';

export function MaisonCanvas() {
  const navigate = useNavigate();
  const { loading, layout, getOrderedProducts, getOrderedCategories } = useGridLayout();
  const { items, openCart, itemCount } = useCart();
  const { themeSettings } = useTheme();
  const { openStyleKit, closeStyleKit, isOpen: styleKitOpen } = useStyleKit();
  const [viewMode, setViewMode] = useState<3 | 6>(3);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeType, setActiveType] = useState('ALL');
  const [activeGenders, setActiveGenders] = useState<string[]>([]);
  const toggleGender = (g: string) => {
    setActiveGenders(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct | null>(null);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [buildSetProduct, setBuildSetProduct] = useState<DemoProduct | null>(null);
  const typeCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChangedFilter = useRef<'ribbon' | 'dropdown'>('ribbon');
  const canvasRef = useRef<HTMLDivElement>(null);

  // Block browser back/forward gesture on horizontal swipes across the entire storefront
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleBuildSet = useCallback((product: DemoProduct) => {
    openStyleKit(product, 'counterparts');
    setBuildSetProduct(product);
  }, [openStyleKit]);

  const closeBuildSet = useCallback(() => {
    setBuildSetProduct(null);
    closeStyleKit();
  }, [closeStyleKit]);

  // Sync: when StyleKit closes itself (via X or Escape), close our modal too
  useEffect(() => {
    if (!styleKitOpen && buildSetProduct) {
      setBuildSetProduct(null);
    }
  }, [styleKitOpen, buildSetProduct]);

  const scheduleCloseTypeDropdown = useCallback(() => {
    if (typeCloseTimer.current) clearTimeout(typeCloseTimer.current);
    typeCloseTimer.current = setTimeout(() => setTypeDropdownOpen(false), 5000);
  }, []);

  useEffect(() => () => {
    if (typeCloseTimer.current) clearTimeout(typeCloseTimer.current);
  }, []);

  const allProducts = useMemo(() => getOrderedProducts(), [getOrderedProducts]);
  const categories = useMemo(() => getOrderedCategories(), [getOrderedCategories]);

  const productTypes = useMemo(() => {
    const hiddenSet = new Set((layout?.hiddenProductTypes || []).map(t => t.toUpperCase()));
    // Derive from actual products, not static constant — matches settings pills
    const fromProducts = new Set(allProducts.map(p => (p.product_type || '').toUpperCase()).filter(Boolean));
    return ['ALL', ...Array.from(fromProducts).sort().filter(c => !hiddenSet.has(c))];
  }, [layout, allProducts]);

  const handleRibbonChange = useCallback((cat: string) => {
    lastChangedFilter.current = 'ribbon';
    setActiveCategory(cat);
    const filtered = allProducts.filter(p => {
      const matchesCat = cat === 'ALL' || p.category.toUpperCase() === cat;
      const matchesType = activeType === 'ALL' || p.product_type?.toUpperCase() === activeType;
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
      const matchesType = type === 'ALL' || p.product_type?.toUpperCase() === type;
      return matchesCat && matchesType;
    });
    if (filtered.length === 0 && activeCategory !== 'ALL') {
      setActiveCategory('ALL');
    }
  }, [allProducts, activeCategory]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      const matchesCat = activeCategory === 'ALL' || p.category.toUpperCase() === activeCategory;
      const matchesType = activeType === 'ALL' || p.product_type?.toUpperCase() === activeType;
      const g = (p.gender || 'unisex').toLowerCase();
      const matchesGender =
        activeGenders.length === 0 ||
        activeGenders.some(sel => {
          const s = sel.toLowerCase();
          if (s === 'men') return g === 'men' || g === 'unisex';
          if (s === 'women') return g === 'women' || g === 'unisex';
          if (s === 'unisex') return g === 'unisex';
          return g === s;
        });
      return matchesCat && matchesType && matchesGender;
    });
  }, [allProducts, activeCategory, activeType, activeGenders]);

  // Genders present in products matching current category + type filters.
  const availableGenders = useMemo(() => {
    const pool = allProducts.filter(p => {
      const matchesCat = activeCategory === 'ALL' || p.category.toUpperCase() === activeCategory;
      const matchesType = activeType === 'ALL' || p.product_type?.toUpperCase() === activeType;
      return matchesCat && matchesType;
    });
    return new Set(pool.map(p => (p.gender || 'unisex').toLowerCase()));
  }, [allProducts, activeCategory, activeType]);

  // A gender chip is "available" if clicking it would yield at least
  // one product. MEN matches 'men' or 'unisex'; WOMEN matches 'women'
  // or 'unisex'; UNISEX matches only 'unisex'.
  const isGenderAvailable = (g: string): boolean => {
    const upper = g.toUpperCase();
    if (upper === 'MEN') return availableGenders.has('men') || availableGenders.has('unisex');
    if (upper === 'WOMEN') return availableGenders.has('women') || availableGenders.has('unisex');
    if (upper === 'UNISEX') return availableGenders.has('unisex');
    return false;
  };

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
    <div ref={canvasRef} className={`min-h-screen w-full bg-background text-foreground ${themeSettings.mode === 'light' ? 'light' : ''}`}>
      {/* Sticky header with integrated category nav */}
      <header
        className="sticky top-0 z-30 flex items-center px-6 py-3 bg-background border-b border-border"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {/* Store name — left */}
        <div
          className="text-sm tracking-[0.3em] uppercase font-medium flex-shrink-0 text-foreground"
          style={{ color: themeSettings.storeNameColor || undefined }}
        >
          {themeSettings.storeName}
        </div>

        {/* Category links — center */}
        <nav className="flex-1 flex items-center justify-center gap-8" style={{ fontFamily: 'var(--font-body)' }}>
          {categories.map(cat => (
            <button
              key={cat}
              
              onMouseEnter={() => handleRibbonChange(cat)}
              onClick={() => handleRibbonChange(cat)}
              className={`relative py-1 transition-all duration-200 ${
                activeCategory === cat ? 'opacity-100' : 'opacity-50 hover:opacity-80'
              }`}
              style={{
                fontSize: 'var(--font-size-body)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: activeCategory === cat ? (themeSettings.bodyFontColor || undefined) : undefined,
                fontWeight: activeCategory === cat ? 600 : 400,
              }}
            >
              {cat.replace(/-/g, ' ')}
            </button>
          ))}
        </nav>

        {/* Right: Smart Portal + Cart */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => navigate('/admin')}
            className="group flex items-center gap-1.5 p-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Smart Portal"
          >
            <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
            <span className="overflow-hidden max-w-0 group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out text-[10px] tracking-[0.2em] uppercase whitespace-nowrap">
              Smart Portal
            </span>
          </button>
          <button onClick={openCart} className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-foreground text-background rounded-full text-[9px] flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Sub-header: type selector + view toggle */}
      <div
        className="sticky top-[49px] z-20 flex items-center justify-between px-6 py-3 border-b border-border bg-background"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* Product type horizontal reveal */}
        <div
          className="flex items-center gap-0 overflow-hidden"
          onMouseLeave={() => {
            if (typeCloseTimer.current) clearTimeout(typeCloseTimer.current);
            typeCloseTimer.current = setTimeout(() => setTypeDropdownOpen(false), 5000);
          }}
        >
          <button
            className="flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            onMouseEnter={() => {
              if (typeCloseTimer.current) { clearTimeout(typeCloseTimer.current); typeCloseTimer.current = null; }
              setTypeDropdownOpen(prev => !prev);
            }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={activeType}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {activeType === 'ALL' ? 'CATEGORY' : activeType}
              </motion.span>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {!typeDropdownOpen && (
                <motion.span
                  key="chevron"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 4 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  className="inline-flex"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <AnimatePresence>
            {typeDropdownOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex items-center overflow-hidden ml-2"
                onMouseEnter={() => {
                  if (typeCloseTimer.current) { clearTimeout(typeCloseTimer.current); typeCloseTimer.current = null; }
                }}
              >
                <div className="w-px h-4 bg-border/60 mr-3 flex-shrink-0" />
                <div className="flex items-center gap-4 flex-nowrap">
                  {productTypes.map(type => (
                    <button
                      key={type}
                      onMouseEnter={() => handleTypeChange(type)}
                      onClick={() => { handleTypeChange(type); setTypeDropdownOpen(false); }}
                      className={`text-[11px] tracking-[0.15em] uppercase whitespace-nowrap transition-all duration-200 ${
                        activeType === type ? 'text-foreground opacity-100' : 'text-muted-foreground opacity-50 hover:opacity-80 hover:text-foreground'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <>
                  <div className="w-px h-4 bg-border/60 mx-3 flex-shrink-0" />
                  <div className="flex items-center gap-4 flex-nowrap">
                    {['MEN', 'WOMEN', 'UNISEX'].map(g => {
                      const isActive = activeGenders.includes(g);
                      const isAvailable = isGenderAvailable(g);
                      return (
                        <button
                          key={g}
                          onMouseEnter={() => isAvailable && toggleGender(g)}
                          onClick={() => isAvailable && toggleGender(g)}
                          disabled={!isAvailable}
                          className={`text-[11px] tracking-[0.15em] uppercase whitespace-nowrap transition-all duration-200 ${
                            !isAvailable
                              ? 'text-muted-foreground opacity-20 cursor-not-allowed'
                              : isActive
                                ? 'text-foreground opacity-100'
                                : 'text-muted-foreground opacity-50 hover:opacity-80 hover:text-foreground'
                          }`}
                          title={!isAvailable ? `No ${g.toLowerCase()} items in this category` : undefined}
                          aria-pressed={isActive}
                          aria-disabled={!isAvailable}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View toggle — hidden when detail is open */}
        {!selectedProduct && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onMouseEnter={() => setViewMode(3)}
              onClick={() => setViewMode(3)}
              className="text-[11px] tracking-[0.15em] uppercase transition-all duration-200 px-2 py-1"
              style={{ opacity: viewMode === 3 ? 1 : 0.4 }}
            >
              View by 3
            </button>
            <button
              onMouseEnter={() => setViewMode(6)}
              onClick={() => setViewMode(6)}
              className="text-[11px] tracking-[0.15em] uppercase transition-all duration-200 px-2 py-1"
              style={{ opacity: viewMode === 6 ? 1 : 0.4 }}
            >
              View by 6
            </button>
          </div>
        )}
      </div>


      {/* Product grid OR detail view */}
      {selectedProduct ? (
        <MaisonProductDetail
          product={selectedProduct}
          products={filteredProducts}
          allProducts={allProducts}
          onClose={() => setSelectedProduct(null)}
          onNavigate={setSelectedProduct}
          onBuildSet={handleBuildSet}
        />
      ) : (
        <div className="px-0">
          <div
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${viewMode}, 1fr)`,
              borderLeft: '1px solid hsl(var(--border))',
              borderTop: '1px solid hsl(var(--border))',
            }}
          >
            <>
              {filteredProducts.map((product, i) => (
                <MaisonProductCard
                  key={product.id}
                  product={product}
                  viewMode={viewMode}
                  onClick={() => setSelectedProduct(product)}
                  onBuildSet={handleBuildSet}
                  index={i}
                />
              ))}
            </>
          </div>
        </div>
      )}
      {/* Cart drawer */}
      <CartDrawer />

      {/* Build a Set — Modal popup (portaled to body to escape CSS containment) */}
      {buildSetProduct && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center ${themeSettings.mode === 'light' ? 'light' : ''}`}
            onClick={closeBuildSet}
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative z-10 w-[92%] max-w-[1100px] h-[82vh] rounded-xl border border-border overflow-hidden shadow-2xl bg-background"
              onClick={(e) => e.stopPropagation()}
              style={{ contain: 'paint layout' }}
            >
              <StyleKitView />
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Cart drawer */}
      <CartDrawer />
    </div>
  );
}
