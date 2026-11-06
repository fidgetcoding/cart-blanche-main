// The landing page: the store bar as chapter nav (with its pulsing Enter the demo), the opening (the carousel,
// which also runs the self-scroll to SmartShop until the visitor touches anything), the problem and system
// (whichever lib/opening.ts keeps), the story, then straight to the footer; the page hint (scroll cue, then photo
// bars) fixed at the bottom, and the close: at the bottom, Enter the demo flies from the bar to the middle of a
// faded page.
import { useRef, useState } from 'react';
import type { LabOptionProps } from '../../types';
import { useNarrow } from '../lib/core';
import { mobileGoTo, useMobileNav } from '../lib/mobile';
import { OPENING, sectionsFor } from '../lib/opening';
import { useAtEnd } from '../lib/end';
import { EndCta, PageHint, SiteFooter, StoreBar } from './chrome';
import { Story, type Nav } from './lens';
import { MobileStory } from './mobile';
import { Opening } from '../opening/Opening';
import { Problem, System } from './sections';

export function LensPage({ thumb }: LabOptionProps) {
  const narrow = useNarrow();
  const show = sectionsFor(OPENING);
  const [nav, setNav] = useState<Nav>({ active: 'all', reached: -1 });
  const jumpRef = useRef<(id: string) => void>(() => {});
  const mNav = useMobileNav(narrow && !thumb);
  const cur = narrow ? mNav : nav;
  const pick = (id: string) => (narrow ? mobileGoTo(id) : jumpRef.current(id));
  const ended = useAtEnd(!thumb);
  const [away, setAway] = useState(false);
  return (
    <div className="relative w-full overflow-x-clip">
      <StoreBar active={cur.active} onPick={pick} away={away} />
      <Opening narrow={narrow} />
      {show.problem && <Problem narrow={narrow} />}
      {show.system && <System narrow={narrow} lead={!show.problem} />}
      {narrow ? <MobileStory thumb={thumb} /> : <Story thumb={thumb} onNav={setNav} jumpRef={jumpRef} />}
      <SiteFooter className={narrow ? 'mt-10' : 'mt-16'} />
      <PageHint progress={cur.reached} thumb={thumb} />
      {!thumb && <EndCta on={ended} onAway={setAway} />}
    </div>
  );
}
