import { useState, useEffect, useMemo, lazy, Suspense, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { supabase } from '@/integrations/supabase/client';
import { Save, Plus, X, GripVertical, Search, Pencil, Check } from 'lucide-react';
import { DEMO_PRODUCTS, getImageUrl } from '@/data/demo-data';
import { getBodyZone, type ProductPreset } from '@/lib/pairing-logic';
import { useGridLayout } from '@/hooks/use-grid-layout';
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

/** Normalize presets so every A→B also has B→A (idempotent) */
function normalizeBidirectional(presets: ProductPreset[]): ProductPreset[] {
  const map = new Map<string, { pairs: Set<string>; extras: Set<string> }>();
  presets.forEach(p => {
    if (!map.has(p.anchorProductId)) {
      map.set(p.anchorProductId, { pairs: new Set(p.pairs), extras: new Set(p.extras) });
    } else {
      const entry = map.get(p.anchorProductId)!;
      p.pairs.forEach(id => entry.pairs.add(id));
      p.extras.forEach(id => entry.extras.add(id));
    }
  });
  const snapshot = Array.from(map.entries());
  snapshot.forEach(([anchorId, { pairs, extras }]) => {
    pairs.forEach(targetId => {
      if (!map.has(targetId)) map.set(targetId, { pairs: new Set([anchorId]), extras: new Set() });
      else map.get(targetId)!.pairs.add(anchorId);
    });
    extras.forEach(targetId => {
      if (!map.has(targetId)) map.set(targetId, { pairs: new Set(), extras: new Set([anchorId]) });
      else map.get(targetId)!.extras.add(anchorId);
    });
  });
  return Array.from(map.entries()).map(([anchorProductId, { pairs, extras }]) => ({
    anchorProductId,
    pairs: Array.from(pairs),
    extras: Array.from(extras),
  }));
}


function PresetList({
  label,
  description,
  items,
  availableProducts,
  onAdd: handleAdd,
  onRemove,
  onReorder,
  anchorZone,
  listType,
}: {
  label: string;
  description: string;
  items: DemoProduct[];
  availableProducts: DemoProduct[];
  onAdd: (p: DemoProduct) => void;
  onRemove: (id: string) => void;
  onReorder: (newItems: DemoProduct[]) => void;
  anchorZone: 'top' | 'bottom' | 'accessory';
  listType: 'pairs' | 'extras';
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [dropHover, setDropHover] = useState(false);
  const [dropRejected, setDropRejected] = useState(false);
  const filtered = availableProducts.filter(p => !items.some(i => i.id === p.id));

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    if (dragIdx !== null) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      setOverIdx(idx);
    }
  };

  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    if (dragIdx === null) {
      setOverIdx(null);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (dragIdx === idx) { setDragIdx(null); setOverIdx(null); return; }
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
          const product = DEMO_PRODUCTS.find(p => p.id === productId);
          if (!product) { setDropHover(false); return; }

          const productZone = getBodyZone(product);
          // Accessories are always pairs, never extras
          const isValidMatch = listType === 'pairs'
            ? (productZone !== anchorZone || productZone === 'accessory' || anchorZone === 'accessory')
            : (productZone === anchorZone && productZone !== 'accessory' && anchorZone !== 'accessory');

          if (!isValidMatch) {
            e.preventDefault();
            e.stopPropagation();
            setDropRejected(true);
            setTimeout(() => setDropRejected(false), 2000);
            setDropHover(false);
            return;
          }

          e.preventDefault();
          e.stopPropagation();
          if (!items.some(i => i.id === productId)) {
            handleAdd(product);
          }
        }
        setDropHover(false);
      }}
      className={`rounded-lg transition-all duration-200 ${dropHover ? 'ring-2 ring-primary/40 bg-primary/5' : ''} ${dropRejected ? 'ring-2 ring-destructive/60 bg-destructive/10' : ''}`}
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

      {!pickerOpen ? (
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 border border-foreground/10 rounded-md text-[10px] font-display tracking-wider hover:bg-foreground/5 transition-colors"
        >
          <Plus className="w-3 h-3" />
          ADD MATCH
        </button>
      ) : (
        <div className="liquid-glass rounded-lg mt-1 max-h-60 overflow-y-auto border border-foreground/10">
          <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/5">
            <span className="text-[10px] font-display tracking-wider text-muted-foreground">SELECT A MATCH</span>
            <button onClick={() => setPickerOpen(false)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => { handleAdd(p); setPickerOpen(false); }}
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
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center font-display tracking-wider">NO PRODUCTS AVAILABLE</p>
          )}
        </div>
      )}
      {dropRejected && (
        <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-md bg-destructive/10 border border-destructive/20">
          <X className="w-3.5 h-3.5 text-destructive" />
          <span className="text-[10px] font-display tracking-wider text-destructive">
            {listType === 'pairs' ? 'PAIRS NEED OPPOSITE TYPES OR ACCESSORIES' : 'EXTRAS NEED SAME TYPE (NO ACCESSORIES)'}
          </span>
        </div>
      )}
    </div>
  );
}

export default function AdminStylingGuide() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guideId, setGuideId] = useState<string | null>(null);
  const [presets, setPresets] = useState<ProductPreset[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('ALL');
  const [activeView, setActiveView] = useState<'list' | 'canvas'>('list');
  const [matchTypeFilter, setMatchTypeFilter] = useState<'all' | 'pairs' | 'extras'>('all');
  const [canvasLayout, setCanvasLayout] = useState<any>(null);
  const [blankNodeActive, setBlankNodeActive] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [matchFilter, setMatchFilter] = useState<string>('ALL');
  const { getOrderedCategories } = useGridLayout();
  const storefrontCategories = useMemo(() => getOrderedCategories(), [getOrderedCategories]);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [listDragHover, setListDragHover] = useState(false);
  const { isDirty, markDirty, markClean, BlockerDialog } = useUnsavedChanges();

  const [canvasNodeIds, setCanvasNodeIds] = useState<Set<string>>(new Set());
  const canvasRef = useRef<StyleGuideCanvasHandle | null>(null);

  // Refs that always track latest committed state. saveGuide reads from these
  // instead of from closure so the auto-save timer (captured at scheduling
  // time) doesn't persist stale snapshots. For the synchronous setState→save
  // race in canvas's manual handleSave, an explicit override is passed.
  const presetsRef = useRef<ProductPreset[]>([]);
  const canvasLayoutRef = useRef<any>(null);
  useEffect(() => { presetsRef.current = presets; }, [presets]);
  useEffect(() => { canvasLayoutRef.current = canvasLayout; }, [canvasLayout]);

  const grouped = useMemo(() => {
    const groups: Record<string, DemoProduct[]> = {};
    const q = searchQuery.toLowerCase();
    DEMO_PRODUCTS.forEach(p => {
      if (q && !p.title.toLowerCase().includes(q)) return;
      const cat = p.category.toUpperCase();
      if (filterGroup !== 'ALL' && cat !== filterGroup) return;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [searchQuery, filterGroup]);

  const selectedProduct = DEMO_PRODUCTS.find(p => p.id === selectedProductId) ?? null;
  const currentPreset = presets.find(p => p.anchorProductId === selectedProductId);
  const configuredAnchorIds = useMemo(() => {
    return new Set(presets.filter(p => p.pairs.length > 0 || p.extras.length > 0).map(p => p.anchorProductId));
  }, [presets]);

  const involvedProductIds = useMemo(() => {
    const ids = new Set<string>();
    presets.forEach(p => {
      ids.add(p.anchorProductId);
      p.pairs.forEach(id => ids.add(id));
      p.extras.forEach(id => ids.add(id));
    });
    canvasNodeIds.forEach(id => ids.add(id));
    return ids;
  }, [presets, canvasNodeIds]);

  useEffect(() => { loadGuide(); }, []);

  const DEFAULT_CANVAS_RULES = {
    version: 2,
    presets: [
      { anchorProductId: 'p2', pairs: ['p25'], extras: [] },
      { anchorProductId: 'p25', pairs: ['p2', 'p12'], extras: [] },
      { anchorProductId: 'p12', pairs: ['p25'], extras: [] },
      { anchorProductId: 'p8', pairs: [], extras: ['p7'] },
      { anchorProductId: 'p7', pairs: [], extras: ['p8'] },
    ],
    canvasLayout: {
      nodeIds: ['p2', 'p25', 'p12', 'p7', 'p8'],
      positions: {
        p2: { x: -98.85, y: 224.81 },
        p25: { x: 100, y: 215 },
        p12: { x: 317.19, y: 201.16 },
        p7: { x: -36.76, y: 514.08 },
        p8: { x: 270.47, y: 524.32 },
      },
    },
  };

  const loadGuide = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('styling_guides')
      .select('*')
      .eq('merchant_id', user.id)
      .limit(1)
      .maybeSingle();

    const rules = data ? (data.rules as any) : DEFAULT_CANVAS_RULES;
    if (data) setGuideId(data.id);

    if (rules?.version === 2 && Array.isArray(rules.presets)) {
      setPresets(normalizeBidirectional(rules.presets));
      const layout = rules.canvasLayout || null;
      setCanvasLayout(layout);
      if (layout?.positions) {
        setCanvasNodeIds(new Set(Object.keys(layout.positions)));
      }
    }
    setLoading(false);
  };

  const saveGuide = async (
    silent = false,
    override?: { presets?: ProductPreset[]; canvasLayout?: any },
  ) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const finalPresets = override?.presets ?? presetsRef.current;
    const finalLayout = override?.canvasLayout ?? canvasLayoutRef.current;

    // MEDIUM-2: garbage-collect empty preset rows at save time.
    const cleanedPresets = finalPresets.filter(p => p.pairs.length > 0 || p.extras.length > 0);

    const rules = { version: 2, presets: cleanedPresets, canvasLayout: finalLayout };
    if (guideId) {
      await supabase.from('styling_guides').update({ rules: rules as unknown as any }).eq('id', guideId);
    } else {
      const { data } = await supabase.from('styling_guides').insert({ merchant_id: user.id, name: 'Default Guide', rules: rules as unknown as any }).select('id').single();
      if (data) setGuideId(data.id);
    }
    setSaving(false);
    markClean();
    if (!silent) {
      toast({ title: 'Saved', description: 'Your look book has been saved.' });
    }
  };

  const saveGuideSilent = useCallback(
    (override?: { presets?: ProductPreset[]; canvasLayout?: any }) => saveGuide(true, override),
    [guideId],
  );
  const saveGuideManual = useCallback(
    (override?: { presets?: ProductPreset[]; canvasLayout?: any }) => saveGuide(false, override),
    [guideId],
  );

  const updatePreset = (anchorId: string, field: 'pairs' | 'extras', ids: string[]) => {
    markDirty();
    setPresets(prev => {
      let updated = [...prev];
      
      // Update the anchor's preset
      const existing = updated.find(p => p.anchorProductId === anchorId);
      if (existing) {
        updated = updated.map(p => p.anchorProductId === anchorId ? { ...p, [field]: ids } : p);
      } else {
        updated.push({ anchorProductId: anchorId, pairs: field === 'pairs' ? ids : [], extras: field === 'extras' ? ids : [] });
      }
      
      // Detect additions and removals for bidirectional sync
      const oldIds = existing?.[field] ?? [];
      const addedIds = ids.filter(id => !oldIds.includes(id));
      const removedIds = oldIds.filter(id => !ids.includes(id));
      
      // For each ADDED target, create the reverse relationship
      addedIds.forEach(targetId => {
        const targetPreset = updated.find(p => p.anchorProductId === targetId);
        if (targetPreset) {
          if (!targetPreset[field].includes(anchorId)) {
            updated = updated.map(p => 
              p.anchorProductId === targetId 
                ? { ...p, [field]: [...p[field], anchorId] }
                : p
            );
          }
        } else {
          updated.push({
            anchorProductId: targetId,
            pairs: field === 'pairs' ? [anchorId] : [],
            extras: field === 'extras' ? [anchorId] : [],
          });
        }
      });
      
      // For each REMOVED target, remove the reverse relationship
      removedIds.forEach(targetId => {
        const targetPreset = updated.find(p => p.anchorProductId === targetId);
        if (targetPreset) {
          updated = updated.map(p =>
            p.anchorProductId === targetId
              ? { ...p, [field]: p[field].filter(id => id !== anchorId) }
              : p
          );
        }
      });
      
      return updated;
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

  const pairsProducts = (currentPreset?.pairs ?? []).map(id => DEMO_PRODUCTS.find(p => p.id === id)).filter(Boolean) as DemoProduct[];
  const extrasProducts = (currentPreset?.extras ?? []).map(id => DEMO_PRODUCTS.find(p => p.id === id)).filter(Boolean) as DemoProduct[];

  const anchorZone = selectedProduct ? getBodyZone(selectedProduct) : null;
  const pairsAvailable = DEMO_PRODUCTS.filter(p => {
    if (p.id === selectedProductId) return false;
    if (!anchorZone) return true;
    const z = getBodyZone(p);
    // Accessories are always pairs
    if (z === 'accessory' || anchorZone === 'accessory') return true;
    if (anchorZone === 'top') return z === 'bottom';
    if (anchorZone === 'bottom') return z === 'top';
    return true;
  });
  const extrasAvailable = DEMO_PRODUCTS.filter(p => {
    if (p.id === selectedProductId) return false;
    if (!anchorZone) return true;
    const z = getBodyZone(p);
    // Accessories excluded from extras
    if (z === 'accessory' || anchorZone === 'accessory') return false;
    return z === anchorZone;
  });

  const handleProductClick = (productId: string) => {
    if (activeView === 'list') {
      setSelectedProductId(productId);
      // If this product already has a preset, expand it; otherwise create an empty one and expand
      if (presets.some(p => p.anchorProductId === productId)) {
        setExpandedProductId(productId);
      } else {
        // Create empty preset so it appears in the grid
        setPresets(prev => {
          // Guard against duplicates
          if (prev.some(p => p.anchorProductId === productId)) return prev;
          return [...prev, { anchorProductId: productId, pairs: [], extras: [] }];
        });
        setExpandedProductId(productId);
        markDirty();
      }
      return;
    }
    const product = DEMO_PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    if (blankNodeActive) {
      canvasRef.current?.fillBlankNode(product);
      setSelectedProductId(productId);
      return;
    }
    if (canvasNodeIds.has(productId)) {
      canvasRef.current?.selectProduct(productId);
    } else {
      canvasRef.current?.addProduct(product);
    }
    setSelectedProductId(productId);
  };

  // Show all presets (including canvas-only nodes as empty presets)
  const allPresets = useMemo(() => {
    const presetsMap = new Map(presets.map(p => [p.anchorProductId, p]));
    canvasNodeIds.forEach(id => {
      if (!presetsMap.has(id)) {
        presetsMap.set(id, { anchorProductId: id, pairs: [], extras: [] });
      }
    });
    return Array.from(presetsMap.values());
  }, [presets, canvasNodeIds]);

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
        <h1 className="font-display text-2xl font-bold tracking-wide">Look Book</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-secondary rounded-lg p-1">
            <button
              onClick={() => { setActiveView('list'); setExpandedProductId(null); }}
              className={`px-5 py-2 rounded-md text-sm font-display tracking-wider transition-colors ${
                activeView === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              LIST
            </button>
            <button
              onClick={() => {
                setActiveView('canvas');
                if (selectedProductId && activeView === 'list') {
                  const product = DEMO_PRODUCTS.find(p => p.id === selectedProductId);
                  if (product) {
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
          <div className="flex items-center bg-secondary rounded-lg p-1">
            <button
              onClick={() => setMatchTypeFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-display tracking-wider transition-colors ${
                matchTypeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setMatchTypeFilter('pairs')}
              className={`px-4 py-2 rounded-md text-sm font-display tracking-wider transition-colors ${
                matchTypeFilter === 'pairs' ? 'bg-[#facc15] text-background' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              PAIRS
            </button>
            <button
              onClick={() => setMatchTypeFilter('extras')}
              className={`px-4 py-2 rounded-md text-sm font-display tracking-wider transition-colors ${
                matchTypeFilter === 'extras' ? 'bg-[#f472b6] text-background' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              EXTRAS
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-border" />

      <div className="flex-1 flex min-h-0">
        {/* LEFT: Product list sidebar */}
        <div className={`w-72 border-r border-foreground/5 overflow-y-auto flex-shrink-0 liquid-glass transition-shadow duration-500 ${activeView === 'canvas' && blankNodeActive ? 'shadow-[0_0_40px_8px_hsl(var(--primary)/0.25),inset_0_0_30px_-10px_hsl(var(--primary)/0.1)]' : ''}`}>
          {activeView === 'canvas' && blankNodeActive && (
            <div className="px-4 py-2.5 border-b border-foreground/5 bg-primary/5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
              <p className="text-[10px] font-display tracking-wider text-primary">SELECT A PRODUCT FOR THE NEW NODE</p>
            </div>
          )}
          <div className="px-4 py-3 border-b border-foreground/5">
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
            <div className="flex flex-wrap gap-1.5">
              {storefrontCategories.map(cat => (
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
          {storefrontCategories.filter(c => c !== 'ALL').map(group => (
            <div key={group}>
              <div className="px-4 py-2 bg-foreground/3 border-b border-foreground/5">
                <p className="text-[9px] font-display tracking-[0.2em] text-muted-foreground/60">{group}</p>
              </div>
              {(grouped[group] || []).map(product => {
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product.id)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/product-id', product.id);
                      e.dataTransfer.effectAllowed = 'copyMove';
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
                    {(() => {
                      const isConfigured = configuredAnchorIds.has(product.id);
                      const isInvolved = involvedProductIds.has(product.id);
                      if (isConfigured) return <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />;
                      if (isInvolved) return <div className="w-2 h-2 rounded-full bg-foreground/30 flex-shrink-0" />;
                      return null;
                    })()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* RIGHT: View-specific content */}
        <div
          className={`flex-1 min-h-0 transition-all duration-200 ${listDragHover ? 'ring-2 ring-inset ring-primary/30 bg-primary/5' : ''}`}
          onDragOver={(e) => {
            if (activeView === 'list' && e.dataTransfer.types.includes('application/product-id')) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setListDragHover(true);
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setListDragHover(false);
            }
          }}
          onDrop={(e) => {
            if (activeView === 'list') {
              const productId = e.dataTransfer.getData('application/product-id');
              if (productId) {
                e.preventDefault();
                handleProductClick(productId);
              }
            }
            setListDragHover(false);
          }}
        >
          {activeView === 'canvas' ? (
            <Suspense fallback={null}>
              <StyleGuideCanvas
                ref={canvasRef}
                presets={presets}
                onPresetsChange={(p) => { setPresets(normalizeBidirectional(p)); markDirty(); }}
                canvasLayout={canvasLayout}
                onCanvasLayoutChange={(l) => { setCanvasLayout(l); markDirty(); }}
                onSave={saveGuideSilent}
                onManualSave={() => saveGuide()}
                saving={saving}
                isDirty={isDirty}
                onCanvasNodeIdsChange={setCanvasNodeIds}
                onBlankNodeChange={setBlankNodeActive}
                matchTypeFilter={matchTypeFilter}
              />
            </Suspense>
          ) : (
            <div className="h-full overflow-y-auto p-6">
                <div className="space-y-4">
                  {allPresets.length === 0 ? (
                    <div className="h-full flex items-center justify-center min-h-[300px]">
                      <p className="text-sm text-muted-foreground font-display tracking-wider">Select a product to configure its Style Kit presets</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] font-display tracking-[0.2em] text-foreground/80">CONFIGURED MATCHES</p>
                          <div className="flex flex-wrap gap-1">
                            {storefrontCategories.map(cat => (
                              <button
                                key={cat}
                                onClick={() => setMatchFilter(cat)}
                                className={`px-2.5 py-1 rounded-full text-[9px] font-display tracking-wider transition-all duration-200 ${
                                  matchFilter === cat
                                    ? 'bg-foreground/15 text-foreground border border-foreground/20 shadow-[0_0_8px_rgba(255,255,255,0.05)]'
                                    : 'bg-foreground/5 text-muted-foreground border border-foreground/8 hover:bg-foreground/10 hover:text-foreground/80'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => saveGuide()}
                            disabled={saving || !isDirty}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-display tracking-wider transition-all disabled:opacity-50 ${
                              isDirty 
                                ? 'bg-foreground text-background hover:bg-foreground/90' 
                                : 'bg-foreground/10 text-muted-foreground border border-foreground/10'
                            }`}
                            title="Save"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? 'SAVING...' : 'SAVE'}
                          </button>
                          <button
                            onClick={() => { if (editMode) { setEditMode(false); } else { setEditMode(true); setExpandedProductId(null); } }}
                            className={`p-1.5 rounded-md transition-all ${editMode ? 'bg-green-500/20 text-green-400' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                            title={editMode ? 'Done editing' : 'Edit matches'}
                          >
                            {editMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-3" ref={listContainerRef}>
                        {allPresets.filter(preset => {
                          if (matchFilter === 'ALL') return true;
                          const p = DEMO_PRODUCTS.find(pr => pr.id === preset.anchorProductId);
                          return p ? p.category.toUpperCase() === matchFilter.toUpperCase() : false;
                        }).filter(preset => {
                          if (matchTypeFilter === 'all') return true;
                          if (matchTypeFilter === 'pairs') return preset.pairs.length > 0;
                          if (matchTypeFilter === 'extras') return preset.extras.length > 0;
                          return true;
                        }).map((preset, presetIndex) => {
                          const product = DEMO_PRODUCTS.find(p => p.id === preset.anchorProductId);
                          if (!product) return null;
                          const isExpanded = expandedProductId === preset.anchorProductId;
                          const presetPairs = preset.pairs.map(id => DEMO_PRODUCTS.find(p => p.id === id)).filter(Boolean) as DemoProduct[];
                          const presetExtras = preset.extras.map(id => DEMO_PRODUCTS.find(p => p.id === id)).filter(Boolean) as DemoProduct[];
                          const zone = getBodyZone(product);
                          const pAvail = DEMO_PRODUCTS.filter(p => { if (p.id === preset.anchorProductId) return false; const z = getBodyZone(p); if (z === 'accessory' || zone === 'accessory') return true; if (zone === 'top') return z === 'bottom'; if (zone === 'bottom') return z === 'top'; return true; });
                          const eAvail = DEMO_PRODUCTS.filter(p => { if (p.id === preset.anchorProductId) return false; const z = getBodyZone(p); if (z === 'accessory' || zone === 'accessory') return false; return z === zone; });

                          return (
                            <div
                              key={preset.anchorProductId}
                              className={`rounded-lg bg-foreground/5 border border-foreground/8 overflow-hidden transition-all ${dragIdx === presetIndex ? 'opacity-50 scale-95' : ''}`}
                            >
                              {/* Card header */}
                              <div
                                onPointerDown={(e) => {
                                  if (!editMode) return;
                                  e.preventDefault();
                                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                                  let currentIdx = presetIndex;
                                  setDragIdx(presetIndex);
                                  const container = listContainerRef.current;
                                  if (!container) return;

                                  const onMove = (ev: PointerEvent) => {
                                    const cards = Array.from(container.children) as HTMLElement[];
                                    const y = ev.clientY;
                                    for (let i = 0; i < cards.length; i++) {
                                      if (i === currentIdx) continue;
                                      const rect = cards[i].getBoundingClientRect();
                                      const mid = rect.top + rect.height / 2;
                                      const shouldSwap = (currentIdx < i && y > mid) || (currentIdx > i && y < mid);
                                      if (shouldSwap) {
                                        const from = currentIdx;
                                        const to = i;
                                        setPresets(prev => {
                                          const next = [...prev];
                                          const [moved] = next.splice(from, 1);
                                          next.splice(to, 0, moved);
                                          return next;
                                        });
                                        currentIdx = to;
                                        setDragIdx(to);
                                        markDirty();
                                        break;
                                      }
                                    }
                                  };

                                  const onUp = () => {
                                    setDragIdx(null);
                                    window.removeEventListener('pointermove', onMove);
                                    window.removeEventListener('pointerup', onUp);
                                  };

                                  window.addEventListener('pointermove', onMove);
                                  window.addEventListener('pointerup', onUp);
                                }}
                                onClick={() => {
                                  if (!editMode) {
                                    setExpandedProductId(isExpanded ? null : preset.anchorProductId);
                                    setSelectedProductId(preset.anchorProductId);
                                  }
                                }}
                                className={`w-full flex items-center gap-3 p-3 hover:bg-foreground/10 transition-all text-left group ${editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                              >
                                {editMode && <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
                                <img src={getImageUrl(product.images[0], 'thumb')} alt={product.title} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-display text-[11px] tracking-wide truncate group-hover:text-foreground transition-colors">{product.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {(matchTypeFilter === 'all' || matchTypeFilter === 'pairs') && preset.pairs.length > 0 && <span className="text-[8px] font-display tracking-wider text-[#facc15]">{preset.pairs.length} PAIR{preset.pairs.length !== 1 ? 'S' : ''}</span>}
                                    {(matchTypeFilter === 'all' || matchTypeFilter === 'extras') && preset.extras.length > 0 && <span className="text-[8px] font-display tracking-wider text-[#f472b6]">{preset.extras.length} EXTRA{preset.extras.length !== 1 ? 'S' : ''}</span>}
                                    {((matchTypeFilter === 'all' && preset.pairs.length === 0 && preset.extras.length === 0) || (matchTypeFilter === 'pairs' && preset.pairs.length === 0) || (matchTypeFilter === 'extras' && preset.extras.length === 0)) && <span className="text-[8px] font-display tracking-wider text-muted-foreground/50">NO MATCHES YET</span>}
                                  </div>
                                </div>
                                {!editMode && isExpanded && (
                                  <button onClick={(e) => { e.stopPropagation(); saveGuide(); }} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-display text-[10px] tracking-wider rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0">
                                    <Save className="w-3 h-3" />{saving ? 'SAVING...' : 'SAVE'}
                                  </button>
                                )}
                                {editMode ? (
                                  <button onClick={(e) => { e.stopPropagation(); const anchorId = preset.anchorProductId; setPresets(prev => { let updated = prev.filter(p => p.anchorProductId !== anchorId); updated = updated.map(p => ({ ...p, pairs: p.pairs.filter(id => id !== anchorId), extras: p.extras.filter(id => id !== anchorId) })); return updated; }); markDirty(); }} className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all flex-shrink-0" title="Delete match">
                                    <X className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <svg className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                )}
                              </div>

                              {/* Expanded dropdown content */}
                              {isExpanded && (
                                <div className="px-3 pb-3 space-y-3 border-t border-foreground/5">
                                  {(matchTypeFilter === 'all' || matchTypeFilter === 'pairs') && (
                                    <div className="liquid-glass rounded-lg p-3 mt-3">
                                      <PresetList label="PAIRS" description="When building pairs, suggest these first:" items={presetPairs} availableProducts={pAvail}
                                        anchorZone={zone} listType="pairs"
                                        onAdd={(p) => addToPreset('pairs', p)}
                                        onRemove={(id) => removeFromPreset('pairs', id)}
                                        onReorder={(newItems) => updatePreset(preset.anchorProductId, 'pairs', newItems.map(p => p.id))} />
                                    </div>
                                  )}
                                  {(matchTypeFilter === 'all' || matchTypeFilter === 'extras') && (
                                    <div className="liquid-glass rounded-lg p-3">
                                      <PresetList label="EXTRAS" description="When building extras, suggest these first:" items={presetExtras} availableProducts={eAvail}
                                        anchorZone={zone} listType="extras"
                                        onAdd={(p) => addToPreset('extras', p)}
                                        onRemove={(id) => removeFromPreset('extras', id)}
                                        onReorder={(newItems) => updatePreset(preset.anchorProductId, 'extras', newItems.map(p => p.id))} />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-foreground/50 font-display tracking-wider text-center pt-2">Select a product from the sidebar to create a new match</p>
                    </>
                  )}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
