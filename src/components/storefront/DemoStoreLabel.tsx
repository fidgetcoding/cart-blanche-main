import { useEffect, useState } from 'react';
import { isDemoMode } from '@/lib/demo/client';

/**
 * Tells visitors this store is sample data. It hangs below the wordmark rather than
 * taking up space in the header, so it can't move anything when it appears. The
 * wordmark's parent needs `relative`.
 */
export function DemoStoreLabel() {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let active = true;
    isDemoMode().then(demo => {
      if (active) setIsDemo(demo);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!isDemo) return null;

  return (
    <span
      className="absolute left-0 top-full whitespace-nowrap font-display uppercase text-muted-foreground pointer-events-none"
      style={{ fontSize: '8px', letterSpacing: '0.2em', lineHeight: 1 }}
    >
      Demo
    </span>
  );
}
