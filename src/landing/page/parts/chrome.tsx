// Landing chrome. Every class string is copied from the app file named above it. Copy is copy.ts, word for word.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ShoppingBag } from 'lucide-react';
import { COPY } from '../../copy';
import { EASE_CSS } from '../lib/core';
import { FEATURES, NAV } from '../lib/features';

/** The wordmark from SpatialCanvas.tsx, alone: the landing has no DemoStoreLabel under it. */
function Wordmark() {
  return (
    <div className="relative flex items-center gap-2 flex-shrink-0">
      <span className="font-display font-semibold tracking-[0.2em] uppercase text-foreground" style={{ fontSize: '11px' }}>Cart Blanche</span>
    </div>
  );
}

// A soft ring breathing out from a demo button in the foreground token, every 2.8s. Stops on hover and focus,
// and under reduced motion.
const PULSE_CSS = `@keyframes cbe-pulse{0%{box-shadow:0 0 0 0 hsl(var(--foreground) / .3)}72%,100%{box-shadow:0 0 0 11px hsl(var(--foreground) / 0)}}
.cbe-pulse{animation:cbe-pulse 2.8s cubic-bezier(.25,.1,.25,1) infinite}
.cbe-pulse:hover,.cbe-pulse:focus-visible{animation:none}
@media (prefers-reduced-motion: reduce){.cbe-pulse{animation:none}}`;

/** Desktop category pill bar (SpatialCanvas.tsx). Used as the chapter nav and, in some options, the tag row. */
export function PillBar({ active, onPick, items = NAV, className = '' }: { active: string; onPick?: (id: string) => void; items?: readonly { id: string; label: string }[]; className?: string }) {
  return (
    <div className={`flex items-center gap-1 bg-foreground/[0.06] backdrop-blur-xl border border-foreground/[0.08] rounded-lg px-1.5 py-1 shadow-[0_4px_30px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}>
      {items.map(n => (
        <button key={n.id} type="button" onClick={() => onPick?.(n.id)} style={{ fontSize: 'var(--font-size-body, 10px)', fontFamily: 'var(--font-body)' }}
          className={`tracking-[0.15em] uppercase transition-all duration-300 rounded-md px-4 py-1.5 whitespace-nowrap flex-shrink-0 ${
            active === n.id
              ? 'bg-foreground/[0.12] text-foreground font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_3px_rgba(0,0,0,0.2)]'
              : 'text-muted-foreground hover:text-foreground/80 hover:bg-foreground/[0.05]'
          }`}>
          {n.label.replace(/ /g, ' ')}
        </button>
      ))}
    </div>
  );
}

/** Compact scrollable pills (SpatialCanvas.tsx, narrow header). Keeps the lit pill in view. */
function CompactPills({ active, onPick }: { active: string; onPick: (id: string) => void }) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const r = row.current;
    const b = r?.querySelector<HTMLElement>(`[data-pill="${active}"]`);
    if (!r || !b) return;
    const x = r.scrollLeft + b.getBoundingClientRect().left - r.getBoundingClientRect().left;
    r.scrollTo({ left: Math.max(0, x - r.clientWidth / 2 + b.clientWidth / 2), behavior: 'smooth' });
  }, [active]);
  return (
    <div ref={row} className="flex-1 mx-3 overflow-x-auto no-scrollbar min-w-0">
      <div className="flex items-center gap-1.5 w-max">
        {NAV.map(n => (
          <button key={n.id} type="button" data-pill={n.id} onClick={() => onPick(n.id)} style={{ fontSize: 'var(--font-size-body, 10px)', fontFamily: 'var(--font-body)' }}
            className={`text-[10px] tracking-[0.12em] uppercase transition-all duration-200 rounded-md px-3 py-1.5 whitespace-nowrap flex-shrink-0 ${
              active === n.id ? 'bg-foreground/[0.15] text-foreground font-medium' : 'text-muted-foreground'
            }`}>
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The bar's demo button: ProductView.tsx ADD TO CART (enabled), sized to the cart button's height. */
function BarCta() {
  return (
    <>
      <style>{PULSE_CSS}</style>
      <a href={COPY.demo.href} className="signup-cta cbe-pulse flex-shrink-0 h-9 md:h-10 px-3 md:px-4 font-display font-semibold text-[10px] md:text-xs tracking-wider uppercase rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition-all bg-foreground text-background hover:opacity-90">
        <ShoppingBag className="hidden md:block w-4 h-4 shrink-0" />
        <span>{COPY.demo.cta}</span>
      </a>
    </>
  );
}

/**
 * The storefront top bar (SpatialCanvas.tsx) as the page header, 58px under md and 82px from md: the
 * wordmark, the pills as the chapter nav, and an always-there Enter the demo button where the store has
 * its Smart Portal icon and cart button.
 */
export function StoreBar({ active, onPick }: { active: string; onPick: (id: string) => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 liquid-glass flex items-center justify-between px-4 md:px-6 py-3 md:py-5">
      <Wordmark />
      <nav className="hidden xl:flex absolute left-1/2 -translate-x-1/2 items-center gap-3">
        <PillBar active={active} onPick={onPick} />
      </nav>
      <div className="xl:hidden flex-1 min-w-0 flex"><CompactPills active={active} onPick={onPick} /></div>
      <BarCta />
    </header>
  );
}

/** StatCard label (AdminDashboard.tsx). */
export function Micro({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[10px] font-display tracking-[0.2em] uppercase text-muted-foreground ${className}`}>{children}</p>;
}

/** The primary CTA: ProductView.tsx ADD TO CART (enabled), as a link into the demo. */
export function Cta({ className = '', pulse = false }: { className?: string; pulse?: boolean }) {
  return (
    <>
      {pulse && <style>{PULSE_CSS}</style>}
      <a href={COPY.demo.href} className={`signup-cta ${pulse ? 'cbe-pulse' : ''} w-fit px-6 py-3 font-display font-semibold text-sm tracking-wider uppercase rounded-lg flex items-center justify-center gap-2 transition-all bg-foreground text-background hover:opacity-90 ${className}`}>
        <ShoppingBag className="w-4 h-4 shrink-0" />
        <span>{COPY.demo.cta}</span>
      </a>
    </>
  );
}

/** Under-CTA line, in CartDrawer.tsx "Continue Shopping" type. */
export function Under({ className = '' }: { className?: string }) {
  return <p className={`text-xs text-muted-foreground ${className}`}>{COPY.demo.under}</p>;
}

/** Footer in the hint bar's type. */
export function SiteFooter({ className = '' }: { className?: string }) {
  const f = COPY.close.footer;
  return (
    <footer className={`flex flex-col md:flex-row md:items-end justify-between gap-2 px-4 md:px-6 py-4 md:py-5 tracking-wider uppercase text-muted-foreground ${className}`} style={{ fontSize: '10px', fontFamily: 'var(--font-body)' }}>
      <p>{f.credit}</p>
      <a href={f.codeHref} className="hover:text-foreground transition-colors">{f.code}</a>
    </footer>
  );
}

/** ProductView.tsx photo bars: one bar per item, the lit ones bright. */
export function PhotoBars({ n, lit, className = '', bar = 'h-1' }: { n: number; lit: (i: number) => boolean; className?: string; bar?: string }) {
  return (
    <div className={`flex gap-1.5 ${className}`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`flex-1 ${bar} rounded-full transition-colors duration-500 ${lit(i) ? 'bg-foreground/80' : 'bg-foreground/15'}`} />
      ))}
    </div>
  );
}

const CUE_CSS = `@keyframes cbe-cue{0%{transform:translateY(-100%)}55%,100%{transform:translateY(100%)}}`;

/**
 * The page's own hint bar, fixed to the bottom like the SpatialCanvas.tsx footer. At the top it carries
 * the scroll cue with a slow line; once scrolling starts the cue fades and the photo bars show where you are.
 */
export function PageHint({ progress, thumb }: { progress: (number | null); thumb: boolean }) {
  const [top, setTop] = useState(true);
  useEffect(() => {
    if (thumb) return;
    const on = () => setTop(window.scrollY < 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [thumb]);
  const fade = (on: boolean) => ({ opacity: on ? 1 : 0, transition: thumb ? 'none' : `opacity 600ms ${EASE_CSS}` });
  const reached = progress === null ? -1 : progress;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none flex items-end justify-between px-4 md:px-6 py-3 md:py-5">
      <style>{CUE_CSS}</style>
      <div className="flex items-center gap-3 tracking-wider uppercase text-muted-foreground" style={{ fontSize: '10px', fontFamily: 'var(--font-body)', ...fade(top) }}>
        <span className="relative block w-px h-6 overflow-hidden bg-foreground/15">
          <span className="absolute inset-0 bg-foreground/70" style={{ animation: thumb ? 'none' : `cbe-cue 2.6s ${EASE_CSS} infinite` }} />
        </span>
        <span>{COPY.hero.scrollCue}</span>
      </div>
      <div className="w-[132px] md:w-[180px]" style={fade(!top)} data-progress>
        <PhotoBars n={FEATURES.length} lit={i => i <= reached} />
      </div>
    </div>
  );
}
