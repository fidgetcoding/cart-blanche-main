// The self-scrolling intro: about 1.5s after load the page glides itself through the opening (hero, problem,
// system), resting briefly on each, and settles at the start of SmartShop, where the canvas is live. Any input
// from the visitor (wheel, touch, key, pointer, or moving the page another way) stops it at once and for good.
// No autoplay under reduced motion.
import { useEffect } from 'react';

const ease = (t: number) => t * t * (3 - 2 * t);
const STOP_ON = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'mousedown'] as const;
const STOPS = ['problem', 'system', 'story'];

/** Where the page should rest for one section: centred under the bar if it fits, else its top under the bar. */
function restFor(id: string, bar: number) {
  const el = document.getElementById(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const top = r.top + window.scrollY;
  const room = window.innerHeight - bar;
  // The story's own marker is a 1px point: land exactly on it, the way the lab's story screen does.
  if (r.height <= 2) return top;
  return r.height < room * 0.9 ? top + r.height / 2 - (window.innerHeight + bar) / 2 : top - bar - 8;
}

/**
 * Resolves once the page's stylesheets and web fonts have arrived, or after `cap` ms. A font that swaps in
 * mid-glide reflows the page under it (the stops move and the frame that lays it out runs long).
 */
function settled(cap: number) {
  const pending = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].filter(l => !l.sheet);
  const sheets = Promise.all(pending.map(l => new Promise(r => { l.addEventListener('load', r, { once: true }); l.addEventListener('error', r, { once: true }); })));
  // A new stylesheet's fonts only start loading once a frame lays out text in them.
  const fonts = sheets.then(() => new Promise(r => requestAnimationFrame(r))).then(() => document.fonts?.ready);
  return Promise.race([fonts, new Promise(r => setTimeout(r, cap))]);
}

export function useAutoIntro(on: boolean, delay = 1500) {
  useEffect(() => {
    if (!on || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let stopped = false, raf = 0, timer = 0, expect = -1;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      STOP_ON.forEach(e => window.removeEventListener(e, stop, true));
      window.removeEventListener('scroll', watch);
    };
    // A scroll we didn't make (a scrollbar drag, a jump link) also hands the page back.
    const watch = () => { if (expect >= 0 && Math.abs(window.scrollY - expect) > 4) stop(); };
    STOP_ON.forEach(e => window.addEventListener(e, stop, { capture: true, passive: true }));

    const begin = () => {
      if (stopped) return;
      if (window.scrollY > 40) { stop(); return; }
      const bar = document.querySelector('header')?.getBoundingClientRect().height ?? 82;
      const stopAt = (id: string) => {
        const y = restFor(id, bar);
        return y === null ? null : Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, Math.round(y)));
      };
      // Legs: glide to each stop, then rest a beat on the problem and the system before moving on. Each stop is
      // measured as its leg starts, so a reflow since the last one (a late font, an image) can't strand it.
      const ids = STOPS.filter(id => document.getElementById(id));
      const legs = ids.map((id, i) => ({ id, rest: i < ids.length - 1 ? 1100 : 0, to: 0 }));
      let from = window.scrollY, leg = 0, t0 = 0, resting = false;
      expect = from;
      window.addEventListener('scroll', watch, { passive: true });
      const frame = (now: number) => {
        if (stopped) return;
        const L = legs[leg];
        if (!L) { stop(); return; }
        if (!t0) {
          const to = stopAt(L.id);
          if (to === null) { stop(); return; }
          t0 = now; L.to = to;
        }
        const ms = Math.min(3200, Math.max(1200, 600 + Math.abs(L.to - from) * 1.1));
        if (!resting) {
          const t = Math.min(1, (now - t0) / ms);
          expect = Math.round(from + (L.to - from) * ease(t));
          window.scrollTo(0, expect);
          if (t >= 1) { resting = true; t0 = now; }
        } else if (now - t0 >= L.rest) {
          // On arrival at SmartShop, look again: if the page moved under the last stop, glide on to where it is.
          const again = leg === legs.length - 1 ? stopAt(L.id) : null;
          if (again !== null && Math.abs(again - L.to) > 2 && legs.length < STOPS.length + 3) legs.push({ ...L });
          from = L.to; leg += 1; t0 = 0; resting = false;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    timer = window.setTimeout(() => { void settled(2500).then(begin); }, delay);
    return stop;
  }, [on, delay]);
}
