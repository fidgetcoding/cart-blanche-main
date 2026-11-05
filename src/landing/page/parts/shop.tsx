// Store pieces shared by the chapters: the real ProductTiles on a camera (the SmartCart backdrop), the
// store's category pills and gender symbols, and the size waitlist card. Markup copied from
// SpatialCanvas.tsx and WaitlistModal.tsx. The interactive SmartShop canvas lives in live.tsx.
import { memo } from 'react';
import { X, Ruler } from 'lucide-react';
import { ProductTile } from '@/components/storefront/ProductTile';
import { GenderSymbol } from '@/components/storefront/GenderSymbol';
import { getSwatchStyle } from '@/lib/swatch-style';
import type { DemoProduct } from '@/data/demo-data';
import { EASE_CSS } from '../lib/core';

const PITCH_X = 226, PITCH_Y = 306, COLS = 5;
const CATS = ['ALL', 'OUTERWEAR', 'STREETWEAR', 'NEW ARRIVALS', 'ESSENTIALS'];
const posOf = (i: number) => ({ x: (i % COLS) * PITCH_X, y: Math.floor(i / COLS) * PITCH_Y });
type Box = { x: number; y: number; w: number; h: number };
const noop = () => {};

/** Real ProductTiles on a camera. `cam` is a canvas box to fit into the view. */
export const StoreCanvas = memo(function StoreCanvas({ products, view, cam, hidden, dimmed, hovered = -1, maxScale = 1.4, thumb, ms = 900 }: {
  products: DemoProduct[]; view: { w: number; h: number; top: number; bottom: number; pad: number; left?: number }; cam: Box;
  hidden?: (i: number) => boolean; dimmed?: (i: number) => boolean; hovered?: number; maxScale?: number; thumb?: boolean; ms?: number;
}) {
  const l = view.left ?? view.pad;
  const vw = view.w - l - view.pad, vh = view.h - view.top - view.bottom;
  const s = Math.max(0.08, Math.min(maxScale, vw / cam.w, vh / cam.h));
  const x = l + (vw - cam.w * s) / 2 - cam.x * s;
  const y = view.top + (vh - cam.h * s) / 2 - cam.y * s;
  return (
    <div className="absolute left-0 top-0" style={{
      width: COLS * PITCH_X, height: 4 * PITCH_Y, transformOrigin: '0 0', transform: `translate(${x}px, ${y}px) scale(${s})`,
      transition: thumb ? 'none' : `transform ${ms}ms ${EASE_CSS}`,
    }}>
      {products.map((p, i) => {
        const gone = hidden?.(i) ?? false;
        return (
          <div key={p.id} style={{ opacity: gone ? 0 : 1, transition: thumb ? 'none' : `opacity 600ms ${EASE_CSS}` }}>
            <ProductTile product={p} scale={s} isFocused={false} isHovered={hovered === i} dimmed={dimmed?.(i) ?? false} actions={false}
              onClick={noop} onHoverStart={noop} onHoverEnd={noop} positionOverride={posOf(i)} />
          </div>
        );
      })}
    </div>
  );
});

/** Store category pills + gender symbols (SpatialCanvas.tsx top bar centre group). */
export function StoreCats({ active, gender = [], small = false }: { active: string; gender?: string[]; small?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 bg-foreground/[0.06] backdrop-blur-xl border border-foreground/[0.08] rounded-lg px-1.5 py-1 shadow-[0_4px_30px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]">
        {(small ? CATS.slice(0, 3) : CATS).map(cat => (
          <span key={cat} style={{ fontSize: 'var(--font-size-body, 10px)', fontFamily: 'var(--font-body)' }}
            className={`tracking-[0.15em] uppercase transition-all duration-300 rounded-md ${small ? 'px-2.5' : 'px-4'} py-1.5 whitespace-nowrap flex-shrink-0 ${
              active === cat
                ? 'bg-foreground/[0.12] text-foreground font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_3px_rgba(0,0,0,0.2)]'
                : 'text-muted-foreground'
            }`}>{cat.replace(/ /g, ' ')}</span>
        ))}
      </div>
      {!small && (
        <div className="flex items-center gap-2">
          {['MEN', 'WOMEN', 'UNISEX'].map(g => (
            <span key={g} className={`p-1 transition-all duration-200 ${gender.includes(g) ? 'text-foreground opacity-100' : 'text-muted-foreground opacity-40'}`}>
              <GenderSymbol gender={g.toLowerCase()} size={22} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** WaitlistModal.tsx card, size locked. Its close and join buttons work when handlers are passed. */
export function WaitlistCard({ product, size, colorIdx, onClose }: { product: DemoProduct; size: string; colorIdx: number; onClose?: () => void }) {
  return (
    <div className="w-full max-w-md rounded-2xl bg-background/80 backdrop-blur-xl border border-foreground/10 shadow-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-wide text-foreground">Join the waitlist</h2>
          <p className="mt-1 text-sm text-foreground/70 truncate">{product.title}</p>
          <p className="text-sm text-foreground/50">${product.price}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <p className="mt-4 text-xs text-foreground/60">Enter your details and we'll email you the moment this is back in stock.</p>
      <div className="mt-5 space-y-4">
        {['Name', 'Email'].map(l => (
          <label key={l} className="block">
            <span className="text-[11px] tracking-wider uppercase text-foreground/60">{l}</span>
            <span className="block w-full mt-1 px-3 py-2 bg-background/40 border border-foreground/20 rounded-lg text-sm h-[38px]" />
          </label>
        ))}
        <div>
          <span className="text-[11px] tracking-wider uppercase text-foreground/60">Size preference</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="px-3 py-1.5 rounded-md text-xs font-medium border bg-foreground text-background border-foreground">{size}</span>
            <span className="px-3 py-1.5 rounded-md text-xs font-medium border border-foreground/20 text-foreground/70 flex items-center gap-1.5"><Ruler className="w-3 h-3" />SIZE CHART</span>
          </div>
          <p className="mt-2 text-[11px] text-foreground/60">We'll notify you when this specific size is back in stock.</p>
        </div>
        {product.colorways && (
          <div>
            <span className="text-[11px] tracking-wider uppercase text-foreground/60">Color preference</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.colorways.map((c, i) => (
                <span key={c.id} title={c.name} style={getSwatchStyle(c)} className={`w-4 h-4 rounded-full border transition-all shrink-0 ${
                  i === colorIdx ? 'border-foreground/40 ring-2 ring-foreground ring-offset-2 ring-offset-background' : 'border-foreground/30'
                }`} />
              ))}
            </div>
          </div>
        )}
        <button type="button" onClick={onClose} className="block text-center w-full mt-2 py-2.5 rounded-lg bg-foreground text-background font-display font-semibold text-sm tracking-wider hover:opacity-90 transition-opacity">JOIN WAITLIST</button>
      </div>
    </div>
  );
}

