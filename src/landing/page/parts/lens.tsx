// The story. It opens as E3 did: the six screens on one sheet, seen whole in the window, then the camera zooms
// into SmartShop. From there it is C2, the right rail mirrored (Nate's pick): the window holds still on the
// right and becomes each feature in turn, and the rail on the left carries the feature's label, head and tags.
// The scroll steps through every tag; the lit bar in the rail is the tag the window is acting out. The zoom
// lands exactly on the window, because the window is the camera's frame: the stage is the zoomed-in sheet.
import { memo, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { FEATURES, nn, restOf, tagsOf } from '../lib/features';
import { BEAT_VH, storyTimeline, type At, type Cam } from '../lib/story';
import { EASE_CSS, balance, clamp01, scrollBehavior, useSize } from '../lib/core';
import { Micro } from './chrome';
import { Layer } from './core';
import { Screen } from './screens';

export interface Nav { active: string; reached: number }

/** The rail's width, as C2 drew it. */
const RAIL = 280;

type V = { cx: number; cy: number; s: number };
type Box = { x: number; y: number; w: number; h: number };

/** The sheet: six screens the size of the window, with a ProductTile-style label under each. They snake
 *  (top row left to right, bottom row right to left), as in the E3 overview. */
function geometry(lw: number, lh: number) {
  const DW = Math.max(1, lw), DH = Math.max(1, lh);
  const G = Math.round(DW * 0.08), L = Math.round(DH * 0.13);
  const slot = (i: number) => (i < 3 ? { c: i, r: 0 } : { c: 5 - i, r: 1 });
  const rect = (i: number): Box => { const { c, r } = slot(i); return { x: c * (DW + G), y: r * (DH + L + G), w: DW, h: DH }; };
  const SW = 3 * DW + 2 * G, SH = 2 * (DH + L) + G;
  const cam = (c: Cam): V => {
    const b = c.k === 'f' ? rect(0) : { x: 0, y: 0, w: SW, h: SH };
    return { cx: b.x + b.w / 2, cy: b.y + b.h / 2, s: Math.min(lw / b.w, lh / b.h) * (c.k === 'f' ? 1 : 0.92) };
  };
  return { DW, DH, G, L, SW, SH, rect, cam };
}

const ease = (t: number) => t * t * (3 - 2 * t);
const same = (a: At, b: At) => a.f === b.f && a.beat === b.beat;

/** C2's tags: ProductView.tsx photo bars set vertically, each captioned; the lit bar is the tag on screen. */
function TagBars({ fi, active }: { fi: number; active: number }) {
  return (
    <div className="flex flex-col gap-0.5 mt-7">
      {tagsOf(fi).map((t, i) => (
        <div key={t} className="flex items-center gap-3 py-1.5">
          <span className={`w-6 h-1 rounded-full flex-shrink-0 transition-colors duration-300 ${i === active ? 'bg-foreground/80' : i < active ? 'bg-foreground/40' : 'bg-foreground/15'}`} />
          <span className={`text-[10px] font-display tracking-[0.2em] uppercase transition-colors duration-300 ${i === active ? 'text-foreground' : 'text-muted-foreground'}`}>{t}</span>
        </div>
      ))}
    </div>
  );
}

/** Memoised, so the page re-rendering for the nav doesn't redraw the story; its own scroll state drives it. */
export const Story = memo(function Story({ thumb, onNav, jumpRef }: { thumb: boolean; onNav: (n: Nav) => void; jumpRef: MutableRefObject<(id: string) => void> }) {
  const { segs, total, starts } = useMemo(() => storyTimeline(), []);
  const sec = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [lensRef, lens] = useSize<HTMLDivElement>();
  const geo = useMemo(() => geometry(lens.w, lens.h), [lens.w, lens.h]);
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const [st, setSt] = useState<{ at: At; t: number; zoomed: boolean }>(() => ({ at: segs[0].at, t: 0, zoomed: false }));
  const navRef = useRef('');
  const onNavRef = useRef(onNav);
  onNavRef.current = onNav;

  // The camera: scroll sets a target, the drawn camera eases toward it (time based, about 110 ms).
  const cur = useRef<V | null>(null);
  const tgt = useRef<V | null>(null);
  const raf = useRef(0);
  const last = useRef(0);
  const draw = (c: V, moving: boolean) => {
    const el = sheet.current;
    const g = geoRef.current;
    if (!el) return;
    el.style.transform = `translate(${g.DW / 2 - c.s * c.cx}px, ${g.DH / 2 - c.s * c.cy}px) scale(${c.s})`;
    el.style.willChange = moving ? 'transform' : '';
  };
  const tick = (now: number) => {
    raf.current = 0;
    const c = cur.current, g = tgt.current;
    if (!c || !g) return;
    const dt = Math.min(64, now - (last.current || now - 16));
    last.current = now;
    const k = 1 - Math.exp(-dt / 110);
    c.cx += (g.cx - c.cx) * k;
    c.cy += (g.cy - c.cy) * k;
    c.s = Math.exp(Math.log(c.s) + (Math.log(g.s) - Math.log(c.s)) * k);
    const done = Math.abs(g.cx - c.cx) < 0.4 && Math.abs(g.cy - c.cy) < 0.4 && Math.abs(g.s / c.s - 1) < 0.0008;
    if (done) Object.assign(c, g);
    draw(c, !done);
    if (!done) raf.current = requestAnimationFrame(tick);
    else last.current = 0;
  };

  const xOf = (p: number) => {
    let x = p * total;
    for (const s of segs) { if (x <= s.vh) return { seg: s, t: x / s.vh }; x -= s.vh; }
    return { seg: segs[segs.length - 1], t: 1 };
  };

  const read = (snap = false) => {
    const el = sec.current;
    const g = geoRef.current;
    if (!el || !g || g.DW < 2) return;
    const r = el.getBoundingClientRect();
    const run = Math.max(1, r.height - window.innerHeight);
    const { seg, t } = thumb ? { seg: segs[0], t: 0 } : xOf(clamp01(-r.top / run));
    const A = g.cam(seg.from), B = g.cam(seg.to), e = ease(t);
    const target = { cx: A.cx + (B.cx - A.cx) * e, cy: A.cy + (B.cy - A.cy) * e, s: Math.exp(Math.log(A.s) + (Math.log(B.s) - Math.log(A.s)) * e) };
    tgt.current = target;
    if (!cur.current || snap || thumb) { cur.current = { ...target }; draw(cur.current, false); }
    else if (!raf.current) raf.current = requestAnimationFrame(tick);
    const zoomed = seg.from.k === 'f';
    const ct = zoomed ? Math.round(t * 20) / 20 : 0;
    setSt(prev => (same(prev.at, seg.at) && prev.t === ct && prev.zoomed === zoomed ? prev : { at: seg.at, t: ct, zoomed }));
    if (thumb) return;
    const before = r.top > 1, after = r.bottom < window.innerHeight - 1;
    const active = before || after ? 'all' : FEATURES[seg.at.f].id;
    const reached = before ? -1 : after ? FEATURES.length - 1 : seg.at.f;
    const key = `${active}|${reached}`;
    if (key !== navRef.current) { navRef.current = key; onNavRef.current({ active, reached }); }
  };
  const readRef = useRef(read);
  readRef.current = read;

  useEffect(() => {
    if (thumb) return;
    let frame = 0;
    const on = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; readRef.current(); }); };
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(frame); cancelAnimationFrame(raf.current); };
  }, [thumb]);
  // New window size: lay the sheet out again and jump the camera straight there.
  useEffect(() => { readRef.current(true); }, [geo]);

  const scrollToX = (x: number) => {
    const el = sec.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (x / total) * (el.offsetHeight - window.innerHeight), behavior: scrollBehavior() });
  };
  const toFeature = (fi: number) => scrollToX(starts[fi] + BEAT_VH / 2);
  jumpRef.current = (id: string) => {
    if (id === 'all') { window.scrollTo({ top: 0, behavior: scrollBehavior() }); return; }
    const fi = FEATURES.findIndex(f => f.id === id);
    if (fi >= 0) toFeature(fi);
  };

  const { at, t, zoomed } = st;
  // On the sheet (the opening, and SmartShop's first beat while the camera settles) every screen keeps its own
  // spot. After that the stage stacks them all in the window, hidden under the one on show, so the next feature
  // crossfades in where the last one was.
  const spread = !zoomed || (at.f === 0 && at.beat === 0);
  const nameSize = geo.L * 0.36;
  // Crossfades. A stacked screen that's leaving holds until the incoming one (on top) is fully in, then drops out
  // of sight, so the window never dips to its backdrop between two features.
  const fade = (on: boolean, stacked = false) => ({
    opacity: on ? 1 : 0,
    transition: thumb ? 'none' : on || !stacked ? `opacity 520ms ${EASE_CSS}` : 'opacity 0ms linear 520ms',
  });

  return (
    <section ref={sec} className="relative border-t border-border" style={{ height: thumb ? '100vh' : `${total + 100}vh` }}>
      <div id="story" aria-hidden className="absolute left-0 w-px h-px pointer-events-none" style={{ top: thumb ? 0 : `${starts[0] + 0.3 * BEAT_VH}vh` }} />
      <div className="sticky top-0 h-screen pt-[82px] flex flex-col">
        <div className="flex-1 min-h-0 grid gap-10 px-6 pt-6 pb-8" style={{ gridTemplateColumns: `${RAIL}px minmax(0,1fr)` }}>
          <div className="relative min-h-0">
            {FEATURES.map((f, fi) => (
              <Layer key={f.id} on={at.f === fi} thumb={thumb} className="flex flex-col justify-center">
                <Micro>{nn(fi)} / 06 · {f.label}</Micro>
                <h2 className="font-display font-bold tracking-wide text-[26px] leading-[1.14] mt-3" style={balance}>{f.head}</h2>
                <TagBars fi={fi} active={zoomed && at.f === fi ? at.beat : -1} />
              </Layer>
            ))}
          </div>
          <div ref={lensRef} className="relative min-h-0 rounded-xl overflow-hidden dynamic-bg shadow-[inset_0_0_0_1px_hsl(var(--border)),0_20px_60px_-20px_rgba(0,0,0,0.5)]">
            {lens.w > 0 && (
              <div ref={sheet} className="absolute left-0 top-0" style={{ width: geo.SW, height: geo.SH, transformOrigin: '0 0' }}>
                {FEATURES.map((f, fi) => {
                  const rect = geo.rect(spread ? fi : 0);
                  const mine = at.f === fi;
                  const rest = restOf(fi, at.f);
                  return (
                    // Placed by transform: a screen stacking into the window as the stage takes over moves no layout box,
                    // so it never counts as a layout shift (fast scrolls catch the last ones still fading out).
                    <div key={f.id} className="absolute left-0 top-0" style={{ transform: `translate(${rect.x}px, ${rect.y}px)`, width: rect.w, zIndex: mine ? 2 : 1, ...fade(!zoomed || mine, !spread) }}>
                      <div className="relative rounded-xl border border-border overflow-hidden bg-background shadow-[0_14px_40px_-18px_rgba(0,0,0,0.28)]" style={{ height: rect.h }}>
                        <Screen fi={fi} beat={mine ? at.beat : rest.beat} t={mine ? t : rest.t} thumb={thumb} live={zoomed && mine && fi === 0} warm={fi === FEATURES.length - 1 && at.f >= fi - 1} />
                        {!zoomed && !thumb && (
                          <button type="button" aria-label={f.label} onClick={() => toFeature(fi)} className="absolute inset-0 z-40 hover:bg-foreground/[0.03] transition-colors" />
                        )}
                      </div>
                      {/* ProductTile.tsx label: name, then the number in the numeral line. The sheet's only. */}
                      <div className="space-y-1" style={{ paddingTop: geo.L * 0.16, ...fade(!zoomed) }}>
                        <p className="font-display font-medium tracking-[0.05em] text-foreground/80 leading-none" style={{ fontSize: nameSize }}>{f.label}</p>
                        <p className="text-foreground/60 leading-none" style={{ fontSize: nameSize * 0.72, fontFamily: 'var(--font-numeral)', marginTop: nameSize * 0.3 }}>{nn(fi)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});
