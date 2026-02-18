import { useState, useRef, useEffect, useCallback } from 'react';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { GripVertical, Save, RotateCcw, Plus } from 'lucide-react';

const TILE_W = 220;
const TILE_H = 300;
const GAP = 6;
const COLS = 6;
const CANVAS_W = COLS * (TILE_W + GAP) - GAP;

interface GridProduct {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number;
  category: string;
  images: string[];
}

function buildGridProducts(): GridProduct[] {
  return DEMO_PRODUCTS.map(p => ({
    id: p.id,
    title: p.title,
    price: p.price,
    compare_at_price: p.compare_at_price,
    category: p.category,
    images: p.images,
  }));
}

const CATEGORY_COLORS: Record<string, string> = {
  outerwear: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  streetwear: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  essentials: 'border-zinc-400/40 bg-zinc-400/10 text-zinc-400',
  'new-arrivals': 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
};

function getCatColor(cat: string) {
  return CATEGORY_COLORS[cat] || 'border-border bg-secondary text-muted-foreground';
}

function getGridPos(index: number) {
  return {
    x: (index % COLS) * (TILE_W + GAP),
    y: Math.floor(index / COLS) * (TILE_H + GAP),
  };
}

export default function AdminPageEditor() {
  const [products, setProducts] = useState<GridProduct[]>(buildGridProducts);
  const [categories, setCategories] = useState<string[]>(() => {
    const cats = new Set(DEMO_PRODUCTS.map(p => p.category));
    return ['all', ...Array.from(cats)];
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingTab, setAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');

  // --- Product drag (pointer-based, live reorder) ---
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [liveOrder, setLiveOrder] = useState<GridProduct[]>(products);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDragging = dragIdx !== null;

  // Keep liveOrder synced when not dragging
  useEffect(() => {
    if (!isDragging) setLiveOrder(products);
  }, [products, isDragging]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);

  const rows = Math.ceil(products.length / COLS);
  const canvasH = rows * (TILE_H + GAP) - GAP;

  useEffect(() => {
    function resize() {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const sx = (rect.width - 48) / CANVAS_W;
      const sy = (rect.height - 48) / canvasH;
      setScale(Math.min(sx, sy, 1));
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [canvasH]);

  // Determine which grid slot a point falls into
  const pointToSlot = useCallback((clientX: number, clientY: number): number | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    const col = Math.round(x / (TILE_W + GAP));
    const row = Math.round(y / (TILE_H + GAP));
    const idx = row * COLS + col;
    if (idx < 0 || idx >= liveOrder.length) return null;
    return idx;
  }, [scale, liveOrder.length]);

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pos = getGridPos(idx);
    setDragIdx(idx);
    setDragPos({ x: pos.x, y: pos.y });
    setDragOffset({
      x: e.clientX / scale - pos.x,
      y: e.clientY / scale - pos.y,
    });
  }, [scale]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragIdx === null) return;
    e.preventDefault();

    const newX = e.clientX / scale - dragOffset.x;
    const newY = e.clientY / scale - dragOffset.y;
    setDragPos({ x: newX, y: newY });

    // Determine hovered slot and live-reorder
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

  // --- Category drag (same pointer approach) ---
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

    // Find which tab we're over
    const children = Array.from(catRibbonRef.current.children) as HTMLElement[];
    for (let i = 1; i < children.length; i++) {
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
  }, [catDragIdx]);

  const handleCatPointerUp = useCallback(() => {
    if (catDragIdx === null) return;
    setCategories(liveCats);
    setCatDragIdx(null);
    setHasChanges(true);
  }, [catDragIdx, liveCats]);

  const handleSave = () => {
    setHasChanges(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setProducts(buildGridProducts());
    const cats = new Set(DEMO_PRODUCTS.map(p => p.category));
    setCategories(['all', ...Array.from(cats)]);
    setHasChanges(false);
  };

  return (
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
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-display tracking-wider border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> RESET
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-display tracking-wider rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" /> SAVE LAYOUT
          </button>
        </div>
      </div>

      {/* Category ribbon */}
      <div className="px-6 pb-4 flex-shrink-0">
        <label className="text-[10px] font-display tracking-widest text-muted-foreground mb-2 block">
          CATEGORY TABS — drag to reorder
        </label>
        <div
          ref={catRibbonRef}
          className="flex items-center gap-2 flex-wrap"
          onPointerMove={handleCatPointerMove}
          onPointerUp={handleCatPointerUp}
        >
          {liveCats.map((cat, idx) => (
            <div
              key={cat}
              onPointerDown={e => handleCatPointerDown(e, idx)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-display tracking-wider
                transition-all duration-200 select-none touch-none
                ${idx === 0 ? 'border-foreground/20 bg-foreground/10 text-foreground opacity-60 cursor-default' : `cursor-grab active:cursor-grabbing ${getCatColor(cat)}`}
                ${catDragIdx === idx ? 'opacity-50 scale-110 shadow-lg ring-2 ring-primary z-20' : ''}
              `}
            >
              {idx !== 0 && <GripVertical className="w-3 h-3 opacity-40" />}
              {cat.toUpperCase().replace('-', ' ')}
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
        </div>
      </div>

      {/* Grid canvas */}
      <div className="flex-1 overflow-auto px-6 pb-6" ref={containerRef}>
        <label className="text-[10px] font-display tracking-widest text-muted-foreground mb-3 block">
          PRODUCT GRID — drag tiles to reorder
        </label>
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
              const pos = getGridPos(idx);
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
                    // Only transition when NOT being dragged (so others animate to new slots)
                    ...(isBeingDragged ? {} : { transition: 'left 300ms ease-out, top 300ms ease-out' }),
                  }}
                >
                  <div className={`liquid-glass rounded-xl w-full h-full flex flex-col p-3 overflow-hidden group ${isBeingDragged ? 'opacity-90' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
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
      </div>
    </div>
  );
}
