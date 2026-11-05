// Template Lab chapter UI: the portal's Template Lab page (lab/LabIndex.tsx cards, ACTIVE moving from
// YZ to SL), the two live storefronts as the real phone screenshots, then the Coming to the Lab list.
import { FlaskConical } from 'lucide-react';
import { COPY } from '../../copy';
import { Fit, Layer, PortalDark } from './core';
import { LabPage } from './pages';
import { LabPanel } from './portal';

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

function Phone({ src, name, on }: { src: string; name: string; on: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 h-full min-h-0">
      <div className={`flex-1 min-h-0 aspect-[390/700] rounded-xl overflow-hidden border transition-colors duration-500 ${on ? 'border-foreground/40' : 'border-border'}`}>
        <img src={src} alt={name} className="w-full h-full object-cover object-top" loading="lazy" />
      </div>
      <p className={`text-[10px] font-display tracking-[0.2em] uppercase transition-colors duration-500 ${on ? 'text-foreground' : 'text-muted-foreground'}`}>{name}</p>
    </div>
  );
}

/** Template Lab, three beats: 0 two whole ways to shop · 1 switch the live store · 2 what lands in the Lab next. */
export function LabVisual({ step, t, thumb = false, compact = false }: { step: number; t: number; thumb?: boolean; compact?: boolean }) {
  const active: 'yz' | 'sl' = step === 0 || (step === 1 && t < 0.5) ? 'yz' : 'sl';
  const shown = thumb ? 4 : step === 2 ? Math.min(4, 1 + Math.floor(t * 5)) : 0;
  const phones = (
    <div className="h-full grid grid-cols-2 gap-4 justify-items-center">
      <Phone src={COPY.shots.mobileYZ} name="YZ" on={active === 'yz'} />
      <Phone src={COPY.shots.mobileSL} name="SL" on={active === 'sl'} />
    </div>
  );
  if (compact) {
    // On a phone the Lab page itself carries the switch; the cards stack and ACTIVE moves.
    return (
      <div className="w-full h-full overflow-hidden">
        <PortalDark className="rounded-xl border border-border dynamic-bg overflow-hidden h-full"><LabPage active={active} stack /></PortalDark>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col gap-4">
      <Fit w={1060} h={250} className="w-full flex-shrink-0 aspect-[1060/250]" grow><LabPanel active={active} /></Fit>
      <div className="relative flex-1 min-h-0">
        <Layer on={step < 2} thumb={thumb}>{phones}</Layer>
        <Layer on={step === 2} thumb={thumb} className="flex items-center"><div className="w-full"><ComingList shown={shown} thumb={thumb} /></div></Layer>
      </div>
    </div>
  );
}
