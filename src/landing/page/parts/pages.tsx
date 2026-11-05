// Smart Portal pages rebuilt where the real page needs clicks to reach the state shown:
// Inventory with a SIZES × COLORS matrix open (AdminInventory.tsx), the Grid Editor mid drag
// (AdminPageEditor.tsx) and the Template Lab cards (lab/LabIndex.tsx). Classes copied verbatim.
import { Save, Search, Plus, ChevronDown, ChevronRight, Square, GripVertical, Eye, Archive, X, AlertTriangle, RotateCcw, Pencil, FlaskConical } from 'lucide-react';
import { getSwatchStyle } from '@/lib/swatch-style';
import type { DemoProduct } from '@/data/demo-data';
import { EASE_CSS, PAGE1, piece } from '../lib/core';

function Badge({ n, vars }: { n: number; vars: number }) {
  if (n === 0) return <span className="text-[10px] font-display px-2 py-1 rounded bg-destructive/20 text-destructive">OUT OF STOCK</span>;
  if (n / vars <= 5) return <span className="text-[10px] font-display px-2 py-1 rounded bg-warning/20 text-warning inline-flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> LOW</span>;
  return <span className="text-[10px] font-display px-2 py-1 rounded bg-success/20 text-success">IN STOCK</span>;
}

function Row({ p, stock, open }: { p: DemoProduct; stock: number; open: boolean }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <span className="flex-shrink-0 text-muted-foreground/40"><Square className="w-4 h-4" /></span>
      <span className="text-muted-foreground/30 flex-shrink-0"><GripVertical className="w-4 h-4" /></span>
      <span className="text-muted-foreground">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
      <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#e0e0e0' }}>
        <img src={p.images[0].thumb} alt={p.title} className="w-full h-full object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-medium truncate">{p.title}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[10px] font-display px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground/70">{p.product_type.toUpperCase()}</span>
          <span className="text-[10px] font-display px-1.5 py-0.5 rounded border border-border/30 text-muted-foreground/50">{p.gender.toUpperCase()}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0 w-24">
        <span className="font-display text-sm">${p.price}</span>
        {p.compare_at_price && <span className="text-[10px] text-muted-foreground line-through ml-1.5">${p.compare_at_price}</span>}
      </div>
      <div className="flex-shrink-0 w-20 text-right"><span className="font-display text-sm">{stock}</span><span className="text-[10px] text-muted-foreground ml-1">units</span></div>
      <div className="flex-shrink-0 w-16 flex justify-center"><span className="p-1.5 rounded text-success"><Eye className="w-4 h-4" /></span></div>
      <div className="flex-shrink-0 w-24 text-right"><Badge n={stock} vars={p.variants.length} /></div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="p-1.5 rounded text-muted-foreground/30"><Archive className="w-3.5 h-3.5" /></span>
        <span className="p-1.5 rounded text-muted-foreground/30"><X className="w-3.5 h-3.5" /></span>
      </div>
    </div>
  );
}

const MATRIX: Record<string, number[]> = { 'p1-col-burgundy': [8, 12, 4, 9, 14], 'p1-col-forest': [7, 3, 11, 0, 10] };

function Cell({ size, n }: { size: string; n: number }) {
  const out = n === 0, low = n > 0 && n <= 5;
  return (
    <div className={`px-3 py-2.5 rounded-lg border text-center transition-colors ${out ? 'border-destructive/30 bg-destructive/5' : low ? 'border-warning/30 bg-warning/5' : 'border-border bg-secondary/30'}`}>
      <p className="text-xs font-display font-medium mb-1">{size}</p>
      <span className={`text-sm font-display ${out ? 'text-destructive' : low ? 'text-warning' : 'text-foreground/70'}`}>{n}</span>
    </div>
  );
}

/** Inventory, Cloud Puffer Jacket open on its sizes by colourway. */
export function InventoryPage({ open = true, thumb = false }: { open?: boolean; thumb?: boolean }) {
  const puffer = piece('p1');
  const rest: [DemoProduct, number][] = [[piece('p2'), 41], [piece('p7'), 12], [piece('p9'), 38], [piece('p3'), 33]];
  return (
    <div className="p-8 max-w-[1200px]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Inventory</h1>
        <span className="px-4 py-2.5 font-display text-sm tracking-wider rounded-lg flex items-center gap-2 bg-foreground/10 text-muted-foreground/50"><Save className="w-4 h-4" /> SAVE</span>
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <span className="block w-full pl-10 pr-4 py-2.5 liquid-glass rounded-lg text-sm text-muted-foreground">Search products...</span>
        </div>
        <span className="px-3 py-1.5 text-xs font-display tracking-wider bg-foreground/10 text-foreground border border-foreground/20 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><Plus className="w-3 h-3" /> ADD PRODUCT</span>
        <span className="text-xs font-display px-3 py-1.5 bg-warning/20 text-warning rounded-lg flex items-center gap-1.5 whitespace-nowrap"><AlertTriangle className="w-3 h-3" /> 2 LOW</span>
      </div>
      <div className="space-y-2">
        <div className="liquid-glass rounded-xl overflow-hidden">
          <Row p={puffer} stock={78} open={open} />
          <div className="overflow-hidden" style={{ maxHeight: open ? 360 : 0, opacity: open ? 1 : 0, transition: thumb ? 'none' : `max-height 500ms ${EASE_CSS}, opacity 400ms ${EASE_CSS}` }}>
            <div className="border-t border-border px-6 py-5">
              <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">SIZES × COLORS (10)</p>
              <div className="space-y-3">
                {(puffer.colorways ?? []).map(cw => (
                  <div key={cw.id} className="rounded-lg border border-border/40 bg-background/20 p-2.5">
                    <div className="flex items-center gap-2 mb-2 pl-0.5">
                      <span className="w-4 h-4 rounded-full border border-border shrink-0" style={getSwatchStyle(cw)} />
                      <span className="text-[11px] font-display tracking-widest text-foreground uppercase">{cw.name}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {['XS', 'S', 'M', 'L', 'XL'].map((s, i) => <Cell key={s} size={s} n={MATRIX[cw.id]?.[i] ?? 0} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {rest.map(([p, n]) => <div key={p.id} className="liquid-glass rounded-xl overflow-hidden"><Row p={p} stock={n} open={false} /></div>)}
      </div>
    </div>
  );
}

const CAT_COLORS: Record<string, string> = {
  outerwear: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  streetwear: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  essentials: 'border-zinc-400/40 bg-zinc-400/10 text-zinc-400',
  'new-arrivals': 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
};
const GTW = 220, GTH = 300, GP = 226, GPY = 306, GC = 5;
const gpos = (i: number) => ({ x: (i % GC) * GP, y: Math.floor(i / GC) * GPY });

/** Grid Editor with one tile dragged from slot `from` to slot `to` as `t` runs 0..1. */
export function GridEditorPage({ t, from = 9, to = 1, thumb = false }: { t: number; from?: number; to?: number; thumb?: boolean }) {
  const dragging = t >= 0.2 && t < 0.8;
  const dropped = t >= 0.8;
  const k = Math.max(0, Math.min(1, (t - 0.2) / 0.6));
  const order = PAGE1.map((_, i) => i);
  if (dragging || dropped) { order.splice(from, 1); order.splice(to, 0, from); }
  const slotOf = (idx: number) => order.indexOf(idx);
  const a = gpos(from), b = gpos(to);
  const dragPos = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  const scale = 0.62;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
        <h1 className="font-display text-2xl font-bold">Grid Editor</h1>
        <div className="flex items-center gap-2">
          {dropped && <span className="text-xs font-display text-success tracking-wider">SAVED</span>}
          <span className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-display tracking-wider border border-border rounded-lg"><RotateCcw className="w-3.5 h-3.5" /> RESET</span>
          <span className={`flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-display tracking-wider rounded-lg ${dragging ? '' : 'opacity-40'}`}><Save className="w-3.5 h-3.5" /> SAVE LAYOUT</span>
        </div>
      </div>
      <div className="px-6 pb-4 flex-shrink-0">
        <label className="text-[10px] font-display tracking-widest text-muted-foreground mb-2 block">NAVIGATION TAGS</label>
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'outerwear', 'streetwear', 'new-arrivals', 'essentials'].map((c, i) => (
            <div key={c} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-display tracking-wider ${i === 0 ? 'border-foreground/20 bg-foreground/10 text-foreground opacity-60' : CAT_COLORS[c]}`}>
              {i !== 0 && <GripVertical className="w-3 h-3 opacity-40" />}{c.toUpperCase().replace('-', ' ')}
            </div>
          ))}
          <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-border/50 text-[11px] font-display tracking-wider text-muted-foreground"><Plus className="w-3 h-3" /> ADD</span>
          <span className="ml-1 px-2.5 py-1.5 text-xs font-display tracking-wider rounded-lg border bg-card text-muted-foreground border-border"><Pencil className="w-3.5 h-3.5" /></span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden px-6 py-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[10px] font-display tracking-widest text-muted-foreground">PRODUCT GRID</label>
          <div className="flex items-center gap-1">
            {[0, 1].map(i => (
              <span key={i} className={`px-2.5 py-1 text-[10px] font-display tracking-wider rounded-md border ${i === 0 ? 'bg-primary/20 text-primary border-primary/40' : 'text-muted-foreground border-border/50'}`}>PAGE {i + 1}</span>
            ))}
          </div>
        </div>
        <div className="relative mx-auto" style={{ width: 1124 * scale, height: 1218 * scale }}>
          <div className="absolute top-0 left-0 origin-top-left" style={{ width: 1124, height: 1218, transform: `scale(${scale})` }}>
            {PAGE1.map((p, idx) => {
              const isDrag = idx === from && dragging;
              const pos = isDrag ? dragPos : gpos(slotOf(idx));
              return (
                <div key={p.id} className={`absolute rounded-xl border select-none ${isDrag ? 'z-50 scale-105 shadow-2xl ring-2 ring-primary/50' : 'z-10'}`}
                  style={{ left: pos.x, top: pos.y, width: GTW, height: GTH, transition: thumb || isDrag ? 'none' : 'left 300ms ease-out, top 300ms ease-out' }}>
                  <div className={`liquid-glass rounded-xl w-full h-full flex flex-col p-3 overflow-hidden ${isDrag ? 'opacity-90' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
                      <span className={`text-[8px] font-display px-1.5 py-0.5 rounded border ${CAT_COLORS[p.category]}`}>{p.category.toUpperCase().replace('-', ' ')}</span>
                    </div>
                    <div className="flex-1 bg-muted/20 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                      <img src={p.images[0].thumb} alt={p.title} className="w-full h-full object-cover rounded-lg pointer-events-none" />
                    </div>
                    <div>
                      <p className="text-[11px] font-display font-medium truncate leading-tight">{p.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-display text-foreground/70">${p.price}</span>
                        {p.compare_at_price && <span className="text-[8px] text-muted-foreground line-through">${p.compare_at_price}</span>}
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

const TEMPLATES = [
  { id: 'yz' as const, name: 'YZ Template', subtitle: 'Spatial product grid. Built for streetwear and fashion.' },
  { id: 'sl' as const, name: 'SL Template', subtitle: 'Editorial luxury grid. Built for high-end fashion and designer brands.' },
];

/** lab/LabIndex.tsx template card. */
export function TemplateCard({ name, subtitle, active }: { name: string; subtitle: string; active: boolean }) {
  return (
    <div className="group relative flex items-center justify-between gap-4 p-5 rounded-xl liquid-glass transition-all duration-300">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-foreground/5 border border-foreground/10 flex items-center justify-center">
          <FlaskConical className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="font-display text-xs tracking-[0.15em] text-foreground">{name}</span>
          <span className="text-[11px] text-muted-foreground/70">{subtitle}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-display tracking-wider transition-all backdrop-blur-sm ${
          active ? 'bg-success/15 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20' : 'bg-foreground/5 text-muted-foreground border border-foreground/10'
        }`}>{active ? 'ACTIVE' : 'SET ACTIVE'}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
      </div>
    </div>
  );
}

/** lab/LabIndex.tsx page. */
export function LabPage({ active, stack = false }: { active: 'yz' | 'sl'; stack?: boolean }) {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-wide">Templates</h1>
        <p className="text-[11px] text-muted-foreground font-display tracking-wider">Choose which template publishes to your storefront</p>
      </div>
      <div className={`grid ${stack ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
        {TEMPLATES.map(tp => <TemplateCard key={tp.id} name={tp.name} subtitle={tp.subtitle} active={tp.id === active} />)}
      </div>
    </div>
  );
}
