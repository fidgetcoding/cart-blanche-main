// Landing sections ahead of the story: hero, problem and system. All copy is copy.ts, word for word.
// Each section is memoised: the page re-renders whenever the nav lights a new chapter, and they never need to.
import { memo } from 'react';
import { COPY } from '../../copy';
import { PAGE1, balance } from '../lib/core';
import { LiveShop } from './live';
import { SystemHand } from './hand';

const sentences = (s: string) => s.split(/(?<=\.)\s+/);

/**
 * A head, one sentence per line (a long sentence balances onto two). `oneLine`: from lg up the sentences run on
 * one line that never wraps, so the head also needs a font-size there that follows the viewport (a class like
 * `lg:[font-size:min(52px,calc(...))]`, measured from the head's own width in Space Grotesk bold).
 */
export function Head({ text, className = '', oneLine = false }: { text: string; className?: string; oneLine?: boolean }) {
  return (
    <h2 className={`font-display font-bold ${oneLine ? 'lg:whitespace-nowrap' : ''} ${className}`}>
      {sentences(text).map((s, i) => <span key={s} className={`block ${oneLine ? 'lg:inline' : ''}`} style={balance}>{i > 0 && ' '}{s}</span>)}
    </h2>
  );
}

/** Hero copy: the headline, on one line from lg up. The way into the demo is the bar's button. */
function HeroCopy({ className = '' }: { className?: string }) {
  const h = COPY.hero;
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* 0.0361 = 0.97 / the headline's width at 1px (26.84 px per px of Space Grotesk bold), inside px-6. */}
      <h1 className="font-display font-bold text-[64px] leading-[1.02] lg:whitespace-nowrap lg:[font-size:min(64px,calc((100vw_-_48px)_*_0.0361))]" style={balance}>{h.headline}</h1>
    </div>
  );
}

/** The hero's store, ten across: framed from its left end, it pans left and right along its wall on its own from
 *  the moment the page loads (LiveShop's idle drift) until a visitor takes it, and holds still under reduced motion. */
const HERO_CAM = { x: 0, y: 0, w: 1943, h: 586 };
function DriftShop({ thumb }: { thumb: boolean }) {
  return <LiveShop products={PAGE1} cols={10} scene={{ cam: HERO_CAM, max: 0.7 }} homeMax={0.6} thumb={thumb} inset={{ top: 268, bottom: 92, pad: 40 }} pan />;
}

/** 0. Hero. Almost empty: the copy over the live store, which carries on behind it. On a phone the store
 *  fills the rest of the first screen, four across so the pieces read bigger. */
export const Hero = memo(function Hero({ thumb, narrow }: { thumb: boolean; narrow: boolean }) {
  if (narrow) {
    const h = COPY.hero;
    return (
      <section id="top" className="min-h-[100svh] flex flex-col px-4 pt-[82px] pb-16">
        <h1 className="font-display font-bold text-[34px] leading-[1.05]" style={balance}>{h.headline}</h1>
        <div className="relative flex-1 min-h-[380px] mt-7 rounded-xl border border-border overflow-hidden">
          <div className="absolute inset-0">
            <LiveShop products={PAGE1} cols={4} scene={{ cam: 'all' }} homeMax={0.44} thumb={thumb} controls={false} pan />
          </div>
        </div>
      </section>
    );
  }
  return (
    <section id="top" className="relative h-screen min-h-[720px]">
      <div className="absolute inset-0 pt-[82px]">
        <DriftShop thumb={thumb} />
      </div>
      <HeroCopy className="absolute left-0 right-0 top-[150px] px-6 pointer-events-none" />
    </section>
  );
});

/** 1. Problem: the head, then the question that leads into the system. */
export const Problem = memo(function Problem({ narrow }: { narrow: boolean }) {
  const p = COPY.problem;
  return (
    <section id="problem" className={narrow ? 'px-4 py-16' : 'px-10 pt-32 pb-24 max-w-[1320px] mx-auto'}>
      {/* 0.0344 = 0.97 / 28.17, the head's width per px of type, inside the 1320px column's px-10. */}
      <Head text={p.head} oneLine className={narrow ? 'text-[28px] leading-[1.08]' : 'text-[52px] leading-[1.05] lg:[font-size:min(52px,calc((min(100vw,1320px)_-_80px)_*_0.0344))]'} />
      <p className={`font-display font-semibold text-muted-foreground ${narrow ? 'text-lg mt-8' : 'text-[26px] mt-12'}`} style={balance}>{p.question}</p>
    </section>
  );
});

/**
 * 2. The system: its head on one line, then SmartShop, SmartCart and SmartPortal as a hand of cards (a swipe on a
 * phone). `lead`: it follows the hero directly (no Problem), so it opens with the room the Problem gave the hero.
 */
export const System = memo(function System({ narrow, lead = false }: { narrow: boolean; lead?: boolean }) {
  return (
    <section id="system" className={narrow ? (lead ? 'pt-16 pb-14' : 'py-14') : `px-10 ${lead ? 'pt-32' : 'pt-8'} pb-28 max-w-[1320px] mx-auto`}>
      {/* 0.0371 = 0.97 / 26.13, the head's width per px of type, inside the 1320px column's px-10. */}
      <Head text={COPY.system.head} oneLine className={narrow ? 'px-4 text-[28px] leading-[1.08]' : 'text-center text-[44px] leading-[1.08] lg:[font-size:min(44px,calc((min(100vw,1320px)_-_80px)_*_0.0371))]'} />
      <div className={narrow ? 'mt-6' : 'mt-14'}><SystemHand narrow={narrow} /></div>
    </section>
  );
});
