// Phones get the story as a plain vertical sequence: each chapter's head, then its real UI pinned while the
// tags under it light one by one. The SmartShop canvas stays live (drag sideways, pinch, tap a piece).
import { useRef } from 'react';
import { BEATS, FEATURES, nn, tagsOf } from '../lib/features';
import { useBeat } from '../lib/core';
import { chapterId } from '../lib/mobile';
import { Micro } from './chrome';
import { ComingList } from './lab';
import { Screen } from './screens';
import { Head } from './sections';

function MobileChapter({ fi, thumb }: { fi: number; thumb: boolean }) {
  const f = FEATURES[fi];
  const ref = useRef<HTMLDivElement>(null);
  const beat = useBeat(ref, BEATS[fi]);
  const tags = tagsOf(fi);
  return (
    <section id={chapterId(fi)} className="px-4 pt-14 pb-2 border-t border-border">
      <Micro>{nn(fi)} / 06 · {f.label}</Micro>
      <Head text={f.head} className="text-[28px] leading-[1.08] mt-3" />
      <div ref={ref} className="relative mt-6">
        <div className="sticky top-[66px] z-10 bg-background pb-3">
          <div className="h-[46vh] rounded-xl border border-border overflow-hidden bg-background">
            <Screen fi={fi} beat={thumb ? 0 : beat} t={1} thumb={thumb} live={fi === 0} compact />
          </div>
        </div>
        <ol>
          {tags.map((tg, k) => (
            <li key={tg} data-beat className={`pt-2 ${k === tags.length - 1 ? 'pb-10' : 'min-h-[20vh]'}`}>
              <div className="flex items-center gap-3">
                <span className={`w-1 h-4 rounded-full flex-shrink-0 transition-colors duration-500 ${k === beat ? 'bg-foreground/80' : 'bg-foreground/15'}`} />
                <span className={`text-[11px] font-display tracking-[0.2em] uppercase transition-colors duration-500 ${k === beat ? 'text-foreground' : 'text-muted-foreground'}`}>{tg}</span>
              </div>
            </li>
          ))}
        </ol>
        {f.id === 'lab' && <div className="pb-8"><ComingList cols={1} thumb={thumb} label={false} /></div>}
      </div>
    </section>
  );
}

export function MobileStory({ thumb }: { thumb: boolean }) {
  return <div>{FEATURES.map((f, fi) => <MobileChapter key={f.id} fi={fi} thumb={thumb} />)}</div>;
}
