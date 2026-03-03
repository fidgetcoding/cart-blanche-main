import { useState, useEffect, useMemo, lazy, Suspense, useRef, useCallback } from 'react';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { supabase } from '@/integrations/supabase/client';
import { Save, Plus, X, GripVertical, Search } from 'lucide-react';
import { DEMO_PRODUCTS, getImageUrl } from '@/data/demo-data';
import { getBodyZone, type ProductPreset } from '@/lib/pairing-logic';
import type { DemoProduct } from '@/data/demo-data';
import type { StyleGuideCanvasHandle } from '@/components/admin/StyleGuideCanvas';

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
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-foreground/5 transition-colors text-left"
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

/** Ordered preset list with drag reorder + remove */
function PresetList({
  label,
  description,
  items,
  availableProducts,
  onAdd: handleAdd,
  onRemove,
  onReorder,
}: {
  label: string;
  description: string;
  items: DemoProduct[];
  availableProducts: DemoProduct[];
  onAdd: (p: DemoProduct) => void;
  onRemove: (id: string) => void;
  onReorder: (newItems: DemoProduct[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [dropHover, setDropHover] = useState(false);
  const filtered = availableProducts.filter(p => !items.some(i => i.id === p.id));

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  };

  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return; }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    onReorder(reordered);
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/product-id')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setDropHover(true);
        }
      }}
      onDragLeave={() => setDropHover(false)}
      onDrop={(e) => {
        const productId = e.dataTransfer.getData('application/product-id');
        if (productId && dragIdx === null) {
          e.preventDefault();
          const product = DEMO_PRODUCTS.find(p => p.id === productId);
          if (product && !items.some(i => i.id === productId)) {
            handleAdd(product);
          }
        }
        setDropHover(false);
      }}
      className={`rounded-lg transition-all duration-200 ${dropHover ? 'ring-2 ring-primary/40 bg-primary/5' : ''}`}
    >
      <p className="text-[10px] font-display tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>

      <div className="space-y-1">
        {items.map((product, idx) => (
          <div
            key={product.id}
            draggable
            onDragStart={handleDragStart(idx)}
            onDragOver={handleDragOver(idx)}
            onDrop={handleDrop(idx)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 bg-foreground/5 rounded-md px-2 py-1.5 cursor-grab active:cursor-grabbing transition-all duration-150 ${
              dragIdx === idx ? 'opacity-40 scale-95' : ''
            } ${overIdx === idx && dragIdx !== idx ? 'border-t-2 border-primary' : 'border-t-2 border-transparent'}`}
          >
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
          className="flex items-center gap-1 px-3 py-1.5 border border-foreground/10 rounded-md text-[10px] font-display tracking-wider hover:bg-foreground/5 transition-colors"
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
  const [blankNodeActive, setBlankNodeActive] = useState(false);
  const { markDirty, markClean, BlockerDialog } = useUnsavedChanges();

  // Track which product IDs are on the canvas
  const [canvasNodeIds, setCanvasNodeIds] = useState<Set<string>>(new Set());
  const canvasRef = useRef<StyleGuideCanvasHandle | null>(null);

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
    markClean();
  };

  const updatePreset = (anchorId: string, field: 'pairs' | 'extras', ids: string[]) => {
    markDirty();
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
      return;
    }

    // Canvas mode
    const product = DEMO_PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    // If blank node is active, fill it with this product
    if (blankNodeActive) {
      if (canvasNodeIds.has(productId)) {
        // Product already on canvas — connect pending to existing node and remove blank
        // The fillBlankNode handles this by just completing with the product
        canvasRef.current?.fillBlankNode(product);
      } else {
        canvasRef.current?.fillBlankNode(product);
      }
      setSelectedProductId(productId);
      return;
    }

    // Normal canvas click behavior
    if (canvasNodeIds.has(productId)) {
      canvasRef.current?.selectProduct(productId);
    } else {
      canvasRef.current?.addProduct(product);
    }
    setSelectedProductId(productId);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <span className="font-display text-muted-foreground tracking-widest animate-pulse text-sm">LOADING...</span>
      </div>
    );
  }

  return (
    <>
      <BlockerDialog />
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
            onClick={() => {
              setActiveView('canvas');
              // If a product is selected in list view, auto-add it to canvas after mount
              if (selectedProductId && activeView === 'list') {
                const product = DEMO_PRODUCTS.find(p => p.id === selectedProductId);
                if (product) {
                  // Delay to let canvas mount
                  setTimeout(() => {
                    if (!canvasNodeIds.has(selectedProductId)) {
                      canvasRef.current?.addProduct(product);
                    }
                  }, 100);
                }
              }
            }}
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
        <div className={`w-72 border-r border-foreground/5 overflow-y-auto flex-shrink-0 liquid-glass transition-shadow duration-500 ${activeView === 'canvas' && blankNodeActive ? 'shadow-[0_0_40px_8px_hsl(var(--primary)/0.25),inset_0_0_30px_-10px_hsl(var(--primary)/0.1)]' : ''}`}>
          {/* Blank node banner */}
          {activeView === 'canvas' && blankNodeActive && (
            <div className="px-4 py-2.5 border-b border-foreground/5 bg-primary/5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
              <p className="text-[10px] font-display tracking-wider text-primary">SELECT A PRODUCT FOR THE NEW NODE</p>
            </div>
          )}
          <div className="px-4 py-3 border-b border-foreground/5">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-foreground/5 border border-foreground/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 backdrop-blur-sm"
              />
            </div>
            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', 'TOPS', 'BOTTOMS', 'ACCESSORIES'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterGroup(cat)}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-display tracking-wider transition-all duration-200 ${
                    filterGroup === cat
                      ? 'bg-foreground/15 text-foreground border border-foreground/20 shadow-[0_0_8px_rgba(255,255,255,0.05)]'
                      : 'bg-foreground/5 text-muted-foreground border border-foreground/8 hover:bg-foreground/10 hover:text-foreground/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {(['TOPS', 'BOTTOMS', 'ACCESSORIES'] as BodyZoneGroup[]).map(group => (
            <div key={group}>
              <div className="px-4 py-2 bg-foreground/3 border-b border-foreground/5">
                <p className="text-[9px] font-display tracking-[0.2em] text-muted-foreground/60">{group}</p>
              </div>
              {grouped[group].map(product => {
                const isOnCanvas = activeView === 'canvas' && canvasNodeIds.has(product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product.id)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/product-id', product.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-200 ease-out border-b border-foreground/3 ${
                      activeView === 'canvas' ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${
                      selectedProductId === product.id
                        ? 'bg-foreground/8 border-l-2 border-l-primary/60 scale-[1.01]'
                        : blankNodeActive && activeView === 'canvas'
                          ? 'hover:bg-primary/10 border-l-2 border-l-transparent cursor-pointer'
                          : 'hover:bg-foreground/5 border-l-2 border-l-transparent'
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
                onPresetsChange={(p) => { setPresets(p); markDirty(); }}
                canvasLayout={canvasLayout}
                onCanvasLayoutChange={(l) => { setCanvasLayout(l); markDirty(); }}
                onSave={saveGuide}
                saving={saving}
                onCanvasNodeIdsChange={setCanvasNodeIds}
                onBlankNodeChange={setBlankNodeActive}
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
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={saveGuide}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display text-xs tracking-wider rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'SAVING...' : 'SAVE'}
                      </button>
                      <button
                        onClick={() => setSelectedProductId(null)}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
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
                      onReorder={(newItems) => updatePreset(selectedProductId!, 'pairs', newItems.map(p => p.id))}
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
                      onReorder={(newItems) => updatePreset(selectedProductId!, 'extras', newItems.map(p => p.id))}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
