// The self-scrolling intro: about 1.5s after load the page glides itself through the opening (hero, problem,
// system), resting briefly on each, and settles at the start of SmartShop, where the canvas is live. Any input
// from the visitor (wheel, touch, key, pointer, or moving the page another way) stops it at once and for good.
// No autoplay under reduced motion.
import { useEffect } from 'react';

const ease = (t: number) => t * t * (3 - 2 * t);
const STOP_ON = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'mousedown'] as const;

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

    timer = window.setTimeout(() => {
      if (stopped) return;
      if (window.scrollY > 40) { stop(); return; }
      const bar = document.querySelector('header')?.getBoundingClientRect().height ?? 82;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const stops = ['problem', 'system', 'story'].map(id => restFor(id, bar)).filter((y): y is number => y !== null).map(y => Math.max(0, Math.min(max, Math.round(y))));
      // Legs: glide to each stop, then rest a beat on the problem and the system before moving on.
      const legs = stops.map((to, i) => ({ to, rest: i < stops.length - 1 ? 1100 : 0 }));
      let from = window.scrollY, leg = 0, t0 = 0, resting = false;
      expect = from;
      window.addEventListener('scroll', watch, { passive: true });
      const frame = (now: number) => {
        if (stopped) return;
        const L = legs[leg];
        if (!L) { stop(); return; }
        if (!t0) t0 = now;
        const ms = Math.min(3200, Math.max(1200, 600 + Math.abs(L.to - from) * 1.1));
        if (!resting) {
          const t = Math.min(1, (now - t0) / ms);
          expect = Math.round(from + (L.to - from) * ease(t));
          window.scrollTo(0, expect);
          if (t >= 1) { resting = true; t0 = now; }
        } else if (now - t0 >= L.rest) {
          from = L.to; leg += 1; t0 = 0; resting = false;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }, delay);
    return stop;
  }, [on, delay]);
}
