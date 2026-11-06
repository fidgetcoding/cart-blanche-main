// The close's trigger: the visitor has reached the end of the page.
import { useEffect, useState } from 'react';

/** True once the visitor reaches the bottom of the page (after scrolling at least a screen), and false again once
 *  they scroll back up past a little slack, so the momentum of a swipe settling at the end never toggles it. */
export function useAtEnd(on: boolean) {
  const [end, setEnd] = useState(false);
  useEffect(() => {
    if (!on) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      const gap = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      const deep = window.scrollY > window.innerHeight;
      setEnd(prev => deep && (prev ? gap <= 120 : gap <= 8));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
  }, [on]);
  return end;
}
