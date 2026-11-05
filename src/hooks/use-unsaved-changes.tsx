import { useState, useEffect, useCallback, useId } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Hook that protects against accidental navigation when there are unsaved changes.
 * Shows a blocker dialog for in-app navigation and a browser prompt for tab close/refresh.
 *
 * Usage:
 *   const { isDirty, markDirty, markClean, BlockerDialog } = useUnsavedChanges();
 *   // Call markDirty() whenever user makes a change
 *   // Call markClean() after successful save
 *   // Render <BlockerDialog /> somewhere in your JSX
 */
export function useUnsavedChanges() {
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => setIsDirty(true), []);
  const markClean = useCallback(() => setIsDirty(false), []);

  // Block in-app navigation
  const blocker = useBlocker(isDirty);
  const titleId = useId();

  // Escape means stay, like the STAY button. It's caught first and stopped there, so a dialog
  // under this one (the discount form closes on Escape too) isn't dismissed by the same press.
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      blocker.reset();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [blocker]);

  // Block browser tab close / refresh
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  function BlockerDialog() {
    if (blocker.state !== 'blocked') return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="liquid-glass rounded-xl p-6 max-w-sm w-full mx-4 space-y-4 border border-foreground/10">
          <h3 id={titleId} className="font-display text-sm tracking-wider font-bold">UNSAVED CHANGES</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => blocker.reset?.()}
              className="px-4 py-2 text-[10px] font-display tracking-wider border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
            >
              STAY
            </button>
            <button
              onClick={() => blocker.proceed?.()}
              className="px-4 py-2 text-[10px] font-display tracking-wider bg-destructive text-destructive-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              LEAVE WITHOUT SAVING
            </button>
          </div>
        </div>
      </div>
    );
  }

  return { isDirty, markDirty, markClean, BlockerDialog };
}
