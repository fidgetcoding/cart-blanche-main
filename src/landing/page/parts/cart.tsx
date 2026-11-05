// SmartCart chapter UI: the CartDrawer (CartDrawer.tsx) over the store, AI STYLIST tab with the real
// bubble, ProductCard and OutfitCard markup, then the CART tab with the real exported CartFooter.
// The drawer's ProductCard shows an "IMG" box in the app; here the product's own thumbnail fills it.
import type { ReactNode } from 'react';
import { X, Sparkles, Send, Image as ImageIcon, Loader2, Minus, Plus, Layers } from 'lucide-react';
import { CartFooter } from '@/components/storefront/CartDrawer';
import type { DemoProduct } from '@/data/demo-data';
import { PAGE1, money, piece, useSize } from '../lib/core';
import { StoreCanvas } from './shop';

type Outfit = { name: string; items: { p?: DemoProduct; role: string; label?: string }[] };
type Msg = { id: string; user?: string; image?: string; text?: string; products?: DemoProduct[]; outfit?: Outfit };

const BEATS: Msg[][] = [
  [{ id: 'u0', user: 'Show me the newest arrivals' }, { id: 'a0', text: 'From the new arrivals:', products: [piece('p19'), piece('p20')] }],
  [{ id: 'u1', user: 'Build an outfit around the Leather Moto Jacket' }, { id: 'a1', text: 'Here is a look built around it.', outfit: { name: 'Moto Look', items: [{ p: piece('p9'), role: 'Anchor' }, { p: piece('p6'), role: 'Layer' }, { p: piece('p25'), role: 'Bottom' }] } }],
  [{ id: 'u2', user: 'What can I get under $100?' }, { id: 'a2', text: 'All under $100:', products: [piece('p13'), piece('p11'), piece('p6')] }],
  [{ id: 'u3', user: 'What goes with this?', image: '/products/p3-bomber-worn-medium.webp' }, { id: 'a3', text: 'A bomber. These go with it from the store:', outfit: { name: 'Around Your Bomber', items: [{ role: 'Jacket', label: 'Your bomber' }, { p: piece('p5'), role: 'Bottom' }, { p: piece('p13'), role: 'Top' }] } }],
  [{ id: 'a4', text: 'The Cargo Pants are in your cart. These go with them:', products: [piece('p13')] }],
];

/** CartDrawer.tsx ProductCard. */
function ProductCard({ p }: { p: DemoProduct }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-secondary/40 border border-border/50">
      <img src={p.images[0].thumb} alt={p.title} className="w-14 h-14 rounded-md bg-muted object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-display text-xs font-medium truncate">{p.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{p.description}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-display text-xs font-semibold">${p.price}</span>
          <span className="px-2 py-0.5 text-[9px] font-display tracking-wider bg-primary text-primary-foreground rounded">ADD</span>
        </div>
      </div>
    </div>
  );
}

/** CartDrawer.tsx OutfitCard, with its "not from store" row for a photo's own piece. */
function OutfitCard({ o }: { o: Outfit }) {
  const total = o.items.reduce((s, i) => s + (i.p?.price ?? 0), 0);
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden bg-secondary/30">
      <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
        <span className="font-display text-xs font-semibold tracking-wide">{o.name.toUpperCase()}</span>
        <span className="font-display text-xs text-muted-foreground">${money(total)}</span>
      </div>
      <div className="p-2 space-y-1.5">
        {o.items.map((it, i) => it.p ? (
          <div key={it.p.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/40">
            <img src={it.p.images[0].thumb} alt={it.p.title} className="w-8 h-8 rounded object-cover bg-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-display font-medium truncate">{it.p.title}</p>
              <p className="text-[9px] text-muted-foreground">{it.role} · ${it.p.price}</p>
            </div>
            <span className="px-1.5 py-0.5 text-[8px] font-display tracking-wider text-muted-foreground border border-border rounded">ADD</span>
          </div>
        ) : (
          <div key={`ext-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/30 border border-dashed border-border/40">
            <div className="w-8 h-8 rounded bg-muted/50 flex items-center justify-center text-muted-foreground flex-shrink-0"><ImageIcon className="w-3.5 h-3.5" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-display font-medium text-muted-foreground truncate">{it.label || 'Your item'}</p>
              <p className="text-[9px] text-muted-foreground/60">{it.role} · not from store</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border/30">
        <span className="block text-center w-full py-1.5 text-[10px] font-display font-semibold tracking-wider bg-primary text-primary-foreground rounded">ADD STORE ITEMS TO CART</span>
      </div>
    </div>
  );
}

function Bubble({ m, anim }: { m: Msg; anim: boolean }) {
  return (
    <div className={`flex ${m.user ? 'justify-end' : 'justify-start'} ${anim ? 'animate-fade-up' : ''}`}>
      {m.user ? (
        <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2">
          {m.image && <div className="mb-2 rounded-lg overflow-hidden"><img src={m.image} alt="Uploaded" className="w-full max-h-40 object-cover rounded-lg" /></div>}
          <p className="text-xs">{m.user}</p>
        </div>
      ) : (
        <div className="max-w-[85%] space-y-2">
          {m.text && <div className="text-xs text-foreground/90 leading-relaxed"><p className="my-1">{m.text}</p></div>}
          {m.products && <div className="space-y-2 mt-2">{m.products.map(p => <ProductCard key={p.id} p={p} />)}</div>}
          {m.outfit && <div className="mt-2"><OutfitCard o={m.outfit} /></div>}
        </div>
      )}
    </div>
  );
}

const CART_LINES = [
  { p: piece('p1'), variant: 'Burgundy · M', price: 420 },
  { p: piece('p5'), variant: 'Olive · M', price: 175 },
];
const SPRING20 = { code: 'SPRING20', discount_type: 'percentage', discount_value: 20, description: '20% off orders over $150', minimum_spend: 150 };
const noop = () => {};

/** CartDrawer.tsx header and tab toggle. */
function DrawerHead({ tab, count, unread }: { tab: 'cart' | 'assistant'; count: number; unread: boolean }) {
  const ind = <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />;
  return (
    <div className="border-b border-white/[0.06]">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="font-display text-sm font-semibold tracking-[0.15em]">SMARTCART</h2>
        <span className="p-1.5 rounded-lg"><X className="w-4 h-4" /></span>
      </div>
      <div className="flex px-4 pb-0">
        <span className={`relative flex-1 py-2.5 text-xs font-display tracking-wider text-center transition-colors ${tab === 'cart' ? 'text-foreground' : 'text-muted-foreground'}`}>
          CART {count > 0 && `(${count})`}{tab === 'cart' && ind}
        </span>
        <span className={`relative flex-1 py-2.5 text-xs font-display tracking-wider transition-colors flex items-center justify-center gap-1.5 ${tab === 'assistant' ? 'text-foreground' : 'text-muted-foreground'}`}>
          <Sparkles className="w-3 h-3" />AI STYLIST
          {unread && tab !== 'assistant' && <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />}
          {tab === 'assistant' && ind}
        </span>
      </div>
    </div>
  );
}

function Lines() {
  return (
    <div className="flex-1 overflow-hidden p-4 space-y-3">
      {CART_LINES.map(l => (
        <div key={l.p.id} className="flex gap-3 p-3 bg-secondary/50 rounded-lg relative">
          <img src={l.p.images[0].thumb} alt={l.p.title} className="w-14 h-14 rounded-md object-cover bg-muted flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-xs font-medium truncate">{l.p.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{l.variant}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 flex items-center justify-center rounded border border-border"><Minus className="w-2.5 h-2.5" /></span>
                <span className="text-xs w-5 text-center">1</span>
                <span className="w-5 h-5 flex items-center justify-center rounded border border-border"><Plus className="w-2.5 h-2.5" /></span>
              </div>
              <span className="font-display text-xs">${money(l.price)}</span>
            </div>
          </div>
          <span className="self-start p-0.5 text-muted-foreground"><X className="w-3.5 h-3.5" /></span>
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <span className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-display tracking-wider text-muted-foreground rounded-md border border-border/40"><Sparkles className="w-3 h-3" />ASK AI</span>
            <span className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-display tracking-wider text-muted-foreground rounded-md border border-border/40"><Layers className="w-3 h-3" />PAIRS</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The drawer alone, 384 wide, filling its parent's height. */
export function Drawer({ step, t, thumb = false }: { step: number; t: number; thumb?: boolean }) {
  const tab = step >= 5 ? 'cart' : 'assistant';
  const msgs: { m: Msg; anim: boolean }[] = [];
  let thinking = false;
  BEATS.slice(0, Math.min(step + 1, BEATS.length)).forEach((beat, b) => {
    beat.forEach(m => {
      const cur = b === step && !thumb;
      if (cur && !m.user && t < 0.3) { thinking = true; return; }
      msgs.push({ m, anim: cur });
    });
  });
  if (thinking && step === 4) thinking = t >= 0.1;
  const subtotal = 595, off = 119;
  let body: ReactNode;
  if (tab === 'cart') {
    body = (
      <div className="flex-1 flex flex-col min-h-0">
        <Lines />
        <CartFooter subtotal={subtotal} discount={SPRING20} discountAmount={off} total={subtotal - off} applyDiscount={noop} removeDiscount={noop} closeCart={noop} />
      </div>
    );
  } else {
    body = (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-hidden p-4 flex flex-col justify-end gap-3">
          {msgs.map(({ m, anim }) => <Bubble key={m.id} m={m} anim={anim} />)}
          {thinking && (
            <div className="flex justify-start"><div className="flex items-center gap-2 px-3 py-2">
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-display tracking-wider">THINKING...</span>
            </div></div>
          )}
        </div>
        <div className="relative z-10 border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
            <span className="p-1 text-muted-foreground"><ImageIcon className="w-3.5 h-3.5" /></span>
            <span className="flex-1 text-xs text-muted-foreground truncate">Ask about products, upload a photo...</span>
            <span className="p-1.5 text-muted-foreground"><Send className="w-3.5 h-3.5" /></span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full w-full max-w-sm liquid-glass border-l border-white/[0.06] flex flex-col">
      <DrawerHead tab={tab} count={step >= 4 ? (step >= 5 ? 2 : 1) : 0} unread={false} />
      {body}
    </div>
  );
}

/**
 * SmartCart, six beats: 0 recommends from stock · 1 an outfit around one piece · 2 the budget ask ·
 * 3 a shopper's photo · 4 speaks up on an add · 5 the cart with SPRING20 applied.
 */
export function CartVisual({ step, t, thumb = false, framed = true }: { step: number; t: number; thumb?: boolean; framed?: boolean }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const narrow = size.w < 520;
  return (
    <div ref={ref} className={`relative w-full h-full overflow-hidden dynamic-bg ${framed ? 'rounded-xl border border-border' : ''}`}>
      {size.w > 0 && !narrow && (
        <div className="absolute inset-0">
          <StoreCanvas products={PAGE1} view={{ w: size.w - 384, h: size.h, top: 30, bottom: 30, pad: 30 }} cam={{ x: 0, y: 0, w: 1124, h: 1224 }} thumb={thumb} />
        </div>
      )}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div className={`absolute top-0 bottom-0 right-0 ${narrow ? 'left-0' : 'w-96'}`}>
        <Drawer step={step} t={t} thumb={thumb} />
      </div>
    </div>
  );
}
