import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { getImageUrl, type DemoProduct } from '@/data/demo-data';
import { GripVertical, Save, RotateCcw, Plus, Loader2, Pencil, Check, Eye, EyeOff, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGridLayout } from '@/hooks/use-grid-layout';

const TILE_W = 220;
const TILE_H = 300;
const GAP = 6;
const COLS = 5;
const ITEMS_PER_PAGE = 20;
const CANVAS_W = COLS * (TILE_W + GAP) - GAP;

interface GridProduct {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number;
  category: string;
  images: string[];
}

function toGridProducts(products: DemoProduct[]): GridProduct[] {
  return products.map(p => ({
    id: p.id,
    title: p.title,
    price: p.price,
    compare_at_price: p.compare_at_price,
    category: p.category,
    images: p.images.map(img => typeof img === 'string' ? img : getImageUrl(img, 'thumb')),
  }));
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  outerwear: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/40' },
  streetwear: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/40' },
  essentials: { bg: 'bg-zinc-400/10', text: 'text-zinc-400', border: 'border-zinc-400/40' },
  'new-arrivals': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/40' },
};

const EXTRA_TAG_COLORS = [
  { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/40' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/40' },
  { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/40' },
  { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/40' },
  { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/40' },
];

function getCatColor(cat: string) {
  const c = CATEGORY_COLORS[cat];
  if (c) return `${c.border} ${c.bg} ${c.text}`;
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  const extra = EXTRA_TAG_COLORS[Math.abs(hash) % EXTRA_TAG_COLORS.length];
  return `${extra.border} ${extra.bg} ${extra.text}`;
}

function getGridPos(index: number) {
  return {
    x: (index % COLS) * (TILE_W + GAP),
    y: Math.floor(index / COLS) * (TILE_H + GAP),
  };
}

export default function AdminPageEditor() {
  const { loading, layout: gridLayout, saveLayout: saveToSupabase, saveHiddenTags, resetLayout, getOrderedProducts, getOrderedCategories, getAllProductsUnfiltered } = useGridLayout();
  const [tagEditMode, setTagEditMode] = useState(false);
  const [hiddenTags, setHiddenTags] = useState<string[]>([]);
  const [products, setProducts] = useState<GridProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [editorPage, setEditorPage] = useState(0);
  const editorTotalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));

  // Initialize from Supabase layout once loaded
  useEffect(() => {
    if (!loading && !initialized) {
      const ordered = getOrderedProducts();
      setProducts(toGridProducts(ordered));
      const cats = getOrderedCategories();
      setCategories(cats.map(c => c.toLowerCase()));
      setInitialized(true);
    }
  }, [loading, initialized, getOrderedProducts, getOrderedCategories]);

  // Sync hiddenTags from gridLayout
  useEffect(() => {
    if (gridLayout?.hiddenTags) {
      setHiddenTags(gridLayout.hiddenTags);
    }
  }, [gridLayout]);

  const toggleTagVisibility = async (tag: string) => {
    const newHidden = hiddenTags.includes(tag)
      ? hiddenTags.filter(t => t !== tag)
      : [...hiddenTags, tag];
    setHiddenTags(newHidden);
    await saveHiddenTags(newHidden);
  };

  const deleteCategory = async (cat: string) => {
    if (!confirm(`Remove "${cat}" tab? Products won't be deleted.`)) return;
    const newCats = categories.filter(c => c !== cat);
    setCategories(newCats);
    if (hiddenTags.includes(cat)) {
      const newHidden = hiddenTags.filter(t => t !== cat);
      setHiddenTags(newHidden);
      await saveHiddenTags(newHidden);
    }
    setHasChanges(true);
  };

  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const { markDirty: markGridDirty, markClean: markGridClean, BlockerDialog: GridBlockerDialog } = useUnsavedChanges();

  useEffect(() => { if (hasChanges) markGridDirty(); else markGridClean(); }, [hasChanges, markGridDirty, markGridClean]);
  const [addingTab, setAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');

  // --- Product drag (pointer-based, live reorder) ---
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [liveOrder, setLiveOrder] = useState<GridProduct[]>(products);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDragging = dragIdx !== null;

  useEffect(() => {
    if (!isDragging) setLiveOrder(products);
  }, [products, isDragging]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);

  const pageProductCount = Math.min(ITEMS_PER_PAGE, Math.max(0, products.length - editorPage * ITEMS_PER_PAGE));
  const rows = Math.max(1, Math.ceil(pageProductCount / COLS));
  const canvasH = rows * (TILE_H + GAP) - GAP;

  // Fit the canvas to the editor's own box, which the chat panel beside it resizes as
  // well as the window. The box only exists once the layout has loaded, and it's measured
  // before that first paint so the canvas never shows at the placeholder scale and jumps.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function resize() {
      const rect = container!.getBoundingClientRect();
      const sx = (rect.width - 180) / CANVAS_W;
      const sy = (rect.height - 180) / canvasH;
      setScale(Math.min(sx, sy, 1));
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [canvasH, initialized]);

  const pointToSlot = useCallback((clientX: number, clientY: number): number | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    const col = Math.round(x / (TILE_W + GAP));
    const row = Math.round(y / (TILE_H + GAP));
    const pageLocalIdx = row * COLS + col;
    if (pageLocalIdx < 0 || pageLocalIdx >= ITEMS_PER_PAGE) return null;
    const globalIdx = editorPage * ITEMS_PER_PAGE + pageLocalIdx;
    if (globalIdx < 0 || globalIdx >= liveOrder.length) return null;
    return globalIdx;
  }, [scale, liveOrder.length, editorPage]);

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pageLocalIdx = idx - editorPage * ITEMS_PER_PAGE;
    const pos = getGridPos(pageLocalIdx);
    setDragIdx(idx);
    setDragPos({ x: pos.x, y: pos.y });
    setDragOffset({
      x: e.clientX / scale - pos.x,
      y: e.clientY / scale - pos.y,
    });
  }, [scale, editorPage]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragIdx === null) return;
    e.preventDefault();

    const newX = e.clientX / scale - dragOffset.x;
    const newY = e.clientY / scale - dragOffset.y;
    setDragPos({ x: newX, y: newY });

    const hoverSlot = pointToSlot(e.clientX, e.clientY);
    if (hoverSlot !== null && hoverSlot !== dragIdx) {
      setLiveOrder(prev => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(hoverSlot, 0, moved);
        return next;
      });
      setDragIdx(hoverSlot);
    }
  }, [dragIdx, dragOffset, scale, pointToSlot]);

  const handlePointerUp = useCallback(() => {
    if (dragIdx === null) return;
    setProducts(liveOrder);
    setDragIdx(null);
    setHasChanges(true);
  }, [dragIdx, liveOrder]);

  const moveProductToPage = useCallback((fromIdx: number, direction: 'prev' | 'next') => {
    const targetPage = direction === 'next' ? editorPage + 1 : editorPage - 1;
    if (targetPage < 0 || targetPage >= editorTotalPages) return;
    const targetIdx = direction === 'next'
      ? Math.min((targetPage + 1) * ITEMS_PER_PAGE - 1, products.length - 1)
      : targetPage * ITEMS_PER_PAGE;
    if (targetIdx === fromIdx) return;
    setProducts(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(targetIdx > fromIdx ? targetIdx - 1 : targetIdx, 0, moved);
      return next;
    });
    setHasChanges(true);
  }, [editorPage, editorTotalPages, products.length]);

  // --- Category drag ---
  const [catDragIdx, setCatDragIdx] = useState<number | null>(null);
  const [liveCats, setLiveCats] = useState<string[]>(categories);
  const catRibbonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (catDragIdx === null) setLiveCats(categories);
  }, [categories, catDragIdx]);

  const handleCatPointerDown = (e: React.PointerEvent, idx: number) => {
    if (idx === 0) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setCatDragIdx(idx);
  };

  const handleCatPointerMove = useCallback((e: React.PointerEvent) => {
    if (catDragIdx === null || !catRibbonRef.current) return;
    e.preventDefault();

    const children = Array.from(catRibbonRef.current.children) as HTMLElement[];
    for (let i = 1; i < liveCats.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && i !== catDragIdx) {
        setLiveCats(prev => {
          const next = [...prev];
          const [moved] = next.splice(catDragIdx, 1);
          next.splice(i, 0, moved);
          return next;
        });
        setCatDragIdx(i);
        break;
      }
    }
  }, [catDragIdx, liveCats.length]);

  const handleCatPointerUp = useCallback(() => {
    if (catDragIdx === null) return;
    setCategories(liveCats);
    setCatDragIdx(null);
    setHasChanges(true);
  }, [catDragIdx, liveCats]);

  const handleSave = async () => {
    setSaving(true);
    const productOrder = products.map(p => p.id);
    const categoryOrder = categories;
    const success = await saveToSupabase(productOrder, categoryOrder);
    setSaving(false);
    if (success) {
      setHasChanges(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    const success = await resetLayout();
    setSaving(false);
    if (success) {
      // The store's own products, in their default order now the layout is gone.
      const storeProducts = getAllProductsUnfiltered();
      setProducts(toGridProducts(storeProducts));
      const cats = new Set(storeProducts.map(p => p.category));
      setCategories(['all', ...Array.from(cats)]);
      setHasChanges(false);
    }
  };

  if (loading || !initialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
    <GridBlockerDialog />
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
        <h1 className="font-display text-2xl font-bold">Grid Editor</h1>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs font-display text-success tracking-wider animate-fade-up">SAVED</span>
          )}
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-display tracking-wider border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} RESET
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-display tracking-wider rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} SAVE LAYOUT
          </button>
        </div>
      </div>

      {/* Category ribbon */}
      <div className="px-6 pb-4 flex-shrink-0">
        <label className="text-[10px] font-display tracking-widest text-muted-foreground mb-2 block">
          NAVIGATION TAGS — drag to reorder
        </label>
        <div
          ref={catRibbonRef}
          className="flex items-center gap-2 flex-wrap"
          onPointerMove={handleCatPointerMove}
          onPointerUp={handleCatPointerUp}
        >
          {liveCats.map((cat, idx) => (
            <div key={cat} className="flex items-center gap-1">
              <div
                onPointerDown={e => handleCatPointerDown(e, idx)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-display tracking-wider
                  transition-all duration-200 select-none touch-none
                  ${idx === 0 ? 'border-foreground/20 bg-foreground/10 text-foreground opacity-60 cursor-default' : `cursor-grab active:cursor-grabbing ${getCatColor(cat)}`}
                  ${catDragIdx === idx ? 'opacity-50 scale-110 shadow-lg ring-2 ring-primary z-20' : ''}
                  ${hiddenTags.includes(cat) && idx !== 0 ? 'line-through decoration-1' : ''}
                `}
              >
                {idx !== 0 && <GripVertical className="w-3 h-3 opacity-40" />}
                {cat.toUpperCase().replace('-', ' ')}
              </div>
              {tagEditMode && idx !== 0 && (
                <>
                  <button
                    onClick={() => toggleTagVisibility(cat)}
                    className={`w-5 h-5 inline-flex items-center justify-center rounded border transition-colors ${
                      hiddenTags.includes(cat)
                        ? 'border-warning/40 bg-warning/15 text-warning hover:bg-warning/30'
                        : 'border-success/40 bg-success/15 text-success hover:bg-success/30'
                    }`}
                    title={hiddenTags.includes(cat) ? `Show "${cat}" on storefront` : `Hide "${cat}" from storefront`}
                  >
                    {hiddenTags.includes(cat) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="w-5 h-5 inline-flex items-center justify-center rounded border border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    title={`Delete tab "${cat}"`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          ))}
          {addingTab ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newTabName}
                onChange={e => setNewTabName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newTabName.trim()) {
                    const name = newTabName.trim().toLowerCase().replace(/\s+/g, '-');
                    if (!categories.includes(name)) {
                      setCategories(prev => [...prev, name]);
                      setHasChanges(true);
                    }
                    setNewTabName('');
                    setAddingTab(false);
                  } else if (e.key === 'Escape') {
                    setNewTabName('');
                    setAddingTab(false);
                  }
                }}
                onBlur={() => { setNewTabName(''); setAddingTab(false); }}
                placeholder="tab name"
                className="px-2 py-1 text-[11px] font-display tracking-wider bg-background/40 border border-border/50 rounded-lg w-24 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ) : (
            <button
              onClick={() => setAddingTab(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-border/50 text-[11px] font-display tracking-wider text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Plus className="w-3 h-3" /> ADD
            </button>
          )}
          <button
            onClick={() => setTagEditMode(prev => !prev)}
            className={`ml-1 px-2.5 py-1.5 text-xs font-display tracking-wider rounded-lg border transition-colors ${
              tagEditMode ? 'bg-success/15 text-success border-success/30' : 'bg-card text-muted-foreground border-border hover:bg-secondary'
            }`}
            title={tagEditMode ? 'Done editing tags' : 'Edit tags'}
          >
            {tagEditMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Grid canvas */}
      <div className="flex-1 overflow-auto px-6 py-6" ref={containerRef}>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[10px] font-display tracking-widest text-muted-foreground">
            PRODUCT GRID — drag tiles to reorder
          </label>
          {editorTotalPages > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: editorTotalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setEditorPage(i)}
                  className={`px-2.5 py-1 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                    editorPage === i
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  PAGE {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex items-center">
          {/* Left page arrow. Pages turn on click only, one per click: hovering never turns them. */}
          {editorTotalPages > 1 && (
            <button
              type="button"
              aria-label="Previous page"
              className="flex-shrink-0 w-12 flex items-center justify-center cursor-pointer group"
              onClick={() => setEditorPage(prev => prev <= 0 ? editorTotalPages - 1 : prev - 1)}
            >
              <ChevronLeft className="w-8 h-8 text-muted-foreground/20 group-hover:text-muted-foreground/60 transition-colors" />
            </button>
          )}

          <div
            className="relative mx-auto"
            style={{
              width: CANVAS_W * scale,
              height: canvasH * scale,
            }}
          >
            <div
              ref={canvasRef}
              className="absolute top-0 left-0 origin-top-left"
              style={{
                width: CANVAS_W,
                height: canvasH,
                transform: `scale(${scale})`,
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {liveOrder.map((p, idx) => {
                const pageStart = editorPage * ITEMS_PER_PAGE;
                const pageEnd = pageStart + ITEMS_PER_PAGE;
                if (idx < pageStart || idx >= pageEnd) return null;

                const pageLocalIdx = idx - pageStart;
                const pos = getGridPos(pageLocalIdx);
                const isBeingDragged = dragIdx === idx;

                return (
                  <div
                    key={p.id}
                    onPointerDown={e => handlePointerDown(e, idx)}
                    className={`
                      absolute rounded-xl border select-none touch-none
                      ${isBeingDragged
                        ? 'z-50 cursor-grabbing scale-105 shadow-2xl ring-2 ring-primary/50'
                        : 'z-10 cursor-grab transition-all duration-300 ease-out'
                      }
                    `}
                    style={{
                      left: isBeingDragged ? dragPos.x : pos.x,
                      top: isBeingDragged ? dragPos.y : pos.y,
                      width: TILE_W,
                      height: TILE_H,
                      ...(isBeingDragged ? {} : { transition: 'left 300ms ease-out, top 300ms ease-out' }),
                    }}
                  >
                    <div className={`liquid-glass rounded-xl w-full h-full flex flex-col p-3 overflow-hidden group ${isBeingDragged ? 'opacity-90' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                          {editorTotalPages > 1 && (
                            <div className="flex items-center gap-0.5">
                              {editorPage > 0 && (
                                <button
                                  onPointerDown={e => e.stopPropagation()}
                                  onClick={(e) => { e.stopPropagation(); moveProductToPage(idx, 'prev'); }}
                                  className="p-0.5 rounded hover:bg-primary/20 transition-colors"
                                  title={`Move to page ${editorPage}`}
                                >
                                  <ChevronLeft className="w-3 h-3 text-muted-foreground/40 hover:text-primary" />
                                </button>
                              )}
                              <span className="text-[7px] font-display tracking-wider text-muted-foreground/40 tabular-nums">
                                P{Math.floor(idx / ITEMS_PER_PAGE) + 1}
                              </span>
                              {editorPage < editorTotalPages - 1 && (
                                <button
                                  onPointerDown={e => e.stopPropagation()}
                                  onClick={(e) => { e.stopPropagation(); moveProductToPage(idx, 'next'); }}
                                  className="p-0.5 rounded hover:bg-primary/20 transition-colors"
                                  title={`Move to page ${editorPage + 2}`}
                                >
                                  <ChevronRight className="w-3 h-3 text-muted-foreground/40 hover:text-primary" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <span className={`text-[8px] font-display px-1.5 py-0.5 rounded border ${getCatColor(p.category)}`}>
                          {p.category.toUpperCase().replace('-', ' ')}
                        </span>
                      </div>

                      <div className="flex-1 bg-muted/20 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                        {p.images.length > 0 ? (
                          <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover rounded-lg pointer-events-none" />
                        ) : (
                          <div className="text-[10px] font-display text-muted-foreground/30 tracking-wider">
                            {idx + 1}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-[11px] font-display font-medium truncate leading-tight">{p.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-display text-foreground/70">${p.price}</span>
                          {p.compare_at_price && (
                            <span className="text-[8px] text-muted-foreground line-through">${p.compare_at_price}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right page arrow */}
          {editorTotalPages > 1 && (
            <button
              type="button"
              aria-label="Next page"
              className="flex-shrink-0 w-12 flex items-center justify-center cursor-pointer group"
              onClick={() => setEditorPage(prev => prev >= editorTotalPages - 1 ? 0 : prev + 1)}
            >
              <ChevronRight className="w-8 h-8 text-muted-foreground/20 group-hover:text-muted-foreground/60 transition-colors" />
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
