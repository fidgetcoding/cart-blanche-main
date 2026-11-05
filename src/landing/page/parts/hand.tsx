// The System section's hand: SmartShop, SmartCart and SmartPortal fanned like a hand of cards held from the
// bottom, SmartCart upright in front, each name flat under its card. The cards are the real landing pieces:
// StoreCanvas under the store bar, the SmartCart Drawer (on a solid backing, so nothing smears through its
// glass, and no store dimming), and the portal Dashboard. On a phone the hand becomes a swipe: one card
// centred and upright, its neighbours peeking and tilting the way the fan does.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { LayoutDashboard, ShoppingBag } from 'lucide-react';
import { EASE_CSS, PAGE1, useSize } from '../lib/core';
import { StoreCanvas } from './shop';
import { Drawer } from './cart';
import { PortalFrame } from './portal';

const NAMES = ['SmartShop', 'SmartCart', 'SmartPortal'] as const;
type Part = 0 | 1 | 2;

// Desktop fan, in px: card size, the side cards' offset, tilt and drop, and the room under it for the names.
// PAD is how far a tilted card's top corner swings past its own edge, so the hand's box holds the whole fan.
const FAN = { w: 364, h: 478, spread: 300, tilt: 8, drop: 26, names: 64 };
const PAD = Math.ceil(FAN.h * Math.sin((FAN.tilt * Math.PI) / 180)) + 14;
const FAN_W = FAN.w + 2 * FAN.spread + 2 * PAD, FAN_H = FAN.h + FAN.drop + FAN.names;
const centreOf = (i: number) => PAD + FAN.spread + (i - 1) * FAN.spread;

// Motion lives in these classes only, so reduced motion (and a still thumb) simply leaves them off.
const HAND_CSS = `.cbh-card{transform:translate(var(--cbh-x,0px),calc(var(--cbh-y,0px) + var(--cbh-lift,0px))) rotate(var(--cbh-r,0deg));transform-origin:50% 100%}
.cbh-move{transition:transform var(--cbh-t,400ms) ${EASE_CSS},opacity 700ms ${EASE_CSS}}
@media (hover:hover) and (pointer:fine){.cbh-lift:hover{--cbh-lift:-14px}}
@media (prefers-reduced-motion:reduce){.cbh-move{transition:none}.cbh-lift:hover{--cbh-lift:0px}}`;

function useReducedMotion() {
  const q = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m?.addEventListener) return;
    const on = () => setReduced(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** True once the element has come into view (once, never again). Still = already there. */
function useSeen<T extends HTMLElement>(still: boolean): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (still || seen) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [still, seen]);
  return [ref, still || seen];
}

/** Draws a fixed-size design to cover its box; `fx` picks which part stays in view when it's cropped sideways. */
function Cover({ w, h, fx = 0.5, children }: { w: number; h: number; fx?: number; children: ReactNode }) {
  const [ref, box] = useSize<HTMLDivElement>();
  const s = box.w && box.h ? Math.max(box.w / w, box.h / h) : 1;
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div className="absolute" style={{ left: (box.w - w * s) * fx, top: 0, width: w, height: h, transform: `scale(${s})`, transformOrigin: '0 0', opacity: box.w ? 1 : 0 }}>
        {children}
      </div>
    </div>
  );
}

/** The storefront's top bar (SpatialCanvas.tsx): wordmark, Smart Portal icon, the cart button. */
function StoreTop() {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 liquid-glass flex items-center justify-between px-6 py-5">
      <span className="font-display font-semibold tracking-[0.2em] uppercase text-foreground" style={{ fontSize: '11px' }}>Cart Blanche</span>
      <div className="flex items-center gap-3">
        <span className="p-2"><LayoutDashboard className="w-4 h-4 text-foreground/70" /></span>
        <span className="relative p-2.5 rounded-xl backdrop-blur-md shadow-lg bg-foreground/10 border border-foreground/10"><ShoppingBag className="w-5 h-5 text-foreground" /></span>
      </div>
    </div>
  );
}

/** One card's screen. Desktop draws screen-size designs; the phone draws phone-size ones (the portal's own phone layout). */
function Screen({ part, phone }: { part: Part; phone: boolean }) {
  if (part === 0) {
    const w = phone ? 390 : 720, h = phone ? 511 : 945, cols = phone ? 2 : 3, top = 92;
    const camW = cols * 226 - 6;
    return (
      <Cover w={w} h={h}>
        <div className="relative dynamic-bg overflow-hidden" style={{ width: w, height: h }}>
          <StoreCanvas products={PAGE1} view={{ w, h, top, bottom: 0, pad: 28 }} cam={{ x: 0, y: 0, w: camW, h: (camW * (h - top)) / (w - 56) }} maxScale={2} thumb />
          <StoreTop />
        </div>
      </Cover>
    );
  }
  if (part === 1) {
    return (
      <Cover w={384} h={504}>
        <div className="bg-background" style={{ width: 384, height: 504 }}><Drawer step={1} t={1} thumb /></div>
      </Cover>
    );
  }
  if (phone) {
    return <Cover w={390} h={511}><div style={{ width: 390, height: 511 }}><PortalFrame route="dashboard" pages={['dashboard']} thumb compact="page" /></div></Cover>;
  }
  return <Cover w={1440} h={900}><PortalFrame route="dashboard" pages={['dashboard']} thumb /></Cover>;
}

/** One card. It positions its screen, so it is `relative` unless the caller places it `absolute`. */
function Card({ part, phone, className = '', style }: { part: Part; phone: boolean; className?: string; style?: CSSProperties }) {
  return (
    <div data-preview={NAMES[part]} className={`${/\babsolute\b/.test(className) ? '' : 'relative'} rounded-xl border border-border overflow-hidden shadow-2xl ${part === 2 ? '' : 'bg-card'} ${className}`}
      style={{ ...(part === 2 ? { background: 'hsl(0 0% 5%)' } : {}), ...style }}>
      <Screen part={part} phone={phone} />
    </div>
  );
}

const vars = (v: Record<string, string>) => v as CSSProperties;

/** Desktop: the fan, scaled down to fit when the column is narrower than the hand. */
function Fan({ still }: { still: boolean }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, shown] = useSeen<HTMLDivElement>(still);
  const [settled, setSettled] = useState(still);
  useEffect(() => {
    if (!shown || settled) return;
    const id = setTimeout(() => setSettled(true), 1300);
    return () => clearTimeout(id);
  }, [shown, settled]);
  const s = size.w ? Math.min(1, size.w / FAN_W) : 1;
  const move = still ? '' : 'cbh-move';
  return (
    <div ref={box} className="w-full overflow-x-clip" style={{ height: FAN_H * s }}>
      <div ref={ref} className={`relative ${s < 1 ? '' : 'mx-auto'}`} style={{ width: FAN_W, height: FAN_H, transform: s < 1 ? `scale(${s})` : undefined, transformOrigin: '0 0' }}>
        {([0, 2, 1] as Part[]).map(i => {
          const d = i - 1;
          const rest = { '--cbh-x': '0px', '--cbh-y': `${Math.abs(d) * FAN.drop}px`, '--cbh-r': `${d * FAN.tilt}deg` };
          const dealt = { '--cbh-x': `${-d * FAN.spread * 0.85}px`, '--cbh-y': '28px', '--cbh-r': '0deg' };
          return (
            <Card key={i} part={i} phone={false} className={`absolute top-0 cbh-card ${move} ${still ? '' : 'cbh-lift'}`}
              style={{ left: centreOf(i), width: FAN.w, height: FAN.h, opacity: shown ? 1 : 0, transitionDelay: settled ? undefined : `${Math.abs(d) * 90}ms`,
                ...vars({ ...(shown ? rest : dealt), '--cbh-t': settled ? '400ms' : '1000ms' }) }} />
          );
        })}
        {NAMES.map((n, i) => (
          <p key={n} className={`absolute bottom-0 -translate-x-1/2 font-display font-bold text-[28px] leading-none whitespace-nowrap ${move}`}
            style={{ left: centreOf(i) + FAN.w / 2, opacity: shown ? 1 : 0, transitionDelay: settled ? undefined : '350ms' }}>
            {n}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Phone: a swipe through the three, SmartCart centred first. The centred card stands upright and its neighbours
 *  peek in at the sides, tilted and dropped like the fan; they straighten as they come to the centre. The three
 *  names sit in one row under the cards, the centred one lit; tapping a name brings its card to the centre. */
function Swipe({ still }: { still: boolean }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, shown] = useSeen<HTMLDivElement>(still);
  const width = size.w || 358;
  const cw = Math.min(256, Math.round(width * 0.68)), ch = Math.round(cw * 1.31), gap = 14, pitch = cw + gap;
  const side = Math.max(0, (width - cw) / 2);
  const [pos, setPos] = useState(1);
  const centred = useRef(false);
  const raf = useRef(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !size.w || centred.current) return;
    el.scrollLeft = pitch;
    centred.current = true;
  }, [box, size.w, pitch]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const onScroll = () => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      if (box.current) setPos(box.current.scrollLeft / pitch);
    });
  };
  const go = (i: number) => {
    const el = box.current;
    if (!el) return;
    if (el.scrollTo) el.scrollTo({ left: i * pitch, behavior: still ? 'auto' : 'smooth' });
    else el.scrollLeft = i * pitch;
  };
  const active = Math.round(pos);
  return (
    <div ref={ref} className={still ? '' : 'cbh-move'} style={{ opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(12px)' }}>
      <div ref={box} onScroll={onScroll} className="w-full overflow-x-auto no-scrollbar snap-x snap-mandatory">
        <div className="flex pt-4 pb-8" style={{ paddingLeft: side, paddingRight: side, gap, width: 'max-content' }}>
          {NAMES.map((n, i) => {
            const d = Math.max(-1, Math.min(1, i - pos));
            return (
              <div key={n} className="snap-center shrink-0" style={{ width: cw }}>
                <Card part={i as Part} phone style={{ width: cw, height: ch, transformOrigin: '50% 100%', transform: still ? undefined : `translateY(${Math.abs(d) * 12}px) rotate(${d * 6}deg)` }} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-center gap-5 mt-1">
        {NAMES.map((n, i) => (
          <button key={n} type="button" onClick={() => go(i)} aria-current={active === i ? 'true' : undefined}
            className={`font-display font-bold text-[17px] leading-none whitespace-nowrap py-1 ${still ? '' : 'transition-colors duration-300'} ${active === i ? 'text-foreground' : 'text-foreground/35'}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/** SmartShop, SmartCart and SmartPortal as a hand of cards (desktop) or a swipe (phone). No head: the section keeps its own. */
export function SystemHand({ narrow, thumb = false }: { narrow: boolean; thumb?: boolean }) {
  const still = useReducedMotion() || thumb;
  return (
    <div data-system-hand="">
      <style>{HAND_CSS}</style>
      {narrow ? <Swipe still={still} /> : <Fan still={still} />}
    </div>
  );
}
