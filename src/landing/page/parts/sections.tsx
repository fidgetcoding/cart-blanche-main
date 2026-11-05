// Landing sections around the story: hero, problem, system, compare and close.
// All copy is copy.ts, word for word. Cards copy AdminDashboard.tsx StatCard / ChartCard markup.
import { useEffect, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { COPY } from '../../copy';
import { PAGE1, balance, useSize } from '../lib/core';
import { Cta, Micro, SiteFooter, Under } from './chrome';
import { Fit } from './core';
import { LiveShop } from './live';
import { StoreCanvas } from './shop';
import { Drawer } from './cart';
import { PortalFrame } from './portal';

const sentences = (s: string) => s.split(/(?<=\.)\s+/);

/** A head, one sentence per line (a long sentence balances onto two). */
export function Head({ text, className = '', as = 'h2' }: { text: string; className?: string; as?: 'h1' | 'h2' }) {
  const Tag = as;
  return (
    <Tag className={`font-display font-bold ${className}`}>
      {sentences(text).map((s, i) => <span key={s} className="block" style={balance}>{i > 0 && ' '}{s}</span>)}
    </Tag>
  );
}

/** Hero copy: the eyebrow and the headline. The way into the demo is the bar's button. */
function HeroCopy({ className = '' }: { className?: string }) {
  const h = COPY.hero;
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <Micro>{h.eyebrow}</Micro>
      <h1 className="font-display font-bold mt-4 text-[64px] leading-[1.02]" style={balance}>{h.headline}</h1>
    </div>
  );
}

/** The hero's store drifts slowly along its wall (the way B1's hero store did) until a visitor takes it. */
const DRIFT = [{ x: 0, y: 0, w: 1943, h: 586 }, { x: 311, y: 0, w: 1943, h: 586 }];
function DriftShop({ thumb }: { thumb: boolean }) {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (thumb) return;
    const id = setInterval(() => setK(v => 1 - v), 6000);
    return () => clearInterval(id);
  }, [thumb]);
  return <LiveShop products={PAGE1} cols={10} scene={{ cam: DRIFT[k], max: 0.7 }} homeMax={0.6} ms={3600} thumb={thumb} inset={{ top: 268, bottom: 92, pad: 40 }} />;
}

/** 0. Hero. Almost empty: the copy over the live store, which carries on behind it. On a phone the store
 *  fills the rest of the first screen, four across so the pieces read bigger. */
export function Hero({ thumb, narrow }: { thumb: boolean; narrow: boolean }) {
  if (narrow) {
    const h = COPY.hero;
    return (
      <section id="top" className="min-h-[100svh] flex flex-col px-4 pt-[82px] pb-16">
        <Micro>{h.eyebrow}</Micro>
        <h1 className="font-display font-bold text-[34px] leading-[1.05] mt-3" style={balance}>{h.headline}</h1>
        <div className="relative flex-1 min-h-[380px] mt-7 rounded-xl border border-border overflow-hidden">
          <div className="absolute inset-0">
            <LiveShop products={PAGE1} cols={4} scene={{ cam: 'all' }} homeMax={0.44} thumb={thumb} controls={false} />
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
}

/** 1. Problem: the head, then the question that leads into the system. */
export function Problem({ narrow }: { narrow: boolean }) {
  const p = COPY.problem;
  return (
    <section id="problem" className={narrow ? 'px-4 py-16' : 'px-10 pt-32 pb-24 max-w-[1320px] mx-auto'}>
      <Head text={p.head} className={narrow ? 'text-[28px] leading-[1.08]' : 'text-[52px] leading-[1.05]'} />
      <p className={`font-display font-semibold text-muted-foreground ${narrow ? 'text-lg mt-8' : 'text-[26px] mt-12'}`} style={balance}>{p.question}</p>
    </section>
  );
}

function SystemStore({ thumb }: { thumb: boolean }) {
  const [ref, size] = useSize<HTMLDivElement>();
  return (
    <div ref={ref} className="absolute inset-0">
      {size.w > 0 && <StoreCanvas products={PAGE1} view={{ w: size.w, h: size.h, top: 18, bottom: 18, pad: 18 }} cam={{ x: 0, y: 0, w: 1124, h: 1224 }} thumb={thumb} />}
    </div>
  );
}

/** 2. The system: SmartShop, SmartCart and Smart Portal, each as itself. */
export function System({ thumb, narrow }: { thumb: boolean; narrow: boolean }) {
  const s = COPY.system;
  const shows: ReactNode[] = [
    <div key="shop" className="relative w-full h-full dynamic-bg"><SystemStore thumb={thumb} /></div>,
    <Fit key="cart" w={384} h={560} className="w-full h-full dynamic-bg" align="top" grow><div className="w-[384px] h-[560px]"><Drawer step={0} t={1} thumb /></div></Fit>,
    <Fit key="portal" w={1440} h={900} className="w-full h-full" style={{ background: 'hsl(0 0% 5%)' }} align="left" grow><PortalFrame route="dashboard" pages={['dashboard']} thumb={thumb} /></Fit>,
  ];
  return (
    <section id="system" className={narrow ? 'px-4 py-14' : 'px-10 pt-8 pb-28 max-w-[1320px] mx-auto'}>
      <Head text={s.head} className={`${narrow ? 'text-[28px]' : 'text-[44px]'} leading-[1.08]`} />
      <div className={`grid ${narrow ? 'grid-cols-1 gap-6 mt-8' : 'grid-cols-3 gap-4 mt-12'}`}>
        {s.parts.map((part, i) => (
          <div key={part.name} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            <div className={`${narrow ? 'h-[240px]' : 'h-[300px]'} border-b border-border overflow-hidden`}>{shows[i]}</div>
            <div className="p-5">
              <Micro>{part.role}</Micro>
              <p className="font-display text-3xl font-bold mt-1">{part.name}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 9. Compare, as a ChartCard table. */
export function Compare({ narrow }: { narrow: boolean }) {
  const c = COPY.compare;
  return (
    <section id="compare" className={narrow ? 'px-4 py-14' : 'px-10 pt-28 pb-16 max-w-[1100px] mx-auto'}>
      <h2 className={`font-display font-bold ${narrow ? 'text-[28px]' : 'text-[44px]'} leading-[1.08]`} style={balance}>{c.head}</h2>
      <div className="bg-card border border-border rounded-xl overflow-hidden mt-8">
        {c.rows.map(([a, b], i) => (
          <div key={a} className={`grid grid-cols-2 ${i ? 'border-t border-border' : ''}`}>
            <p className={`text-muted-foreground ${narrow ? 'text-xs px-3 py-3' : 'text-sm px-6 py-4'}`}>{a}</p>
            <p className={`flex items-start gap-2 font-display font-medium ${narrow ? 'text-xs px-3 py-3' : 'text-sm px-6 py-4'}`}>
              <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-foreground/70" />{b}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 11. Close: the invite, the CTA, the footer. */
export function Close({ narrow }: { narrow: boolean }) {
  return (
    <section id="close" className={narrow ? 'pt-16 pb-14' : 'pt-24 pb-16'}>
      <div className={narrow ? 'px-4' : 'px-10 max-w-[1100px] mx-auto text-center flex flex-col items-center'}>
        <p className={`font-display font-bold ${narrow ? 'text-[28px]' : 'text-[44px]'} leading-[1.1]`} style={balance}>{COPY.close.invite}</p>
        <Cta className="mt-8" pulse />
        <Under className="mt-3" />
      </div>
      <SiteFooter className={narrow ? 'mt-14' : 'mt-20'} />
    </section>
  );
}
