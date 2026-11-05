// Landing core components: the fit-to-box stages, the dark portal surface and the crossfade layer.
import type { CSSProperties, ReactNode } from 'react';
import { DARK_VARS, EASE_CSS, useSize } from '../lib/core';

/**
 * Draws a fixed-size design scaled to fit its box (never above 1 unless `grow`). The transform
 * also contains any `fixed` element inside, so real app pages stay in their frame.
 */
export function Fit({ w, h, children, className = '', align = 'center', grow = false, style }: {
  w: number; h: number; children: ReactNode; className?: string; align?: 'center' | 'left' | 'top'; grow?: boolean; style?: CSSProperties;
}) {
  const [ref, box] = useSize<HTMLDivElement>();
  const raw = box.w && box.h ? Math.min(box.w / w, box.h / h) : 0;
  const s = grow ? raw : Math.min(1, raw);
  const left = align === 'left' ? 0 : (box.w - w * s) / 2;
  const top = align === 'top' ? 0 : (box.h - h * s) / 2;
  return (
    <div ref={ref} className={`${/\b(absolute|fixed|sticky)\b/.test(className) ? '' : 'relative'} overflow-hidden ${className}`} style={style}>
      {s > 0 && (
        <div className="absolute" style={{ left, top, width: w, height: h, transform: `scale(${s})`, transformOrigin: '0 0' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Scales a fixed-width design to the box width; the design's height is whatever fills the box. */
export function FitWidth({ w, minH = 0, children, className = '', style }: {
  w: number; minH?: number; children: (h: number) => ReactNode; className?: string; style?: CSSProperties;
}) {
  const [ref, box] = useSize<HTMLDivElement>();
  const s = box.w ? Math.min(box.w / w, minH ? box.h / minH : Infinity) : 0;
  const h = s ? box.h / s : 0;
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={style}>
      {s > 0 && (
        <div className="absolute left-0 top-0" style={{ width: w, height: h, transform: `scale(${s})`, transformOrigin: '0 0' }}>{children(h)}</div>
      )}
    </div>
  );
}

// index.css .liquid-glass and .dynamic-bg (dark), re-applied under .cb-dark so a light page's
// `.light .liquid-glass` rule doesn't turn the portal's glass white.
const DARK_CSS = `
.light .cb-dark .liquid-glass{background:linear-gradient(160deg,hsla(0,0%,100%,.06) 0%,hsla(0,0%,100%,.04) 30%,hsla(0,0%,100%,.02) 50%,hsla(0,0%,100%,.04) 70%,hsla(0,0%,100%,.06) 100%);backdrop-filter:blur(16px) saturate(1.2);-webkit-backdrop-filter:blur(16px) saturate(1.2);border:1px solid hsla(0,0%,100%,.07);box-shadow:inset 0 1px 0 hsla(0,0%,100%,.08),inset 0 -1px 0 hsla(0,0%,0%,.08),0 8px 32px hsla(0,0%,0%,.25),0 2px 8px hsla(0,0%,0%,.15)}
.light .cb-dark .dynamic-bg,.light .cb-dark.dynamic-bg{background:radial-gradient(ellipse 80% 60% at 20% 80%,hsla(240,8%,12%,.5) 0%,transparent 70%),radial-gradient(ellipse 60% 50% at 80% 20%,hsla(220,10%,10%,.4) 0%,transparent 70%),radial-gradient(ellipse 90% 70% at 50% 50%,hsla(0,0%,6%,1) 0%,hsla(0,0%,4%,1) 100%);background-size:100% 100%}
`;

/** Dark portal surface. In the dark page it changes nothing. */
export function PortalDark({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`cb-dark bg-background text-foreground ${className}`} style={{ ...DARK_VARS, ...style }}>
      <style>{DARK_CSS}</style>
      {children}
    </div>
  );
}

/** Crossfade layer: stays mounted, fades with the app's ease. */
export function Layer({ on, children, className = '', thumb = false, ms = 520 }: { on: boolean; children: ReactNode; className?: string; thumb?: boolean; ms?: number }) {
  return (
    <div className={`absolute inset-0 ${on ? '' : 'pointer-events-none'} ${className}`} aria-hidden={!on}
      style={{ opacity: on ? 1 : 0, transition: thumb ? 'none' : `opacity ${ms}ms ${EASE_CSS}` }}>
      {children}
    </div>
  );
}
