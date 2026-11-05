// Shared helpers for the landing page that aren't components: the app's ease, the demo products, the size and
// scroll hooks, the dark token set the portal pieces keep inside the light page, and the balanced-wrap style.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { DEMO_PRODUCTS, type DemoProduct } from '@/data/demo-data';

/** The app's transition ease (MaisonCanvas.tsx, ProductView.tsx). */
export const EASE_CSS = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const piece = (id: string) => DEMO_PRODUCTS.find(p => p.id === id) as DemoProduct;
export const PAGE1 = DEMO_PRODUCTS.slice(0, 20);
export const money = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

/** Element size, kept current. */
export function useSize<T extends HTMLElement>(): [RefObject<T>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [s, setS] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setS({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(([e]) => setS({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, s];
}

/** True below the md breakpoint (the 390 mobile frame). */
export function useNarrow() {
  const [n, setN] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const on = () => setN(window.innerWidth < 768);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return n;
}

/** Index of the child (by data-beat) that sits on the reading line, for the mobile vertical story. */
export function useBeat(ref: RefObject<HTMLElement>, count: number, line = 0.62) {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const els = ref.current?.querySelectorAll<HTMLElement>('[data-beat]');
      if (!els) return;
      const y = window.innerHeight * line;
      let b = 0;
      els.forEach((el, i) => { if (el.getBoundingClientRect().top < y) b = i; });
      setBeat(Math.min(count - 1, b));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, [ref, count, line]);
  return beat;
}

/** Mounts children only while `on` or recently on, so heavy pages don't all render at once. */
export function useLatch(on: boolean, ms = 700) {
  const [mounted, setMounted] = useState(on);
  useEffect(() => {
    if (on) { setMounted(true); return; }
    const id = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(id);
  }, [on, ms]);
  return mounted;
}

// The dark token values from index.css (:root). The Smart Portal is dark only, so in the light page
// its panels keep these, the way the real portal looks.
export const DARK_VARS = {
  '--background': '0 0% 5%', '--foreground': '0 0% 92%', '--card': '0 0% 10%', '--card-foreground': '0 0% 92%',
  '--popover': '0 0% 8%', '--popover-foreground': '0 0% 92%', '--primary': '0 0% 92%', '--primary-foreground': '0 0% 5%',
  '--secondary': '0 0% 12%', '--secondary-foreground': '0 0% 70%', '--muted': '0 0% 14%', '--muted-foreground': '0 0% 50%',
  '--accent': '0 0% 18%', '--accent-foreground': '0 0% 92%', '--border': '0 0% 18%', '--input': '0 0% 18%', '--ring': '0 0% 40%',
  '--sidebar-background': '0 0% 8%', '--sidebar-foreground': '0 0% 80%', '--sidebar-primary': '0 0% 92%',
  '--sidebar-primary-foreground': '0 0% 5%', '--sidebar-accent': '0 0% 14%', '--sidebar-accent-foreground': '0 0% 92%',
  '--sidebar-border': '0 0% 18%', '--sidebar-ring': '0 0% 40%', '--surface-elevated': '0 0% 10%', '--surface-overlay': '0 0% 12%',
} as CSSProperties;

export const balance = { textWrap: 'balance' } as CSSProperties;
