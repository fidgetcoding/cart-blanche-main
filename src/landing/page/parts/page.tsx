// The landing page: the store bar as chapter nav (with its pulsing Enter the demo), the hero, problem,
// system, the lens story, compare and close, the page hint (scroll cue, then photo bars) fixed at the
// bottom, and the opening that scrolls itself to SmartShop until the visitor touches anything.
import { useRef, useState } from 'react';
import type { LabOptionProps } from '../../types';
import { useNarrow } from '../lib/core';
import { useAutoIntro } from '../lib/intro';
import { mobileGoTo, useMobileNav } from '../lib/mobile';
import { PageHint, StoreBar } from './chrome';
import { Story, type Nav } from './lens';
import { MobileStory } from './mobile';
import { Close, Compare, Hero, Problem, System } from './sections';

export function LensPage({ screen, thumb }: LabOptionProps) {
  const narrow = useNarrow();
  const [nav, setNav] = useState<Nav>({ active: 'all', reached: -1 });
  const jumpRef = useRef<(id: string) => void>(() => {});
  const mNav = useMobileNav(narrow && !thumb);
  const cur = narrow ? mNav : nav;
  const pick = (id: string) => (narrow ? mobileGoTo(id) : jumpRef.current(id));
  useAutoIntro(!thumb && screen !== 'story');
  return (
    <div className="relative w-full overflow-x-clip">
      <StoreBar active={cur.active} onPick={pick} />
      <Hero thumb={thumb} narrow={narrow} />
      <Problem narrow={narrow} />
      <System thumb={thumb} narrow={narrow} />
      {narrow ? <MobileStory thumb={thumb} /> : <Story thumb={thumb} onNav={setNav} jumpRef={jumpRef} />}
      <Compare narrow={narrow} />
      <Close narrow={narrow} />
      <PageHint progress={cur.reached} thumb={thumb} />
    </div>
  );
}
