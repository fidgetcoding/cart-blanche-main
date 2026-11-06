// Template Lab chapter UI, one beat per tag: YZ and SL (the portal's Templates page with ACTIVE moving, and the
// live storefront each one publishes), Settings and AI Template Builder (the SL editor, SlTemplate.tsx, styling
// that same live store), then Coming to the Lab. The store sits still on the right the whole chapter; only the
// column beside it changes, so every change reads as a change to the store.
import { lazy, memo, Suspense, type ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import { COPY } from '../../copy';
import { DARK_VARS, PAGE1 } from '../lib/core';
import { FitWidth, Layer, PortalDark } from './core';
import { LiveShop } from './live';
import { LabPage } from './pages';
import { BrandBar } from './portal';

const COMING = COPY.features[5].coming;

/** The Coming to the Lab list: the LabIndex card shape with a dashed edge and no switch, labelled. */
export function ComingList({ shown = 4, thumb = false, cols = 2, label = true }: { shown?: number; thumb?: boolean; cols?: 1 | 2; label?: boolean }) {
  return (
    <div>
      {label && <p className="text-[10px] font-display tracking-[0.2em] uppercase text-muted-foreground mb-3">{COMING.label}</p>}
      <div className={`grid ${cols === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
        {COMING.items.map((it, i) => (
          <div key={it} className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-foreground/20"
            style={{ opacity: i < shown ? 1 : 0, transition: thumb ? 'none' : 'opacity 500ms ease' }}>
            <div className="w-8 h-8 rounded-lg bg-foreground/5 border border-foreground/10 flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-3.5 h-3.5 text-muted-foreground/60" />
            </div>
            <span className="font-display text-xs tracking-[0.15em] text-foreground">{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// The SL store and the editor load with their own chunk, as the chapter comes close (`warm`).
const editor = () => import('./lab-editor');
const LabStore = lazy(() => editor().then(m => ({ default: m.LabStore })));
const LabSidebar = lazy(() => editor().then(m => ({ default: m.LabSidebar })));
const LabControls = lazy(() => editor().then(m => ({ default: m.LabControls })));
const LabChat = lazy(() => editor().then(m => ({ default: m.LabChat })));

/** The chapter's beats, in copy.ts tag order, then Coming to the Lab. */
const BEAT = { yz: 0, sl: 1, settings: 2, ai: 3, coming: 4 } as const;

/** SlTemplate.tsx fake browser chrome over the live preview. */
function BrowserBar() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-t-xl border border-b-0 border-border/30 flex-shrink-0">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
      </div>
      <div className="flex-1 bg-muted/40 rounded-md px-3 py-1 text-[10px] font-mono text-muted-foreground tracking-wider text-center">
        yourstore.cartblanche.com
      </div>
    </div>
  );
}

/** The whole chapter is a picture of the editor: nothing in it takes focus or clicks. */
const inert = (el: HTMLElement | null) => el?.setAttribute('inert', '');

/** The YZ storefront: the spatial canvas, in its dark tokens. Memoised: it holds still while the chapter scrolls. */
const YZ_SCENE = { cam: 'all' } as const;
const YzStore = memo(function YzStore({ thumb }: { thumb: boolean }) {
  return (
    <div className="cb-dark absolute inset-0" style={DARK_VARS}>
      <LiveShop products={PAGE1} scene={YZ_SCENE} live={false} controls={false} pills thumb={thumb} />
    </div>
  );
});

/** The portal's Templates page as a column (lab/LabIndex.tsx cards, stacked), with the Lab's next looks under it. */
function TemplatesColumn({ active, coming, thumb }: { active: 'yz' | 'sl'; coming: number; thumb: boolean }) {
  return (
    <PortalDark className="w-[380px] h-full flex flex-col border-r border-border/50 dynamic-bg">
      <BrandBar />
      <LabPage active={active} stack />
      <div className="px-6" style={{ opacity: coming ? 1 : 0, transition: thumb ? 'none' : 'opacity 500ms ease' }}>
        <ComingList shown={coming} cols={1} thumb={thumb} />
      </div>
    </PortalDark>
  );
}

/** Template Lab, five beats: 0 YZ · 1 SL · 2 Settings · 3 AI Template Builder · 4 Coming to the Lab. `warm`: the
 *  chapter is close, so the SL store and the editor mount ahead of their beats. */
export function LabVisual({ step, t, thumb = false, compact = false, warm = false }: { step: number; t: number; thumb?: boolean; compact?: boolean; warm?: boolean }) {
  const active: 'yz' | 'sl' = step === BEAT.yz ? 'yz' : 'sl';
  const editing = step === BEAT.settings || step === BEAT.ai;
  const coming = thumb ? 4 : step === BEAT.coming ? Math.min(4, 1 + Math.floor(t * 5)) : 0;
  const slOn = warm || step >= BEAT.sl;
  const store: ReactNode = (
    <>
      <Layer on={active === 'yz'} thumb={thumb}><YzStore thumb={thumb} /></Layer>
      <Layer on={active === 'sl'} thumb={thumb}>{slOn && <Suspense fallback={null}><LabStore step={step} t={t} /></Suspense>}</Layer>
    </>
  );

  if (compact) {
    // A phone: the column becomes a short panel over the store (the two templates, the controls, or the chat).
    return (
      <div ref={inert} data-lab className="w-full h-full flex flex-col overflow-hidden" style={{ ...DARK_VARS, background: 'hsl(0 0% 5%)' }}>
        <PortalDark className="relative h-[150px] flex-shrink-0 border-b border-border/50 dynamic-bg">
          <Layer on={!editing} thumb={thumb} className="flex flex-col justify-center gap-2 px-3">
            {(['yz', 'sl'] as const).map(id => (
              <div key={id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl liquid-glass">
                <span className="font-display text-xs tracking-[0.15em] text-foreground">{id.toUpperCase()} Template</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-display tracking-wider transition-all ${
                  id === active ? 'bg-success/15 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20' : 'bg-foreground/5 text-muted-foreground border border-foreground/10'
                }`}>{id === active ? 'ACTIVE' : 'SET ACTIVE'}</span>
              </div>
            ))}
          </Layer>
          <Layer on={step === BEAT.settings} thumb={thumb}>{slOn && <Suspense fallback={null}><LabControls step={step} t={t} /></Suspense>}</Layer>
          <Layer on={step === BEAT.ai} thumb={thumb} className="flex flex-col justify-end gap-2 p-3">
            {slOn && <Suspense fallback={null}><LabChat step={step} t={t} /></Suspense>}
          </Layer>
        </PortalDark>
        {/* The store drawn a little wider and scaled to fit, so a phone's short window still shows its pieces. */}
        <FitWidth w={540} className="flex-1 min-h-0">{h => <div className="relative" style={{ width: 540, height: h }}>{store}</div>}</FitWidth>
      </div>
    );
  }
  return (
    <FitWidth w={1440} minH={760} className="w-full h-full">
      {h => (
        <div ref={inert} data-lab className="relative w-[1440px] flex" style={{ height: h, ...DARK_VARS, background: 'hsl(0 0% 5%)' }}>
          <div className="relative w-[380px] flex-shrink-0 h-full">
            <Layer on={!editing} thumb={thumb}><TemplatesColumn active={active} coming={coming} thumb={thumb} /></Layer>
            <Layer on={editing} thumb={thumb}>{(warm || step >= BEAT.settings) && <Suspense fallback={null}><LabSidebar step={step} t={t} thumb={thumb} /></Suspense>}</Layer>
          </div>
          {/* SlTemplate.tsx's live preview column: the browser bar and the store. */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background p-4">
            <BrowserBar />
            <div className="relative flex-1 min-h-0 rounded-b-xl border border-border/30 overflow-hidden bg-background">{store}</div>
          </div>
        </div>
      )}
    </FitWidth>
  );
}
