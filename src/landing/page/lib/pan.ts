// The live store's idle drift. On its own the canvas pans left and right across its width, an eased ping-pong,
// already moving when the page arrives. It pauses while the visitor is at the canvas (moving or pressing over it,
// a piece hovered, a drag, a zoom, a product open) and starts again about 3s after they stop. It runs on rAF and
// writes one transform, so React never re-renders for it; it sleeps off screen and never runs under reduced motion.
import { useEffect, useRef, type RefObject } from 'react';
import { lessMotion } from './core';

/** px/s at the middle of a sweep; it eases to a crawl at each end. */
const SPEED = 40;
/** ms of quiet before the drift comes back, and ms to come back up to speed. */
const IDLE = 3000, RAMP = 800;
/** ms time constant for easing home when the drift is switched off. */
const HOME = 400;
/** Less room than this (px) and there's nothing to pan across: a canvas that fits its view holds still
 *  rather than wobbling in place. */
const MIN_RANGE = 48;

export interface PanState {
  /** Drift now (e.g. the story only drifts its store on SmartShop's first beat). */
  on: boolean;
  /** The visitor has the canvas: a hovered piece, a drag, a zoom or an open product. */
  held: boolean;
  /** How far the canvas may slide, px: the offsets that put its left and right edges at the view's. */
  range: [number, number];
}

/** The offsets (px) between which a `w`-wide canvas at `left` can slide inside a view from `vl` to `vr`. */
export function panRange(left: number, w: number, vl: number, vr: number): [number, number] {
  const a = vl - left, b = vr - (left + w);
  return [Math.min(a, b), Math.max(a, b)];
}

/**
 * Drives `wrap`'s transform. Returns the current offset (read it when turning a pointer into canvas space) and
 * `poke`, to call on any visitor activity over the canvas.
 */
export function useAutoPan(root: RefObject<HTMLElement>, wrap: RefObject<HTMLElement>, state: PanState, thumb: boolean) {
  const off = useRef(0);
  const now = useRef(state);
  now.current = state;
  const activity = useRef(-Infinity);
  const kick = useRef(() => {});
  useEffect(() => {
    const el = root.current;
    if (thumb || !el || lessMotion() || typeof IntersectionObserver === 'undefined') return;
    let raf = 0, last = 0, ramp = 0, dir = -1, visible = false;
    const put = (x: number) => {
      off.current = x;
      if (wrap.current) wrap.current.style.transform = x ? `translate3d(${x}px,0,0)` : '';
    };
    const step = (t: number) => {
      raf = 0;
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      const { on, held, range: [lo, hi] } = now.current;
      let x = off.current;
      if (!on || hi - lo < MIN_RANGE) { ramp = 0; x = Math.abs(x) < 0.3 ? 0 : x * Math.exp(-dt / HOME); }
      else if (held || t - activity.current < IDLE) ramp = 0;
      else {
        ramp = Math.min(1, ramp + dt / RAMP);
        if (x >= hi - 0.5) dir = -1;
        else if (x <= lo + 0.5) dir = 1;
        const u = (x - lo) / (hi - lo);
        const v = u < 0 || u > 1 ? SPEED * 0.6 : SPEED * Math.max(0.1, Math.sin(Math.PI * u));
        x += (dir * v * ramp * dt) / 1000;
      }
      if (x !== off.current) put(x);
      if (visible && (now.current.on || off.current !== 0)) raf = requestAnimationFrame(step);
      else last = 0;
    };
    kick.current = () => { if (visible && !raf) raf = requestAnimationFrame(step); };
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; kick.current(); });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); kick.current = () => {}; };
  }, [root, wrap, thumb]);
  useEffect(() => { kick.current(); }, [state.on]);
  const poke = () => { activity.current = performance.now(); };
  return { off, poke };
}
