// The story: B1's pinned chapters (index and head on the left, the real UI on the right), where the move
// from one feature to the next is A5's canvas zoom. The six screens sit on one sheet; the lens opens on the
// whole sheet and closes on it, and between features pulls back just enough to frame the next screen beside
// this one and glides across. Scroll drives the camera, eased so it stays calm; the store's own pills light
// with it, and each feature's tags ride on its screen.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject } from 'react';
import { BEATS, FEATURES, nn, restOf, tagsOf } from '../lib/features';
import { DARK_VARS, EASE_CSS, clamp01, useSize } from '../lib/core';
import { Micro, PillBar } from './chrome';
import { Layer } from './core';
import { Screen } from './screens';
import { Head } from './sections';

export interface Nav { active: string; reached: number }

/** Scroll per story unit, in vh. */
const VH = 56;

type Cam = { k: 'f'; i: number } | { k: 'o' } | { k: 'pair'; a: number; b: number };
/** What the chapter shows: a feature and its beat. */
interface At { f: number; beat: number }
interface Seg { u: number; from: Cam; to: Cam; a: At; b: At }
type V = { cx: number; cy: number; s: number };
type Box = { x: number; y: number; w: number; h: number };

/** The scroll timeline: which camera moves happen between the beats. */
function build() {
  const segs: Seg[] = [];
  const F = (i: number): Cam => ({ k: 'f', i });
  const O: Cam = { k: 'o' };
  const first = (f: number): At => ({ f, beat: 0 });
  const last = (f: number): At => ({ f, beat: BEATS[f] - 1 });
  const push = (u: number, from: Cam, to: Cam, a: At, b: At = a) => segs.push({ u, from, to, a, b });
  push(0.7, O, O, first(0));
  push(0.6, O, F(0), first(0));
  const starts: number[] = [];
  FEATURES.forEach((_, f) => {
    starts.push(segs.reduce((n, s) => n + s.u, 0));
    for (let b = 0; b < BEATS[f]; b++) push(1, F(f), F(f), { f, beat: b });
    if (f === FEATURES.length - 1) return;
    // Pull back to just this screen and the next one, hold, then glide in on the next.
    const via: Cam = { k: 'pair', a: f, b: f + 1 };
    push(0.5, F(f), via, last(f));
    push(0.25, via, via, last(f), first(f + 1));
    push(0.5, via, F(f + 1), first(f + 1));
  });
  push(0.6, F(FEATURES.length - 1), O, last(FEATURES.length - 1));
  push(0.9, O, O, last(FEATURES.length - 1));
  return { segs, U: segs.reduce((n, s) => n + s.u, 0), starts };
}

/** The sheet: six screens the size of the lens, with a ProductTile-style label under each. They snake
 *  (top row left to right, bottom row right to left) so each screen sits beside the next. */
function geometry(lw: number, lh: number) {
  const DW = Math.max(1, lw), DH = Math.max(1, lh);
  const G = Math.round(DW * 0.08), L = Math.round(DH * 0.13);
  const slot = (i: number) => (i < 3 ? { c: i, r: 0 } : { c: 5 - i, r: 1 });
  const rect = (i: number): Box => { const { c, r } = slot(i); return { x: c * (DW + G), y: r * (DH + L + G), w: DW, h: DH }; };
  const SW = 3 * DW + 2 * G, SH = 2 * (DH + L) + G;
  const cam = (c: Cam): V => {
    let b: Box;
    let m = 0.92;
    if (c.k === 'f') { b = rect(c.i); m = 1; }
    else if (c.k === 'o') b = { x: 0, y: 0, w: SW, h: SH };
    else {
      const A = rect(c.a), B = rect(c.b);
      const x = Math.min(A.x, B.x), y = Math.min(A.y, B.y);
      b = { x, y, w: Math.max(A.x, B.x) + DW - x, h: Math.max(A.y, B.y) + DH + L - y };
    }
    return { cx: b.x + b.w / 2, cy: b.y + b.h / 2, s: Math.min(lw / b.w, lh / b.h) * m };
  };
  return { DW, DH, G, L, SW, SH, rect, cam };
}

const ease = (t: number) => t * t * (3 - 2 * t);
const same = (a: At, b: At) => a.f === b.f && a.beat === b.beat;
/** Screens that stay dark in the light page (the portal is dark only); their tag carries the dark tokens. */
const DARK_SCREENS = ['portal', 'manager'];
/** Where the tag sits on each screen. */
const ON_UI: Record<string, CSSProperties> = {
  smartshop: { left: 20, bottom: 18 },
  buildaset: { left: 24, top: 22 },
  smartcart: { left: 20, top: 20 },
  portal: { right: 20, bottom: 18 },
  manager: { right: 20, bottom: 18 },
  lab: { right: 24, bottom: 22 },
};

/** One tag at a time, in the store's lit pill, crossfading as the beats change. */
function TagChip({ fi, beat, side }: { fi: number; beat: number; side: 'left' | 'right' }) {
  return (
    <div className="relative h-[34px]">
      {tagsOf(fi).map((t, i) => (
        <div key={t} className={`absolute top-0 ${side === 'left' ? 'left-0' : 'right-0'}`} style={{ opacity: i === beat ? 1 : 0, transition: `opacity 500ms ${EASE_CSS}` }}>
          <PillBar items={[{ id: t, label: t }]} active={t} />
        </div>
      ))}
    </div>
  );
}

export function Story({ thumb, onNav, jumpRef }: { thumb: boolean; onNav: (n: Nav) => void; jumpRef: MutableRefObject<(id: string) => void> }) {
  const { segs, U, starts } = useMemo(() => build(), []);
  const sec = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [lensRef, lens] = useSize<HTMLDivElement>();
  const geo = useMemo(() => geometry(lens.w, lens.h), [lens.w, lens.h]);
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const [st, setSt] = useState<{ at: At; t: number; zoomed: boolean }>(() => ({ at: segs[0].a, t: 0, zoomed: segs[0].from.k === 'f' && segs[0].to.k === 'f' }));
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
    let x = p * U;
    for (const s of segs) { if (x <= s.u) return { seg: s, t: x / s.u }; x -= s.u; }
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
    const at = t < 0.5 ? seg.a : seg.b;
    const zoomed = seg.from.k === 'f' && seg.to.k === 'f';
    const ct = zoomed ? Math.round(t * 20) / 20 : at.beat === 0 ? 0 : 1;
    setSt(prev => (same(prev.at, at) && prev.t === ct && prev.zoomed === zoomed ? prev : { at, t: ct, zoomed }));
    if (thumb) return;
    const before = r.top > 1, after = r.bottom < window.innerHeight - 1;
    const active = before || after ? 'all' : FEATURES[at.f].id;
    const reached = before ? -1 : after ? FEATURES.length - 1 : at.f;
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
  // New lens size: lay the sheet out again and jump the camera straight there.
  useEffect(() => { readRef.current(true); }, [geo]);

  const scrollToX = (x: number) => {
    const el = sec.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (x / U) * (el.offsetHeight - window.innerHeight), behavior: 'smooth' });
  };
  const toBeat = (fi: number, b: number) => scrollToX(starts[fi] + b + 0.5);
  jumpRef.current = (id: string) => {
    if (id === 'all') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const fi = FEATURES.findIndex(f => f.id === id);
    if (fi >= 0) toBeat(fi, 0);
  };

  const { at, t, zoomed } = st;
  const nameSize = geo.L * 0.36;

  return (
    <section ref={sec} className="relative border-t border-border" style={{ height: thumb ? '100vh' : `${U * VH + 100}vh` }}>
      <div id="story" aria-hidden className="absolute left-0 w-px h-px pointer-events-none" style={{ top: thumb ? 0 : `${(starts[0] + 0.3) * VH}vh` }} />
      <div className="sticky top-0 h-screen pt-[82px] pb-[56px] flex flex-col">
        <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,0.66fr)_minmax(0,1.34fr)] gap-12 px-10 pt-6">
          <div className="relative min-h-0">
            {FEATURES.map((f, fi) => (
              <Layer key={f.id} on={at.f === fi} thumb={thumb} className="flex flex-col justify-center pb-6">
                <Micro>{nn(fi)} / 06 · {f.label}</Micro>
                <Head text={f.head} className="text-[40px] leading-[1.08] mt-4" />
              </Layer>
            ))}
          </div>
          <div className="min-h-0 flex flex-col">
            <div ref={lensRef} className="relative flex-1 min-h-0 rounded-xl overflow-hidden dynamic-bg shadow-[inset_0_0_0_1px_hsl(var(--border))]">
              {lens.w > 0 && (
                <div ref={sheet} className="absolute left-0 top-0" style={{ width: geo.SW, height: geo.SH, transformOrigin: '0 0' }}>
                  {FEATURES.map((f, fi) => {
                    const rect = geo.rect(fi);
                    const mine = at.f === fi;
                    const rest = restOf(fi, at.f);
                    return (
                      <div key={f.id} className="absolute" style={{ left: rect.x, top: rect.y, width: rect.w }}>
                        <div className="relative rounded-xl border border-border overflow-hidden bg-background shadow-[0_14px_40px_-18px_rgba(0,0,0,0.28)]" style={{ height: rect.h }}>
                          <Screen fi={fi} beat={mine ? at.beat : rest.beat} t={mine ? t : rest.t} thumb={thumb} live={zoomed && mine && fi === 0} />
                          <div className="absolute z-30 pointer-events-none" style={{ ...ON_UI[f.id], ...(DARK_SCREENS.includes(f.id) ? DARK_VARS : {}), opacity: mine ? 1 : 0, transition: `opacity 500ms ${EASE_CSS}` }}>
                            <TagChip fi={fi} beat={mine ? at.beat : -1} side={'right' in ON_UI[f.id] ? 'right' : 'left'} />
                          </div>
                          {!zoomed && !thumb && (
                            <button type="button" aria-label={f.label} onClick={() => toBeat(fi, 0)} className="absolute inset-0 z-40 hover:bg-foreground/[0.03] transition-colors" />
                          )}
                        </div>
                        {/* ProductTile.tsx label: name, then the number in the numeral line */}
                        <div className="space-y-1" style={{ paddingTop: geo.L * 0.16 }}>
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
      </div>
    </section>
  );
}
