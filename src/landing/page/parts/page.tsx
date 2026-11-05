// The landing page: the store bar as chapter nav (with its pulsing Enter the demo), the hero, the problem and
// system (whichever lib/opening.ts keeps), the story, then straight to the footer; the page hint (scroll cue,
// then photo bars) fixed at the bottom, and the opening that scrolls itself to SmartShop until the visitor
// touches anything.
import { useRef, useState } from 'react';
import type { LabOptionProps } from '../../types';
import { useNarrow } from '../lib/core';
import { useAutoIntro } from '../lib/intro';
import { mobileGoTo, useMobileNav } from '../lib/mobile';
import { OPENING, sectionsFor } from '../lib/opening';
import { PageHint, SiteFooter, StoreBar } from './chrome';
import { Story, type Nav } from './lens';
import { MobileStory } from './mobile';
import { Hero, Problem, System } from './sections';

export function LensPage({ screen, thumb }: LabOptionProps) {
  const narrow = useNarrow();
  const show = sectionsFor(OPENING);
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
      {show.problem && <Problem narrow={narrow} />}
      {show.system && <System narrow={narrow} lead={!show.problem} />}
      {narrow ? <MobileStory thumb={thumb} /> : <Story thumb={thumb} onNav={setNav} jumpRef={jumpRef} />}
      <SiteFooter className={narrow ? 'mt-10' : 'mt-16'} />
      <PageHint progress={cur.reached} thumb={thumb} />
    </div>
  );
}
