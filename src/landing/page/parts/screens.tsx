// The six feature screens, each the real UI at one of its tag beats. One beat per copy.ts tag; the Template
// Lab gets one more beat for its Coming to the Lab list.
import type { ReactNode } from 'react';
import { FEATURES } from '../lib/features';
import { PAGE1 } from '../lib/core';
import { storyScene } from '../lib/shop';
import { FitWidth } from './core';
import { LiveShop } from './live';
import { SetVisual } from './set';
import { CartVisual } from './cart';
import { ManagerVisual, PortalFrame, type Route } from './portal';
import { LabVisual } from './lab';

const PORTAL_ROUTES: Route[] = ['dashboard', 'inventory', 'orders', 'waitlist', 'grid'];

/** Smart Portal, one page per tag: Dashboard, Inventory, Orders, Waitlists, Grid Editor. */
function PortalScreen({ beat, t, thumb, compact }: { beat: number; t: number; thumb: boolean; compact: boolean }) {
  const route = PORTAL_ROUTES[Math.min(beat, PORTAL_ROUTES.length - 1)];
  const gt = route === 'grid' ? t : 0;
  if (compact) return <PortalFrame route={route} pages={PORTAL_ROUTES} t={gt} thumb={thumb} compact="page" />;
  return (
    <FitWidth w={1440} minH={720} className="w-full h-full" style={{ background: 'hsl(0 0% 5%)' }}>
      {h => <PortalFrame route={route} pages={PORTAL_ROUTES} t={gt} thumb={thumb} h={h} />}
    </FitWidth>
  );
}

function Pad({ children, compact }: { children: ReactNode; compact: boolean }) {
  return <div className={`w-full h-full dynamic-bg ${compact ? '' : 'p-5'}`}>{children}</div>;
}

export function Screen({ fi, beat, t, thumb = false, live = false, compact = false }: {
  fi: number; beat: number; t: number; thumb?: boolean; live?: boolean; compact?: boolean;
}) {
  switch (FEATURES[fi].id) {
    case 'smartshop': return <LiveShop products={PAGE1} scene={storyScene(beat, t)} live={live} thumb={thumb} pills />;
    case 'buildaset': return <Pad compact={compact}><SetVisual step={beat} t={t} thumb={thumb} side={!compact} /></Pad>;
    case 'smartcart': return <CartVisual step={beat} t={t} thumb={thumb} framed={false} />;
    case 'portal': return <PortalScreen beat={beat} t={t} thumb={thumb} compact={compact} />;
    // On every page: the manager's prompts follow the page, from Inventory on (Dashboard is the portal's own first look).
    case 'manager': return <ManagerVisual step={beat === 0 ? 0 : 2} t={beat === 0 ? 0.26 + 0.74 * t : 1} thumb={thumb} compact={compact} framed={false} />;
    default: return <Pad compact={compact}><LabVisual step={beat} t={beat === 1 ? 1 : t} thumb={thumb} compact={compact} /></Pad>;
  }
}
