// Build a Set chapter UI: the Look Book canvas (StyleGuideCanvas.tsx node, edge, toolbar and hint
// markup, with its real PAIRS and EXTRAS colours) and the Build a Set screen (StyleKitView.tsx, PAIRS mode).
import { X, Plus, Save, Layers, Copy, ShoppingBag } from 'lucide-react';
import { getImageUrl, type DemoProduct } from '@/data/demo-data';
import { getBodyZone } from '@/lib/pairing-logic';
import { splitSentences } from '@/lib/format-description';
import { EASE_CSS, piece, useSize } from '../lib/core';
import { Fit, Layer, PortalDark } from './core';

const PAIRS_STYLE = { stroke: '#facc15', strokeWidth: 2, filter: 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.5))' };
const EXTRAS_STYLE = { stroke: '#f472b6', strokeWidth: 2, filter: 'drop-shadow(0 0 4px rgba(244, 114, 182, 0.5))' };
const ZONE = {
  top: { border: 'rgba(96,165,250,0.4)', glow: 'rgba(96,165,250,0.2)' },
  bottom: { border: 'rgba(74,222,128,0.4)', glow: 'rgba(74,222,128,0.2)' },
  accessory: { border: 'rgba(168,85,247,0.4)', glow: 'rgba(168,85,247,0.2)' },
} as const;

const ANCHOR = piece('p1');
const PAIRS = [piece('p5'), piece('p16')];
const EXTRAS = [piece('p8'), piece('p3')];
const NODE_W = 120, NODE_H = 136;
const NODES: { p: DemoProduct; x: number; y: number }[] = [
  { p: ANCHOR, x: 320, y: 190 },
  { p: PAIRS[0], x: 570, y: 66 }, { p: PAIRS[1], x: 570, y: 322 },
  { p: EXTRAS[0], x: 70, y: 66 }, { p: EXTRAS[1], x: 70, y: 322 },
];

/** StyleGuideCanvas.tsx ProductNode. */
function Node({ p, x, y, selected }: { p: DemoProduct; x: number; y: number; selected?: boolean }) {
  const c = ZONE[getBodyZone(p) as keyof typeof ZONE] ?? ZONE.top;
  return (
    <div className={`absolute rounded-lg p-2 flex flex-col items-center gap-1.5 w-[120px] ${selected ? 'ring-2 ring-primary/50' : ''}`}
      style={{ left: x, top: y, background: '#141414', border: `2px solid ${c.border}`, boxShadow: `0 0 20px ${c.glow}${selected ? ', 0 0 25px hsl(var(--primary) / 0.15)' : ''}` }}>
      <img src={getImageUrl(p.images[0], 'thumb')} alt={p.title} className="w-[80px] h-[80px] rounded object-cover" draggable={false} />
      <p className="text-[10px] font-display tracking-wide text-center leading-tight truncate w-full" style={{ color: '#e5e5e5' }}>{p.title}</p>
      <p className="text-[9px]" style={{ color: '#888' }}>${p.price}</p>
    </div>
  );
}

function edge(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1) * 0.5;
  const s = x2 > x1 ? 1 : -1;
  return `M ${x1} ${y1} C ${x1 + dx * s} ${y1}, ${x2 - dx * s} ${y2}, ${x2} ${y2}`;
}

/** The Look Book canvas, 760 × 520. `drawn` 0..1 draws the pairs, then the extras. */
export function LookBook({ drawn, thumb = false }: { drawn: number; thumb?: boolean }) {
  const a = NODES[0];
  const ay = a.y + NODE_H / 2;
  const pairs = Math.max(0, Math.min(1, drawn * 2));
  const extras = Math.max(0, Math.min(1, drawn * 2 - 1));
  const tr = thumb ? 'none' : `stroke-dashoffset 700ms ${EASE_CSS}`;
  return (
    <PortalDark className="relative w-[760px] h-[520px] overflow-hidden" style={{ background: '#0a0a0a' }}>
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 liquid-glass rounded-lg px-2 py-1.5">
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground/10 text-foreground border border-foreground/10 rounded-md text-[10px] font-display tracking-wider">
          <Plus className="w-3.5 h-3.5" />ADD MATCH
        </span>
        <div className="flex items-center gap-3 ml-2 text-[9px] text-muted-foreground font-display tracking-wider">
          <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 rounded" style={{ background: '#facc15', boxShadow: '0 0 6px rgba(250, 204, 21, 0.6)' }} />PAIRS</span>
          <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 rounded" style={{ background: '#f472b6', backgroundImage: 'repeating-linear-gradient(90deg, #f472b6 0 4px, transparent 4px 7px)', boxShadow: '0 0 6px rgba(244, 114, 182, 0.6)' }} />EXTRAS</span>
        </div>
      </div>
      <div className="absolute top-4 right-4 z-10">
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-display tracking-wider ${drawn > 0 ? 'bg-foreground text-background' : 'bg-foreground/10 text-muted-foreground border border-foreground/10'}`}>
          <Save className="w-3.5 h-3.5" />SAVE
        </span>
      </div>
      <svg className="absolute inset-0" width={760} height={520} fill="none">
        {NODES.slice(1, 3).map(n => (
          <path key={n.p.id} d={edge(a.x + NODE_W, ay, n.x, n.y + NODE_H / 2)} pathLength={1} style={{ ...PAIRS_STYLE, strokeDasharray: 1, strokeDashoffset: 1 - pairs, transition: tr }} />
        ))}
        {NODES.slice(3).map(n => (
          <path key={n.p.id} d={edge(a.x, ay, n.x + NODE_W, n.y + NODE_H / 2)} pathLength={1} style={{ ...EXTRAS_STYLE, strokeDasharray: 1, strokeDashoffset: 1 - extras, transition: tr }} />
        ))}
      </svg>
      {NODES.map((n, i) => <Node key={n.p.id} {...n} selected={i === 0} />)}
      <div className="absolute bottom-4 left-4 z-10 tracking-wider space-y-0.5" style={{ fontSize: '10px', fontFamily: 'var(--font-body)' }}>
        <p className="text-muted-foreground/30">SCROLL OR PINCH TO ZOOM · DRAG TO PAN · CLICK TO SELECT</p>
        <p className="text-muted-foreground/30">DRAG PORT TO CONNECT · DOUBLE-CLICK TO ADD NODE</p>
      </div>
    </PortalDark>
  );
}

/** StyleKitView.tsx ProductDetails, inside a LockedPairPanel (PAIRS mode, horizontal). */
function PairPanel({ p, size }: { p: DemoProduct; size: string | null }) {
  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  return (
    <div className="flex flex-col bg-card/50 backdrop-blur-sm h-full">
      <div className="flex-1 flex flex-row overflow-hidden">
        <div className="bg-secondary/30 flex items-center justify-center flex-shrink-0 relative overflow-hidden h-full aspect-[3/4]">
          <img src={p.images[0].thumb} alt={p.title} className="w-full h-full object-cover" draggable={false} />
          <div className="absolute bottom-0 left-0 right-0 flex h-10 z-10">
            {p.images.slice(0, 2).map((im, i) => (
              <span key={im.thumb} className="flex-1 relative"><span className={`absolute bottom-2 left-0.5 right-0.5 h-0.5 rounded-full ${i === 0 ? 'bg-foreground/80' : 'bg-foreground/15'}`} /></span>
            ))}
          </div>
          <span className="absolute top-2 right-2 p-1.5 bg-background/60 backdrop-blur-sm rounded-full"><X className="w-3.5 h-3.5 text-muted-foreground" /></span>
        </div>
        <div className="flex-1 flex flex-col p-5 overflow-hidden">
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-display tracking-widest text-primary whitespace-nowrap">PAIRED ITEM</span>
                <h3 className="font-display text-base font-bold tracking-wide text-foreground truncate">{p.title}</h3>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-display text-sm text-foreground">${p.price}</span>
                {p.compare_at_price && <span className="text-xs text-muted-foreground/60 line-through">${p.compare_at_price}</span>}
              </div>
            </div>
            <p className="text-xs text-foreground/70 leading-relaxed">
              {splitSentences(p.description).map((s, i) => <span key={i} className="block">{s}</span>)}
            </p>
            <div>
              <p className="text-[10px] font-display tracking-widest text-muted-foreground mb-2">SIZE</p>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map(s => (
                  <span key={s} className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded border transition-colors ${
                    s === size ? 'bg-primary text-primary-foreground border-primary' : 'border-border/60 text-muted-foreground'
                  }`}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The Build a Set screen (StyleKitView.tsx), 600 × 620. Follows the page's mode like the storefront. */
export function BuildSet({ sized }: { sized: boolean }) {
  const top = ANCHOR, bottom = PAIRS[0];
  const ts = sized ? 'M' : null, bs = sized ? 'M' : null;
  return (
    <div className="w-[600px] h-[620px] bg-background flex flex-col border border-border rounded-xl overflow-hidden">
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display text-xs font-bold tracking-[0.15em] text-foreground whitespace-nowrap">STYLE KIT</span>
          <span className="text-[10px] text-foreground/60 font-display tracking-wider truncate">Goes well with {top.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-secondary rounded-md p-0.5">
            <span className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-display tracking-wider bg-primary text-primary-foreground"><Layers className="w-3 h-3" />PAIRS</span>
            <span className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-display tracking-wider text-muted-foreground"><Copy className="w-3 h-3" />EXTRAS</span>
          </div>
          <span className="p-2 rounded-lg"><X className="w-5 h-5 text-foreground" /></span>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-1/2 min-h-0 relative overflow-hidden"><PairPanel p={top} size={ts} /></div>
        <div className="h-1/2 min-h-0 relative overflow-hidden border-t border-border"><PairPanel p={bottom} size={bs} /></div>
      </div>
      <div className="flex-shrink-0 border-t border-border bg-card/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${ts ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              <span className="text-[10px] font-display tracking-wider text-muted-foreground">{top.title} {ts ? `· ${ts}` : '· Select size'}</span>
            </div>
            <span className="text-muted-foreground/30">+</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${bs ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              <span className="text-[10px] font-display tracking-wider text-muted-foreground">{bottom.title} {bs ? `· ${bs}` : '· Select size'}</span>
            </div>
          </div>
          <span className="font-display text-sm font-bold">${top.price + bottom.price}</span>
        </div>
        <span className="w-full py-3.5 rounded-lg font-display text-sm font-bold tracking-[0.15em] flex items-center justify-center gap-2 bg-primary text-primary-foreground">
          <ShoppingBag className="w-4 h-4" />ADD SET TO CART
        </span>
      </div>
    </div>
  );
}

/**
 * Build a Set, two beats: 0 the Look Book draws pairs and extras · 1 the shopper's Build a Set screen.
 * `side` puts them next to each other; otherwise they crossfade in one frame.
 */
export function SetVisual({ step, t, thumb = false, side = true }: { step: number; t: number; thumb?: boolean; side?: boolean }) {
  const [ref, box] = useSize<HTMLDivElement>();
  const drawn = thumb ? 1 : step === 0 ? Math.min(1, t * 1.4) : 1;
  const sized = thumb || (step === 1 && t >= 0.35);
  const wide = box.h > 0 && box.w / box.h > 1.5;
  return <div ref={ref} className="w-full h-full">{box.w > 0 && <SetLayout step={step} drawn={drawn} sized={sized} thumb={thumb} side={side && wide} />}</div>;
}

function SetLayout({ step, drawn, sized, thumb, side }: { step: number; drawn: number; sized: boolean; thumb: boolean; side: boolean }) {
  if (side) {
    return (
      <div className="w-full h-full grid grid-cols-[1.5fr_1fr] gap-4 items-center">
        <div className={`h-full rounded-xl overflow-hidden border transition-colors duration-500 ${step === 0 ? 'border-foreground/25' : 'border-border'}`}>
          <Fit w={760} h={520} className="w-full h-full" style={{ background: '#0a0a0a' }} grow><LookBook drawn={drawn} thumb={thumb} /></Fit>
        </div>
        <Fit w={600} h={620} className="w-full h-full" grow><BuildSet sized={sized} /></Fit>
      </div>
    );
  }
  return (
    <div className="relative w-full h-full">
      <Layer on={step === 0} thumb={thumb}>
        <div className="w-full h-full rounded-xl overflow-hidden border border-border"><Fit w={760} h={520} className="w-full h-full" style={{ background: '#0a0a0a' }} grow><LookBook drawn={drawn} thumb={thumb} /></Fit></div>
      </Layer>
      <Layer on={step === 1} thumb={thumb}>
        <Fit w={600} h={620} className="w-full h-full" grow><BuildSet sized={sized} /></Fit>
      </Layer>
    </div>
  );
}
