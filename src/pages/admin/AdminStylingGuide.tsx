import { useState, useEffect, useMemo, lazy, Suspense, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Save, Plus, X, ChevronUp, ChevronDown, GripVertical, Search } from 'lucide-react';
import { DEMO_PRODUCTS, getImageUrl } from '@/data/demo-data';
import { getBodyZone, type ProductPreset } from '@/lib/pairing-logic';
import type { DemoProduct } from '@/data/demo-data';

const StyleGuideCanvas = lazy(() => import('@/components/admin/StyleGuideCanvas'));

type BodyZoneGroup = 'TOPS' | 'BOTTOMS' | 'ACCESSORIES';

function classifyGroup(product: DemoProduct): BodyZoneGroup {
  const zone = getBodyZone(product);
  if (zone === 'top') return 'TOPS';
  if (zone === 'bottom') return 'BOTTOMS';
  return 'ACCESSORIES';
}

/** Small inline product picker dropdown */
function ProductPicker({
  products,
  onSelect,
  onClose,
}: {
  products: DemoProduct[];
  onSelect: (p: DemoProduct) => void;
  onClose: () => void;
}) {
  return (
    <div className="liquid-glass rounded-lg mt-1 max-h-60 overflow-y-auto">
      {products.map(p => (
        <button
          key={p.id}
          onClick={() => { onSelect(p); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary transition-colors text-left"
        >
          <img
            src={getImageUrl(p.images[0], 'thumb')}
            alt={p.title}
            className="w-10 h-10 rounded object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-display text-xs tracking-wide truncate">{p.title}</p>
            <p className="text-[10px] text-muted-foreground">${p.price}</p>
          </div>
        </button>
      ))}
      {products.length === 0 && (
        <p className="px-3 py-4 text-xs text-muted-foreground text-center font-display tracking-wider">NO PRODUCTS AVAILABLE</p>
      )}
    </div>
  );
}

/** Ordered preset list with reorder + remove */
function PresetList({
  label,
  description,
  items,
  availableProducts,
  onAdd: handleAdd,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  label: string;
  description: string;
  items: DemoProduct[];
  availableProducts: DemoProduct[];
  onAdd: (p: DemoProduct) => void;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const filtered = availableProducts.filter(p => !items.some(i => i.id === p.id));

  return (
    <div>
      <p className="text-[10px] font-display tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>

      <div className="space-y-1">
        {items.map((product, idx) => (
          <div key={product.id} className="flex items-center gap-2 bg-secondary/50 rounded-md px-2 py-1.5">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
            <span className="text-[10px] font-display text-muted-foreground w-4">{idx + 1}.</span>
            <img
              src={getImageUrl(product.images[0], 'thumb')}
              alt={product.title}
              className="w-8 h-8 rounded object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-display text-xs tracking-wide truncate">{product.title}</p>
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">${product.price}</span>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => onMoveUp(idx)}
                disabled={idx === 0}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onMoveDown(idx)}
                disabled={idx === items.length - 1}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => onRemove(product.id)}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2">
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-md text-[10px] font-display tracking-wider hover:bg-secondary transition-colors"
        >
          <Plus className="w-3 h-3" />
          ADD PRODUCT
        </button>
        {pickerOpen && (
          <ProductPicker
            products={filtered}
            onSelect={handleAdd}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

export default function AdminStylingGuide() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guideId, setGuideId] = useState<string | null>(null);
  const [presets, setPresets] = useState<ProductPreset[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<'ALL' | BodyZoneGroup>('ALL');
  const [activeView, setActiveView] = useState<'list' | 'canvas'>('list');
  const [canvasLayout, setCanvasLayout] = useState<any>(null);

  // Track which product IDs are on the canvas
  const [canvasNodeIds, setCanvasNodeIds] = useState<Set<string>>(new Set());
  const canvasRef = useRef<{ addProduct: (p: DemoProduct) => void; selectProduct: (id: string) => void } | null>(null);

  // Group products by body zone, filtered by search and category
  const grouped = useMemo(() => {
    const groups: Record<BodyZoneGroup, DemoProduct[]> = { TOPS: [], BOTTOMS: [], ACCESSORIES: [] };
    const q = searchQuery.toLowerCase();
    DEMO_PRODUCTS.forEach(p => {
      if (q && !p.title.toLowerCase().includes(q)) return;
      const group = classifyGroup(p);
      if (filterGroup !== 'ALL' && group !== filterGroup) return;
      groups[group].push(p);
    });
    return groups;
  }, [searchQuery, filterGroup]);

  const selectedProduct = DEMO_PRODUCTS.find(p => p.id === selectedProductId) ?? null;
  const currentPreset = presets.find(p => p.anchorProductId === selectedProductId);

  // Products that have a preset defined
  const presetProductIds = new Set(presets.map(p => p.anchorProductId));

  useEffect(() => { loadGuide(); }, []);

  const loadGuide = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('styling_guides')
      .select('*')
      .eq('merchant_id', user.id)
      .limit(1)
      .maybeSingle();

    if (data) {
      setGuideId(data.id);
      const rules = data.rules as any;
      if (rules?.version === 2 && Array.isArray(rules.presets)) {
        setPresets(rules.presets);
        setCanvasLayout(rules.canvasLayout || null);
      }
    }
    setLoading(false);
  };

  const saveGuide = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const rules = { version: 2, presets, canvasLayout };

    if (guideId) {
      await supabase
        .from('styling_guides')
        .update({ rules: rules as unknown as any })
        .eq('id', guideId);
    } else {
      const { data } = await supabase
        .from('styling_guides')
        .insert({ merchant_id: user.id, name: 'Default Guide', rules: rules as unknown as any })
        .select('id')
        .single();
      if (data) setGuideId(data.id);
    }
    setSaving(false);
  };

  const updatePreset = (anchorId: string, field: 'pairs' | 'extras', ids: string[]) => {
    setPresets(prev => {
      const existing = prev.find(p => p.anchorProductId === anchorId);
      if (existing) {
        return prev.map(p => p.anchorProductId === anchorId ? { ...p, [field]: ids } : p);
      }
      return [...prev, { anchorProductId: anchorId, pairs: field === 'pairs' ? ids : [], extras: field === 'extras' ? ids : [] }];
    });
  };

  const addToPreset = (field: 'pairs' | 'extras', product: DemoProduct) => {
    if (!selectedProductId) return;
    const current = currentPreset?.[field] ?? [];
    updatePreset(selectedProductId, field, [...current, product.id]);
  };

  const removeFromPreset = (field: 'pairs' | 'extras', productId: string) => {
    if (!selectedProductId) return;
    const current = currentPreset?.[field] ?? [];
    updatePreset(selectedProductId, field, current.filter(id => id !== productId));
  };

  const moveInPreset = (field: 'pairs' | 'extras', index: number, direction: -1 | 1) => {
    if (!selectedProductId) return;
    const current = [...(currentPreset?.[field] ?? [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= current.length) return;
    [current[index], current[newIndex]] = [current[newIndex], current[index]];
    updatePreset(selectedProductId, field, current);
  };

  // Resolve product IDs to DemoProduct objects
  const pairsProducts = (currentPreset?.pairs ?? [])
    .map(id => DEMO_PRODUCTS.find(p => p.id === id))
    .filter(Boolean) as DemoProduct[];

  const extrasProducts = (currentPreset?.extras ?? [])
    .map(id => DEMO_PRODUCTS.find(p => p.id === id))
    .filter(Boolean) as DemoProduct[];

  // Filter available products for pickers
  const anchorZone = selectedProduct ? getBodyZone(selectedProduct) : null;
  const pairsAvailable = DEMO_PRODUCTS.filter(p => {
    if (p.id === selectedProductId) return false;
    if (!anchorZone) return true;
    if (anchorZone === 'top') return getBodyZone(p) === 'bottom';
    if (anchorZone === 'bottom') return getBodyZone(p) === 'top';
    return true;
  });

  const extrasAvailable = DEMO_PRODUCTS.filter(p => {
    if (p.id === selectedProductId) return false;
    if (!anchorZone) return true;
    return getBodyZone(p) === anchorZone;
  });

  const handleProductClick = (productId: string) => {
    if (activeView === 'list') {
      setSelectedProductId(productId);
    } else {
      // Canvas mode
      const product = DEMO_PRODUCTS.find(p => p.id === productId);
      if (!product) return;
      if (canvasNodeIds.has(productId)) {
        // Already on canvas — select and pan to it
        canvasRef.current?.selectProduct(productId);
      } else {
        // Not on canvas — add it
        canvasRef.current?.addProduct(product);
      }
      setSelectedProductId(productId);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <span className="font-display text-muted-foreground tracking-widest animate-pulse text-sm">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-t border-border">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
        <h1 className="font-display text-2xl font-bold tracking-wide">Style Guide</h1>
        <div className="flex items-center bg-secondary rounded-lg p-1">
          <button
            onClick={() => setActiveView('list')}
            className={`px-5 py-2 rounded-md text-sm font-display tracking-wider transition-colors ${
              activeView === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            LIST
          </button>
          <button
            onClick={() => setActiveView('canvas')}
            className={`px-5 py-2 rounded-md text-sm font-display tracking-wider transition-colors ${
              activeView === 'canvas' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            CANVAS
          </button>
        </div>
      </div>

      <div className="border-b border-border" />

      {/* Two-column layout — LEFT sidebar always visible */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT: Product list — shared between both views */}
        <div className="w-72 border-r border-border overflow-y-auto flex-shrink-0">
          <div className="px-4 py-3 border-b border-border">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-secondary/50 border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', 'TOPS', 'BOTTOMS', 'ACCESSORIES'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterGroup(cat)}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-display tracking-wider transition-colors ${
                    filterGroup === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/50 text-muted-foreground border border-border hover:bg-secondary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {(['TOPS', 'BOTTOMS', 'ACCESSORIES'] as BodyZoneGroup[]).map(group => (
            <div key={group}>
              <div className="px-4 py-2 bg-secondary/30">
                <p className="text-[9px] font-display tracking-[0.2em] text-muted-foreground">{group}</p>
              </div>
              {grouped[group].map(product => {
                const isOnCanvas = activeView === 'canvas' && canvasNodeIds.has(product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-200 ease-out ${
                      selectedProductId === product.id
                        ? 'bg-primary/10 border-l-2 border-primary scale-[1.01]'
                        : 'hover:bg-secondary/60 border-l-2 border-transparent'
                    }`}
                  >
                    <img
                      src={getImageUrl(product.images[0], 'thumb')}
                      alt={product.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-xs tracking-wide truncate">{product.title}</p>
                      <p className="text-[10px] text-muted-foreground">${product.price}</p>
                    </div>
                    {/* In list mode: green dot for products with presets */}
                    {activeView === 'list' && presetProductIds.has(product.id) && (
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'hsl(var(--success))' }} />
                    )}
                    {/* In canvas mode: dot for products on the canvas */}
                    {isOnCanvas && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* RIGHT: View-specific content */}
        <div className="flex-1 min-h-0">
          {activeView === 'canvas' ? (
            <Suspense fallback={null}>
              <StyleGuideCanvas
                ref={canvasRef}
                presets={presets}
                onPresetsChange={setPresets}
                canvasLayout={canvasLayout}
                onCanvasLayoutChange={setCanvasLayout}
                onSave={saveGuide}
                saving={saving}
                onCanvasNodeIdsChange={setCanvasNodeIds}
              />
            </Suspense>
          ) : (
            <>
              {!selectedProduct ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground font-display tracking-wider">
                    Select a product to configure its Style Kit presets
                  </p>
                </div>
              ) : (
                <div className="p-6 max-w-2xl space-y-6 overflow-y-auto h-full">
                  {/* Anchor product header */}
                  <div className="flex items-start gap-4">
                    <img
                      src={getImageUrl(selectedProduct.images[0], 'thumb')}
                      alt={selectedProduct.title}
                      className="w-28 h-28 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h2 className="font-display text-base font-bold tracking-wide">{selectedProduct.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1">${selectedProduct.price}</p>
                      <span className="inline-block mt-2 px-2 py-0.5 text-[9px] font-display tracking-widest bg-secondary rounded text-muted-foreground">
                        {classifyGroup(selectedProduct)}
                      </span>
                    </div>
                    <button
                      onClick={saveGuide}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display text-xs tracking-wider rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'SAVING...' : 'SAVE'}
                    </button>
                  </div>

                  {/* PAIRS section */}
                  <div className="liquid-glass rounded-lg p-4">
                    <PresetList
                      label="PAIRS"
                      description="When building pairs, suggest these first:"
                      items={pairsProducts}
                      availableProducts={pairsAvailable}
                      onAdd={(p) => addToPreset('pairs', p)}
                      onRemove={(id) => removeFromPreset('pairs', id)}
                      onMoveUp={(i) => moveInPreset('pairs', i, -1)}
                      onMoveDown={(i) => moveInPreset('pairs', i, 1)}
                    />
                  </div>

                  {/* EXTRAS section */}
                  <div className="liquid-glass rounded-lg p-4">
                    <PresetList
                      label="EXTRAS"
                      description="When building extras, suggest these first:"
                      items={extrasProducts}
                      availableProducts={extrasAvailable}
                      onAdd={(p) => addToPreset('extras', p)}
                      onRemove={(id) => removeFromPreset('extras', id)}
                      onMoveUp={(i) => moveInPreset('extras', i, -1)}
                      onMoveDown={(i) => moveInPreset('extras', i, 1)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
