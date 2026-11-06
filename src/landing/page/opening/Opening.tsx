// The opening: the carousel (round 6, G1). The store's twenty pieces ride one great ring over a glossy white floor
// round the headline; the cursor tilts it, a drag throws it, and the scroll dives through the words into the ring,
// which unrolls into the SmartShop grid before the story comes up. The section is taller than the screen: its frame
// stays pinned while the scroll flies the camera (engine.ts reads the scroll). Inside the frame, bottom to top: the
// planes behind the headline (a 2D canvas), the headline itself (real text, its words rising in on load), the
// planes in front of it (the WebGL canvas), and the hovered garment's name and price.
// Without WebGL it is a still frame: the ring laid out flat round the headline. Under reduced motion the 3D ring
// renders once and holds.
import { Fragment, memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { COPY } from '../../copy';
import { lessMotion } from '../lib/core';
import { useAutoIntro } from '../lib/intro';
import { carousel } from './carousel';
import { createEngine } from './engine';
import { PRODUCTS } from './looks';
import { TAU } from './math';
import { hasWebGL, loadThree } from './three';

// three.js starts loading with the page, alongside React's first paint.
if (typeof window !== 'undefined' && hasWebGL()) void loadThree();

/** Scroll (vh) the flight takes, then how long (vh) the store holds pinned before the story comes up. */
const RUN = 190, HOLD = 22;
/** How long (ms) the show plays once the garments are in, before the page glides itself to the store. */
const SHOW_MS = 2900;
/** Where the self-scroll rests: the store, landed. */
const GRID = 'carousel-grid';

const WORDS = COPY.hero.headline.split(' ');
const lines = (narrow: boolean) => (narrow ? [2, 2, 3, 3] : [4, 6]);
const head = (narrow: boolean): { className: string; style: CSSProperties } => narrow
  ? { className: 'left-0 right-0 top-[19%] px-4 text-center', style: { fontSize: 'min(44px, 11.4vw)' } }
  : { className: 'left-0 right-0 top-[41%] -translate-y-1/2 px-6 text-center', style: { fontSize: 'min(94px, 6.5vw)' } };
/** A white studio: the page's paper with a soft horizon where the floor turns. */
const studio = (narrow: boolean): CSSProperties => {
  const h = narrow ? 70 : 62;
  return { background: `linear-gradient(180deg, rgba(0,0,0,0) ${h - 8}%, rgba(20,20,30,0.03) ${h}%, rgba(0,0,0,0) ${h + 16}%)` };
};

const RISE = `
.g-w{display:inline-block;overflow:hidden;vertical-align:top;padding:0 0.04em 0.14em;margin:0 -0.04em -0.14em}
.g-w>span{display:inline-block;transform:translate3d(0,108%,0);animation:g-rise 1150ms cubic-bezier(0.16,1,0.3,1) both}
@keyframes g-rise{to{transform:none}}
@media (prefers-reduced-motion: reduce){.g-w>span{animation:none;transform:none}}
`;

function Headline({ narrow, still }: { narrow: boolean; still: boolean }) {
  let n = 0;
  const ls = lines(narrow);
  return (
    <h1 className="font-display font-bold text-foreground" style={{ letterSpacing: '-0.035em', lineHeight: 0.94 }}>
      {ls.map((count, li) => {
        const words = WORDS.slice(n, n + count);
        const first = n;
        n += count;
        // The engine's --part (0..1) parts the lines as the camera flies through them: top half up, bottom half down.
        const dir = li < ls.length / 2 ? -1 : 1;
        return (
          <Fragment key={li}>
            {li > 0 && ' '}
            <span className="block whitespace-nowrap" style={{ transform: `translate3d(0, calc(var(--part, 0) * ${dir * 46}vh), 0)` }}>
              {words.map((w, wi) => (
                <Fragment key={w}>
                  {wi > 0 && ' '}
                  <span className="g-w"><span style={still ? { animation: 'none', transform: 'none' } : { animationDelay: `${140 + (first + wi) * 55}ms` }}>{w}</span></span>
                </Fragment>
              ))}
            </span>
          </Fragment>
        );
      })}
    </h1>
  );
}

/** No WebGL: the ring laid out flat, the back of it behind the headline and the front sweeping below. */
function FlatRing({ narrow }: { narrow: boolean }) {
  return (
    <div aria-hidden data-flat-ring className="absolute inset-0 pointer-events-none">
      {PRODUCTS.map((p, i) => {
        const th = 0.3 + (i * TAU) / PRODUCTS.length;
        const c = Math.cos(th);
        const near = (c + 1) / 2;
        const size = (narrow ? 22 : 11) * (0.55 + 0.45 * near);
        return (
          <img key={p.id} src={p.thumb} alt="" loading="lazy" decoding="async" draggable={false}
            className="absolute object-contain"
            style={{
              left: `${50 + Math.sin(th) * (narrow ? 40 : 42)}%`, top: `${(narrow ? 66 : 60) + c * (narrow ? 12 : 16)}%`,
              width: `${size}vw`, height: `${size}vw`, transform: 'translate(-50%, -50%)',
              zIndex: c > 0 ? 3 : 1, opacity: 0.55 + 0.45 * near,
            }} />
        );
      })}
    </div>
  );
}

export const Opening = memo(function Opening({ narrow }: { narrow: boolean }) {
  const sec = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const flat = failed || !hasWebGL();
  const calm = lessMotion();
  // The flight needs the 3D scene and motion; without either the opening is one still screen.
  const still = calm || flat;

  // The page's own self-scroll (lib/intro.ts), run from here, once. With the 3D scene it waits for the show to
  // have played (three.js and the textures arrive over the network, so a fixed delay could glide away before the
  // garments are in), then rests on the landed store before #story. A touch before then keeps the page for good.
  const [shown, setShown] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (still) return;
    const t = window.setTimeout(() => setShown(true), 6000);
    const evs = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'mousedown'] as const;
    const touch = () => setTouched(true);
    evs.forEach(e => window.addEventListener(e, touch, { capture: true, passive: true, once: true }));
    return () => { window.clearTimeout(t); evs.forEach(e => window.removeEventListener(e, touch, { capture: true })); };
  }, [still]);
  useAutoIntro(flat ? !calm : shown && !touched && !calm, flat ? 1500 : SHOW_MS, GRID);

  useEffect(() => {
    if (flat) return;
    const dom = { sec: sec.current, frame: frame.current, back: back.current, front: front.current, head: headRef.current, label: label.current };
    if (!dom.sec || !dom.frame || !dom.back || !dom.front || !dom.head || !dom.label) return;
    let gone = false;
    let eng: { dispose(): void } | null = null;
    // The heavy part (three.js, the textures) starts after the first paint, with the headline already up.
    const id = requestAnimationFrame(() => {
      createEngine(dom as Parameters<typeof createEngine>[0], {
        rig: carousel(narrow), still, narrow, texSize: narrow ? 448 : 640,
        runPx: () => (RUN / 100) * window.innerHeight, onShow: () => setShown(true),
      }).then(e => { if (gone) e.dispose(); else eng = e; }, () => { if (!gone) setFailed(true); });
    });
    return () => { gone = true; cancelAnimationFrame(id); eng?.dispose(); };
  }, [narrow, still, flat]);

  const h = head(narrow);
  return (
    <section id="top" ref={sec} className="relative" style={{ height: still ? '100vh' : `${100 + RUN + HOLD}vh` }}>
      <style>{RISE}</style>
      {!still && <div id={GRID} aria-hidden className="absolute left-0 w-px h-px pointer-events-none" style={{ top: `${RUN}vh` }} />}
      <div ref={frame} className="sticky top-0 h-screen overflow-hidden select-none" style={{ touchAction: 'pan-y', ...studio(narrow) }}>
        {flat ? <FlatRing narrow={narrow} /> : <canvas ref={back} aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" />}
        <div className={`absolute pointer-events-none ${h.className}`} style={{ ...h.style, zIndex: 2 }}>
          <div ref={headRef} style={{ willChange: still ? undefined : 'transform, opacity', transformOrigin: '50% 50%' }}>
            <Headline narrow={narrow} still={still} />
          </div>
        </div>
        {!flat && <canvas ref={front} aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 3 }} />}
        <div ref={label} aria-hidden className="absolute left-0 top-0 pointer-events-none text-center whitespace-nowrap"
          style={{ opacity: 0, zIndex: 4, transition: 'opacity 220ms cubic-bezier(0.25, 0.1, 0.25, 1)' }}>
          <p className="font-display font-medium tracking-[0.05em] text-[13px] text-foreground leading-none" />
          <p className="text-[12px] text-foreground/70 leading-none mt-1.5" style={{ fontFamily: 'var(--font-numeral)' }} />
        </div>
      </div>
    </section>
  );
});
