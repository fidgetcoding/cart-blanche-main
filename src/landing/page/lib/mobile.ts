// Phone navigation for the vertical story: each chapter's id, which chapter you're in and how far you've
// come (for the pills and the photo bars), and the jump a pill makes.
import { useEffect, useState } from 'react';
import { scrollBehavior } from './core';
import { FEATURES } from './features';

export const chapterId = (fi: number) => (fi === 0 ? 'story' : `m-${FEATURES[fi].id}`);

/** Which chapter you're in and how far you've come, for the pills and the photo bars. */
export function useMobileNav(on: boolean) {
  const [nav, setNav] = useState({ active: 'all', reached: -1 });
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      let reached = -1, active = 'all';
      FEATURES.forEach((f, fi) => {
        const r = document.getElementById(chapterId(fi))?.getBoundingClientRect();
        if (!r || r.top > line) return;
        reached = fi;
        active = r.bottom > line ? f.id : 'all';
      });
      setNav(prev => (prev.active === active && prev.reached === reached ? prev : { active, reached }));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [on]);
  return nav;
}

export function mobileGoTo(id: string) {
  if (id === 'all') { window.scrollTo({ top: 0, behavior: scrollBehavior() }); return; }
  const fi = FEATURES.findIndex(f => f.id === id);
  const el = fi >= 0 ? document.getElementById(chapterId(fi)) : null;
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 58, behavior: scrollBehavior() });
}
