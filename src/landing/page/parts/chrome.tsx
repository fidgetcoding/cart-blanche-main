// Landing chrome. Every class string is copied from the app file named above it. Copy is copy.ts, word for word.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Github, ShoppingBag } from 'lucide-react';
import { COPY } from '../../copy';
import { EASE_CSS, lessMotion, scrollBehavior } from '../lib/core';
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

// The close's flight (EndCta): out to the middle, back home, and the cross-fade as the bar's button hands over.
const FLY_MS = 700, HOME_MS = 600;
const SWAP_MS = 160;

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
    r.scrollTo({ left: Math.max(0, x - r.clientWidth / 2 + b.clientWidth / 2), behavior: scrollBehavior() });
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

/** The bar's demo button: ProductView.tsx ADD TO CART (enabled), sized to the cart button's height. `away`: it has
 *  lifted out to the middle of the screen (EndCta), so its place in the bar stands empty. */
function BarCta({ away = false }: { away?: boolean }) {
  return (
    <>
      <style>{PULSE_CSS}</style>
      <a href={COPY.demo.href} aria-hidden={away || undefined} tabIndex={away ? -1 : undefined} style={away ? { opacity: 0, pointerEvents: 'none', transition: `opacity ${SWAP_MS}ms ${EASE_CSS}` } : undefined}
        className="signup-cta cbe-pulse flex-shrink-0 h-9 md:h-10 px-3 md:px-4 font-display font-semibold text-[10px] md:text-xs tracking-wider uppercase rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition-all bg-foreground text-background hover:opacity-90">
        <ShoppingBag className="hidden md:block w-4 h-4 shrink-0" />
        <span>{COPY.demo.cta}</span>
      </a>
    </>
  );
}

/**
 * The storefront top bar (SpatialCanvas.tsx) as the page header, 58px under md and 82px from md: the
 * wordmark, the pills as the chapter nav, and an always-there Enter the demo button where the store has
 * its SmartPortal icon and cart button.
 */
export function StoreBar({ active, onPick, away = false }: { active: string; onPick: (id: string) => void; away?: boolean }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 liquid-glass flex items-center justify-between px-4 md:px-6 py-3 md:py-5">
      <Wordmark />
      <nav className="hidden xl:flex absolute left-1/2 -translate-x-1/2 items-center gap-3">
        <PillBar active={active} onPick={onPick} />
      </nav>
      <div className="xl:hidden flex-1 min-w-0 flex"><CompactPills active={active} onPick={onPick} /></div>
      <BarCta away={away} />
    </header>
  );
}

/** StatCard label (AdminDashboard.tsx). */
export function Micro({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[10px] font-display tracking-[0.2em] uppercase text-muted-foreground ${className}`}>{children}</p>;
}

/** Footer in the hint bar's type, the last thing on the page. Its bottom padding keeps it clear of the fixed hint bar;
 *  it sits over the closing veil (EndCta), so the credit stays readable. */
export function SiteFooter({ className = '' }: { className?: string }) {
  const f = COPY.footer;
  return (
    <footer className={`relative z-[46] flex flex-col md:flex-row md:items-end justify-between gap-2 px-4 md:px-6 pt-4 md:pt-5 pb-12 md:pb-16 tracking-wider uppercase text-muted-foreground ${className}`} style={{ fontSize: '10px', fontFamily: 'var(--font-body)' }}>
      <p>{f.credit}</p>
      <a href={f.codeHref} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
        <Github aria-hidden="true" className="w-3 h-3 shrink-0" />{f.code}
      </a>
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

// The scroll cue's slow running line; still under reduced motion.
const CUE_CSS = `@keyframes cbe-cue{0%{transform:translateY(-100%)}55%,100%{transform:translateY(100%)}}
.cbe-cue{animation:cbe-cue 2.6s ${EASE_CSS} infinite}
@media (prefers-reduced-motion: reduce){.cbe-cue{animation:none}}`;

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
          <span className={`absolute inset-0 bg-foreground/70 ${thumb ? '' : 'cbe-cue'}`} />
        </span>
        <span>{COPY.hero.scrollCue}</span>
      </div>
      <div className="w-[132px] md:w-[180px]" style={fade(!top)} data-progress>
        <PhotoBars n={FEATURES.length} lit={i => i <= reached} />
      </div>
    </div>
  );
}


/**
 * The close. At the bottom of the page the bar's Enter the demo lifts out of the bar and settles, larger, in the
 * middle of the screen while a veil fades the page behind it; scrolling back up flies it home. One button does the
 * flight: it starts drawn exactly over the bar's (FLIP), and the bar's own button hides for as long as it's out.
 */
export function EndCta({ on, onAway }: { on: boolean; onAway: (away: boolean) => void }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [shown, setShown] = useState(false);
  const shownRef = useRef(false);
  const awayRef = useRef(onAway);
  awayRef.current = onAway;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const still = lessMotion();
    // Where the bar's button is, as a transform of this one from the middle of the screen.
    const home = () => {
      const bar = document.querySelector<HTMLElement>('header a.signup-cta')?.getBoundingClientRect();
      if (!bar || !el.offsetHeight) return 'none';
      const dx = bar.left + bar.width / 2 - window.innerWidth / 2, dy = bar.top + bar.height / 2 - window.innerHeight / 2;
      return `translate(${dx}px, ${dy}px) scale(${bar.height / el.offsetHeight})`;
    };
    if (on) {
      el.style.transition = 'none';
      el.style.transform = still ? 'none' : home();
      el.style.opacity = '0';
      shownRef.current = true;
      setShown(true);
      awayRef.current(true);
      let r2 = 0;
      // Two frames: the start pose paints over the bar's button, then the flight runs, fading in as the bar's fades out.
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => {
        el.style.transition = still ? `opacity 300ms ${EASE_CSS}` : `transform ${FLY_MS}ms ${EASE_CSS}, opacity ${SWAP_MS}ms ${EASE_CSS}`;
        el.style.transform = 'none';
        el.style.opacity = '1';
      }); });
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    }
    if (!shownRef.current) return;
    const ms = still ? 250 : HOME_MS;
    // Home again: it lands on the bar's button and fades out as that one fades back in.
    el.style.transition = still ? `opacity ${ms}ms ${EASE_CSS}` : `transform ${ms}ms ${EASE_CSS}, opacity ${SWAP_MS}ms ${EASE_CSS} ${ms - SWAP_MS}ms`;
    el.style.opacity = '0';
    if (!still) el.style.transform = home();
    const back = setTimeout(() => awayRef.current(false), ms - SWAP_MS);
    const gone = setTimeout(() => { shownRef.current = false; setShown(false); }, ms + 20);
    return () => { clearTimeout(back); clearTimeout(gone); };
  }, [on]);
  return (
    <>
      <div aria-hidden data-end-veil className="fixed inset-0 z-[45] bg-background"
        style={{ opacity: on ? 0.86 : 0, pointerEvents: on ? 'auto' : 'none', transition: `opacity 600ms ${EASE_CSS}` }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <a ref={ref} href={COPY.demo.href} data-end-cta aria-hidden={!on || undefined} tabIndex={on ? undefined : -1}
          style={{ visibility: shown ? 'visible' : 'hidden' }}
          className="signup-cta cbe-pulse pointer-events-auto h-14 px-8 font-display font-semibold text-sm tracking-wider uppercase rounded-lg flex items-center justify-center gap-3 whitespace-nowrap bg-foreground text-background hover:opacity-90">
          <ShoppingBag className="w-5 h-5 shrink-0" />
          <span>{COPY.demo.cta}</span>
        </a>
      </div>
    </>
  );
}
