// SmartShop, live. The real ProductTiles on a canvas the visitor can drag, zoom (pinch, + and −, or the wheel
// once the canvas is in hand), hover for the real glow and quick add, and click to open the product.
// A scene from the scroll story drives the camera until the visitor takes over; the hold lasts until the
// page scrolls again, so the two never fight. Detail markup copied from ProductView.tsx.
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { X, ShoppingBag, Layers, Ruler, Plus, Minus } from 'lucide-react';
import { ProductTile } from '@/components/storefront/ProductTile';
import { getSwatchStyle } from '@/lib/swatch-style';
import { useCart } from '@/contexts/CartContext';
import type { DemoProduct } from '@/data/demo-data';
import { EASE_CSS, useSize } from '../lib/core';
import { PX, PY, TH, isOut, posOf, type Box, type Open, type Scene } from '../lib/shop';
import { Fit, Layer } from './core';
import { StoreCats, WaitlistCard } from './shop';

const MAX = 2;
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];
type Tf = { x: number; y: number; s: number };

const fadeMask = (dir: 'to right' | 'to left') => `linear-gradient(${dir}, transparent 0%, black 40%)`;

/** ProductView.tsx detail, expanded, with working colourways, photos, sizes and add to cart. */
function Detail({ product, o, edit, thumb }: { product: DemoProduct; o: Open; edit: (p: Partial<Open>) => void; thumb: boolean }) {
  const { addItem } = useCart();
  const cws = product.colorways ?? [];
  const cw = cws[o.color];
  const imgs = product.images.filter(im => !im.colorway_id || im.colorway_id === cw?.id);
  const img = imgs[Math.min(o.img, imgs.length - 1)];
  const outSel = !!o.size && isOut(product, o.color, o.size);
  const add = () => {
    if (!o.size) return;
    if (outSel) { edit({ waitlist: true }); return; }
    const v = product.variants.find(x => x.options.size === o.size && (!x.colorway_id || x.colorway_id === cw?.id)) ?? product.variants[0];
    addItem({ productId: product.id, variantId: v.id, title: product.title, variantTitle: v.title, price: v.price ?? product.price, colorwayId: cw?.id, colorwayName: cw?.name });
  };
  return (
    <div className="flex flex-col items-center w-[460px] px-6">
      <div className="aspect-square bg-secondary/30 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden shrink-0 cursor-pointer" style={{ width: 380 }}
        onClick={() => imgs.length > 1 && edit({ img: (Math.min(o.img, imgs.length - 1) + 1) % imgs.length })}>
        {imgs.map(im => (
          <img key={im.medium} src={im.medium} alt={product.title} className="absolute inset-0 w-full h-full object-cover" draggable={false}
            style={{ opacity: im === img ? 1 : 0, transition: thumb ? 'none' : `opacity 400ms ${EASE_CSS}` }} />
        ))}
        {product.compare_at_price && (
          <div className="absolute top-3 left-3 bg-accent text-accent-foreground text-[10px] font-display font-bold px-2 py-1 rounded">SALE</div>
        )}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 z-20">
          {cws.map((c, ci) => (
            <button key={c.id} type="button" title={c.name} style={getSwatchStyle(c)} onClick={e => { e.stopPropagation(); edit({ color: ci, img: 0 }); }}
              className={`w-4 h-4 rounded-full border transition-all shrink-0 ${
                ci === o.color ? 'border-foreground/60 ring-1 ring-foreground/40 ring-offset-1 ring-offset-background/30' : 'border-foreground/30 hover:border-foreground/60'
              }`} />
          ))}
        </div>
        {imgs.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 flex h-12 z-10">
            {imgs.map((im, i) => (
              <button key={im.medium} type="button" aria-label={`Photo ${i + 1}`} className="flex-1 relative" onClick={e => { e.stopPropagation(); edit({ img: i }); }}>
                <span className={`absolute bottom-2 left-1 right-1 h-1 rounded-full transition-all duration-200 ${im === img ? 'bg-foreground/80' : 'bg-foreground/15'}`} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-baseline justify-center gap-3">
        <h2 className="font-display text-lg font-bold tracking-wide text-foreground whitespace-nowrap">{product.title}</h2>
        <span className="font-display text-base text-foreground">${product.price}</span>
        {product.compare_at_price && <span className="text-sm text-foreground/50 line-through">${product.compare_at_price}</span>}
        {outSel && <span className="text-destructive tracking-wider text-sm whitespace-nowrap">(OUT OF STOCK)</span>}
      </div>
      <div className="pt-4 pb-2 space-y-4 w-full">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {SIZES.map(sz => {
            const sel = sz === o.size, out = isOut(product, o.color, sz);
            return (
              <button key={sz} type="button" onClick={() => edit({ size: sz })} className={`h-9 px-4 text-sm font-display rounded-md border transition-all flex items-center justify-center ${
                sel ? (out ? 'border-dashed border-foreground bg-foreground text-background' : 'border-foreground bg-foreground text-background')
                  : out ? 'border-dashed border-foreground/40 text-foreground/60 hover:border-foreground/70' : 'border-foreground/30 text-foreground hover:border-foreground/60'
              }`}>{sz}</button>
            );
          })}
          <span className="h-9 px-3 text-[11px] font-display tracking-wider rounded-md border border-foreground/30 text-foreground/70 flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5" />SIZE CHART
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={add} className={`px-6 py-3 font-display font-semibold text-sm tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all ${o.size ? 'bg-foreground text-background hover:opacity-90' : 'bg-foreground/10 text-foreground/50 cursor-not-allowed'}`}>
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>{!o.size ? 'SELECT SIZE' : outSel ? 'JOIN THE WAITLIST' : 'ADD TO CART'}</span>
          </button>
          <span className="px-4 py-3 border border-foreground/30 text-foreground font-display font-semibold text-[11px] tracking-wider rounded-lg flex items-center justify-center gap-2">
            <Layers className="w-4 h-4 shrink-0" />BUILD A SET
          </span>
        </div>
      </div>
    </div>
  );
}

/** ProductView.tsx close button and the canvas zoom buttons, in the same glass square. */
const GLASS_BTN = 'p-2 rounded-xl backdrop-blur-md bg-foreground/[0.08] border border-foreground/[0.12] hover:bg-foreground/[0.14] transition-colors';

export function LiveShop({ products, cols = 5, scene, live = true, thumb = false, pills = false, controls = true, homeMax = 1.1, ms = 900, inset, className = '' }: {
  products: DemoProduct[]; cols?: number; scene: Scene; live?: boolean; thumb?: boolean; pills?: boolean; controls?: boolean; homeMax?: number; ms?: number;
  inset?: { top?: number; bottom?: number; pad?: number }; className?: string;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const { addItem } = useCart();
  const narrow = size.w < 560;
  const rows = Math.ceil(products.length / cols);
  const all: Box = { x: 0, y: 0, w: cols * PX - 6, h: (rows - 1) * PY + TH };
  const pad = inset?.pad ?? (narrow ? 14 : 36);
  const top = inset?.top ?? (pills ? (narrow ? 58 : 70) : pad);
  const bottom = inset?.bottom ?? pad;
  const fit = (b: Box, max: number): Tf => {
    const vw = Math.max(1, size.w - 2 * pad), vh = Math.max(1, size.h - top - bottom);
    const s = Math.max(0.06, Math.min(max, vw / b.w, vh / b.h));
    return { s, x: pad + (vw - b.w * s) / 2 - b.x * s, y: top + (vh - b.h * s) / 2 - b.y * s };
  };
  const homeS = fit(all, homeMax).s;
  const sceneTf = scene.cam === 'all' ? fit(all, scene.max ?? homeMax) : fit(scene.cam, scene.max ?? 1.4);
  const minS = homeS * 0.85;

  const [user, setUser] = useState<{ tf: Tf | null; open: Open | null } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const mode = useRef<'scene' | 'drag' | 'wheel'>('scene');
  const held = live && user !== null;
  const tf = held && user?.tf ? user.tf : sceneTf;
  const open = held ? user?.open ?? null : scene.open ?? null;
  if (!held) mode.current = 'scene';

  const st = useRef({ live, held, open: !!open, tf, sceneTf, minS, w: size.w, h: size.h });
  st.current = { live, held, open: !!open, tf, sceneTf, minS, w: size.w, h: size.h };
  const didDrag = useRef(false);

  // Leaving the chapter drops whatever the visitor was doing.
  useEffect(() => { if (!live) { setUser(null); setHover(null); } }, [live]);

  // The visitor's hold lasts until the page itself scrolls again.
  useEffect(() => {
    if (!held || thumb) return;
    const y0 = window.scrollY;
    const on = () => { if (Math.abs(window.scrollY - y0) > 6) { setUser(null); setHover(null); } };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [held, thumb]);

  const local = (cx: number, cy: number) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const k = r.width / el.offsetWidth || 1;
    return { x: (cx - r.left) / k, y: (cy - r.top) / k, k };
  };
  const zoomAt = (x: number, y: number, factor: number) => {
    mode.current = 'wheel';
    setUser(u => {
      const cur = u?.tf ?? st.current.sceneTf;
      const ns = Math.max(st.current.minS, Math.min(MAX, cur.s * factor));
      const q = ns / cur.s;
      return { open: u?.open ?? null, tf: { s: ns, x: x - (x - cur.x) * q, y: y - (y - cur.y) * q } };
    });
  };

  // Wheel: a pinch (ctrl + wheel) always zooms; a plain wheel zooms once the canvas is in hand, and hands the
  // scroll back to the page when zoomed all the way out or while a product is open.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const s = st.current;
      if (!s.live || s.open) return;
      if (!e.ctrlKey && !s.held) return;
      if (!e.ctrlKey && e.deltaY > 0 && s.tf.s <= s.minS * 1.01) return;
      e.preventDefault();
      const p = local(e.clientX, e.clientY);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  // Drag to pan, two fingers to pinch.
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gest = useRef<{ x: number; y: number; tf: Tf; k: number; d?: number; mx?: number; my?: number } | null>(null);
  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!live || thumb || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if ((e.target as HTMLElement).closest('button, a, [data-detail]')) return;
    const p = local(e.clientX, e.clientY);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const cur = st.current.tf;
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const m = local((a.x + b.x) / 2, (a.y + b.y) / 2);
      gest.current = { x: 0, y: 0, tf: cur, k: p.k, d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: m.x, my: m.y };
      didDrag.current = true;
      return;
    }
    if (ptrs.current.size > 2) return;
    didDrag.current = false;
    gest.current = { x: e.clientX, y: e.clientY, tf: cur, k: p.k };
    const move = (ev: PointerEvent) => {
      if (!ptrs.current.has(ev.pointerId)) return;
      ptrs.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const g = gest.current;
      if (!g) return;
      let next: Tf;
      if (ptrs.current.size >= 2 && g.d) {
        const [a, b] = [...ptrs.current.values()];
        const ns = Math.max(st.current.minS, Math.min(MAX, g.tf.s * Math.hypot(a.x - b.x, a.y - b.y) / g.d));
        const q = ns / g.tf.s;
        next = { s: ns, x: g.mx! - (g.mx! - g.tf.x) * q, y: g.my! - (g.my! - g.tf.y) * q };
      } else {
        const dx = (ev.clientX - g.x) / g.k, dy = (ev.clientY - g.y) / g.k;
        if (!didDrag.current && Math.hypot(dx, dy) < 4) return;
        didDrag.current = true;
        next = { s: g.tf.s, x: g.tf.x + dx, y: g.tf.y + dy };
      }
      mode.current = 'drag';
      setDragging(true);
      setHover(null);
      setUser(u => ({ open: u?.open ?? null, tf: next }));
    };
    const end = (ev: PointerEvent) => {
      ptrs.current.delete(ev.pointerId);
      if (ptrs.current.size === 1) {
        const [q] = [...ptrs.current.values()];
        gest.current = { x: q.x, y: q.y, tf: st.current.tf, k: gest.current?.k ?? 1 };
        return;
      }
      if (ptrs.current.size > 0) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      setDragging(false);
      gest.current = null;
      // A press without a drag also puts the canvas in hand, so the wheel zooms it next.
      if (!didDrag.current && ev.type === 'pointerup') setUser(u => u ?? { tf: null, open: null });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  const liveRef = useRef(live);
  liveRef.current = live;
  const openAt = (i: number) => setUser(u => ({ tf: u?.tf ?? null, open: { i, color: 0, size: null, img: 0, waitlist: false } }));
  const handlers = useMemo(() => products.map((p, i) => ({
    click: () => { if (liveRef.current && !didDrag.current) openAt(i); },
    enter: () => { if (liveRef.current && !gest.current) setHover(i); },
    leave: () => setHover(h => (h === i ? null : h)),
    add: (e: React.MouseEvent) => {
      e.stopPropagation();
      const v = p.variants.find(x => x.inventory_count > 0);
      if (v) addItem({ productId: p.id, variantId: v.id, title: p.title, variantTitle: v.title, price: v.price ?? p.price, colorwayId: p.colorways?.[0]?.id, colorwayName: p.colorways?.[0]?.name });
    },
    kit: (e: React.MouseEvent) => { e.stopPropagation(); if (liveRef.current) openAt(i); },
  })), [products, addItem]);

  const edit = (patch: Partial<Open>) => setUser(u => {
    const base = (live && u ? u.open : null) ?? open;
    return base ? { tf: u?.tf ?? null, open: { ...base, ...patch } } : u;
  });
  const close = () => setUser(u => ({ tf: u?.tf ?? null, open: null }));
  const go = (d: 1 | -1) => open && openAt((open.i + d + products.length) % products.length);
  const hovered = hover ?? (held ? -1 : scene.hovered ?? -1);
  const product = open ? products[open.i] : null;
  const n = products.length;
  const transition = thumb || dragging ? 'none' : mode.current === 'wheel' ? 'transform 180ms ease-out' : `transform ${held ? 900 : ms}ms ${EASE_CSS}`;

  return (
    <div ref={ref} onPointerDown={onPointerDown} data-live-shop
      className={`relative w-full h-full overflow-hidden dynamic-bg select-none ${className}`}
      style={{ touchAction: live ? 'pan-y' : undefined, cursor: live && !open ? (dragging ? 'grabbing' : 'grab') : undefined, pointerEvents: live ? undefined : 'none' }}>
      {size.w > 0 && (
        <>
          <div className="absolute left-0 top-0" data-canvas
            style={{ width: cols * PX, height: rows * PY, transformOrigin: '0 0', transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.s})`, transition }}>
            {products.map((p, i) => (
              <ProductTile key={p.id} product={p} scale={tf.s} isFocused={false} isHovered={hovered === i}
                onClick={handlers[i].click} onHoverStart={handlers[i].enter} onHoverEnd={handlers[i].leave}
                onQuickAdd={handlers[i].add} onQuickStyleKit={handlers[i].kit} positionOverride={posOf(i, cols)} />
            ))}
          </div>
          {pills && <div className="absolute top-3 md:top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none"><StoreCats active="ALL" small={narrow} /></div>}
          {controls && live && (
            <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10 flex flex-col gap-1.5" style={{ opacity: open ? 0 : 1, transition: `opacity 400ms ${EASE_CSS}` }}>
              <button type="button" aria-label="Zoom in" className={GLASS_BTN} onClick={() => zoomAt(size.w / 2, size.h / 2, 1.25)}><Plus className="w-4 h-4 text-foreground/60" /></button>
              <button type="button" aria-label="Zoom out" className={GLASS_BTN} onClick={() => zoomAt(size.w / 2, size.h / 2, 0.8)}><Minus className="w-4 h-4 text-foreground/60" /></button>
            </div>
          )}
          <Layer on={!!open} thumb={thumb} className="z-20">
            {product && open && (
              <div data-detail className="absolute inset-0">
                <div className="absolute inset-0 bg-background" onClick={live ? close : undefined} />
                {!narrow && (
                  <>
                    <button type="button" aria-label="Previous" onClick={() => go(-1)} className="absolute top-1/2 -translate-y-1/2 left-0 bg-no-repeat" style={{ width: '18%', height: '50%', opacity: 0.7, filter: 'blur(1px)', backgroundImage: `url(${products[(open.i - 1 + n) % n].images[0].medium})`, backgroundSize: 'auto 100%', backgroundPosition: 'right center', maskImage: fadeMask('to right'), WebkitMaskImage: fadeMask('to right') }} />
                    <button type="button" aria-label="Next" onClick={() => go(1)} className="absolute top-1/2 -translate-y-1/2 right-0 bg-no-repeat" style={{ width: '18%', height: '50%', opacity: 0.7, filter: 'blur(1px)', backgroundImage: `url(${products[(open.i + 1) % n].images[0].medium})`, backgroundSize: 'auto 100%', backgroundPosition: 'left center', maskImage: fadeMask('to left'), WebkitMaskImage: fadeMask('to left') }} />
                  </>
                )}
                <Fit w={460} h={660} className="absolute inset-x-[16%] inset-y-0 py-3 pointer-events-none">
                  <div className="relative w-[460px] h-[660px] flex items-center justify-center pointer-events-auto">
                    <Detail product={product} o={open} edit={edit} thumb={thumb} />
                  </div>
                </Fit>
                <button type="button" aria-label="Close" onClick={close} className={`absolute top-3 right-3 md:top-4 md:right-4 z-10 ${GLASS_BTN}`}><X className="w-5 h-5 text-foreground/60" /></button>
              </div>
            )}
          </Layer>
          <Layer on={!!open?.waitlist} thumb={thumb} className="z-30 bg-background/70 backdrop-blur-sm">
            {product && open && (
              <Fit w={448} h={600} className="absolute inset-0 p-4">
                <div data-detail className="w-[448px] h-[600px] flex items-center" onClick={e => { if (e.target === e.currentTarget) edit({ waitlist: false }); }}>
                  <WaitlistCard product={product} size={open.size ?? 'L'} colorIdx={open.color} onClose={() => edit({ waitlist: false })} />
                </div>
              </Fit>
            )}
          </Layer>
        </>
      )}
    </div>
  );
}
