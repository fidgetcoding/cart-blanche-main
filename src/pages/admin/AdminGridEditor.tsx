import { useState, useRef, useCallback, useEffect } from 'react';
import { DEMO_PRODUCTS, type DemoProduct } from '@/data/demo-data';
import { GripVertical, Save, RotateCcw } from 'lucide-react';

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
  gridIndex: number;
}

function buildGridProducts(): GridProduct[] {
  return DEMO_PRODUCTS.map((p, i) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    compare_at_price: p.compare_at_price,
    category: p.category,
    images: p.images,
    gridIndex: i,
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

export default function AdminGridEditor() {
  const [products, setProducts] = useState<GridProduct[]>(buildGridProducts);
  const [categories, setCategories] = useState<string[]>(() => {
    const cats = new Set(DEMO_PRODUCTS.map(p => p.category));
    return ['all', ...Array.from(cats)];
  });

  // Drag state for products
  const [draggingProductIdx, setDraggingProductIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  // Drag state for categories
  const [draggingCatIdx, setDraggingCatIdx] = useState<number | null>(null);
  const [catDropIdx, setCatDropIdx] = useState<number | null>(null);

  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);

  // Calculate grid positions
  const getGridPos = (index: number) => ({
    x: (index % COLS) * (TILE_W + GAP),
    y: Math.floor(index / COLS) * (TILE_H + GAP),
  });

  const rows = Math.ceil(products.length / COLS);
  const canvasH = rows * (TILE_H + GAP) - GAP;

  // Scale to fit
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);

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

  // Product drag handlers
  const handleProductDragStart = (e: React.DragEvent, idx: number) => {
    setDraggingProductIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'product');
  };

  const handleProductDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggingProductIdx !== null && idx !== draggingProductIdx) {
      setDropTargetIdx(idx);
    }
  };

  const handleProductDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggingProductIdx === null || draggingProductIdx === idx) return;

    setProducts(prev => {
      const next = [...prev];
      const [moved] = next.splice(draggingProductIdx, 1);
      next.splice(idx, 0, moved);
      return next.map((p, i) => ({ ...p, gridIndex: i }));
    });
    setDraggingProductIdx(null);
    setDropTargetIdx(null);
    setHasChanges(true);
  };

  const handleProductDragEnd = () => {
    setDraggingProductIdx(null);
    setDropTargetIdx(null);
  };

  // Category drag handlers
  const handleCatDragStart = (e: React.DragEvent, idx: number) => {
    if (idx === 0) return; // Can't drag "ALL"
    setDraggingCatIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'category');
  };

  const handleCatDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (idx === 0) return;
    if (draggingCatIdx !== null && idx !== draggingCatIdx) {
      setCatDropIdx(idx);
    }
  };

  const handleCatDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggingCatIdx === null || draggingCatIdx === idx || idx === 0) return;

    setCategories(prev => {
      const next = [...prev];
      const [moved] = next.splice(draggingCatIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDraggingCatIdx(null);
    setCatDropIdx(null);
    setHasChanges(true);
  };

  const handleCatDragEnd = () => {
    setDraggingCatIdx(null);
    setCatDropIdx(null);
  };

  const handleSave = () => {
    // In a real app, persist to Supabase
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

      {/* Category ribbon — draggable */}
      <div className="px-6 pb-4 flex-shrink-0">
        <label className="text-[10px] font-display tracking-widest text-muted-foreground mb-2 block">
          CATEGORY TABS — drag to reorder
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat, idx) => (
            <div
              key={cat}
              draggable={idx !== 0}
              onDragStart={e => handleCatDragStart(e, idx)}
              onDragOver={e => handleCatDragOver(e, idx)}
              onDrop={e => handleCatDrop(e, idx)}
              onDragEnd={handleCatDragEnd}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-display tracking-wider
                transition-all cursor-grab active:cursor-grabbing select-none
                ${idx === 0 ? 'border-foreground/20 bg-foreground/10 text-foreground opacity-60 cursor-default' : getCatColor(cat)}
                ${draggingCatIdx === idx ? 'opacity-40 scale-95' : ''}
                ${catDropIdx === idx ? 'ring-2 ring-primary scale-105' : ''}
              `}
            >
              {idx !== 0 && <GripVertical className="w-3 h-3 opacity-40" />}
              {cat.toUpperCase().replace('-', ' ')}
            </div>
          ))}
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
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: CANVAS_W,
              height: canvasH,
              transform: `scale(${scale})`,
            }}
          >
            {products.map((p, idx) => {
              const pos = getGridPos(idx);
              const isDragging = draggingProductIdx === idx;
              const isDropTarget = dropTargetIdx === idx;

              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={e => handleProductDragStart(e, idx)}
                  onDragOver={e => handleProductDragOver(e, idx)}
                  onDrop={e => handleProductDrop(e, idx)}
                  onDragEnd={handleProductDragEnd}
                  className={`
                    absolute rounded-xl border cursor-grab active:cursor-grabbing
                    transition-all duration-200 ease-out select-none
                    ${isDragging ? 'opacity-30 scale-95 z-0' : 'z-10'}
                    ${isDropTarget ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]' : ''}
                  `}
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: TILE_W,
                    height: TILE_H,
                  }}
                >
                  {/* Tile content */}
                  <div className="liquid-glass rounded-xl w-full h-full flex flex-col p-3 overflow-hidden group">
                    {/* Drag handle */}
                    <div className="flex items-center justify-between mb-2">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      <span className={`text-[8px] font-display px-1.5 py-0.5 rounded border ${getCatColor(p.category)}`}>
                        {p.category.toUpperCase().replace('-', ' ')}
                      </span>
                    </div>

                    {/* Image placeholder */}
                    <div className="flex-1 bg-muted/20 rounded-lg mb-2 flex items-center justify-center">
                      {p.images.length > 0 ? (
                        <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <div className="text-[10px] font-display text-muted-foreground/30 tracking-wider">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    {/* Product info */}
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
