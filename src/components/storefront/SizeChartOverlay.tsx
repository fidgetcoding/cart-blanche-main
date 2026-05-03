import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { fetchSizeChart, type SizeChart } from '@/lib/size-charts';

interface SizeChartOverlayProps {
  open: boolean;
  category?: string;
  onClose: () => void;
  /** Use 'maison' for SL template light styling; defaults to dark/neutral. */
  variant?: 'maison' | 'default';
  /**
   * Where the chart appears on screen:
   *   'viewport'     — centered modal with full-viewport dim (default)
   *   'right-panel'  — centered in right 45%, dim only over right 45%
   *                    (Maison/SL detail — keeps product image on left visible)
   *   'right-drawer' — slides in from right edge, 380px wide, no dim at all
   *                    (YZ detail — keeps centered product fully lit)
   */
  placement?: 'viewport' | 'right-panel' | 'right-drawer';
}

export function SizeChartOverlay({
  open,
  category,
  onClose,
  variant = 'default',
  placement = 'viewport',
}: SizeChartOverlayProps) {
  const [chart, setChart] = useState<SizeChart | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const host = anchorRef.current?.closest<HTMLElement>('[data-storefront-root]') ?? document.body;
    setPortalTarget(host);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchSizeChart(category ?? 'shirt').then(c => { if (alive) setChart(c); });
    return () => { alive = false; };
  }, [open, category]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  const isMaison = variant === 'maison';
  const backdropTone = isMaison ? 'bg-foreground/40' : 'bg-background/80';

  const chartCard = (
    <>
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-2 rounded-lg hover:bg-foreground/10 transition-colors z-10"
        aria-label="Close"
      >
        <X className="w-4 h-4 text-foreground/70" />
      </button>

      <div className="px-6 pt-5 pb-2">
        <p className="text-[10px] tracking-[0.25em] uppercase text-foreground/50 font-display">
          Size Chart
        </p>
        <h2 className="mt-1 text-lg font-display tracking-wide text-foreground">
          {chart?.name ?? 'Loading...'}
        </h2>
        <p className="mt-1 text-[10px] tracking-widest uppercase text-foreground/40">
          Measurements in {chart?.unit ?? 'in'}
        </p>
      </div>

      <div className="px-6 pb-6 pt-3 overflow-x-auto">
        {chart ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-foreground/15">
                {chart.headers.map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-3 py-2 text-[10px] font-display tracking-[0.18em] uppercase text-foreground/60"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-foreground/10 last:border-0">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2.5 text-foreground/85 ${ci === 0 ? 'font-display tracking-wider text-foreground' : ''}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center text-xs text-foreground/40 tracking-widest uppercase">
            Loading...
          </div>
        )}
      </div>
    </>
  );

  const isScoped = !!portalTarget && portalTarget !== document.body;
  const positionClass = isScoped ? 'absolute' : 'fixed';

  return (
    <>
      <span ref={anchorRef} style={{ display: 'none' }} aria-hidden />
      {portalTarget && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className={`${positionClass} inset-0 z-[100] ${isMaison ? 'light' : ''}`}
              onClick={onClose}
            >
              {placement === 'viewport' && (
                <div className={`absolute inset-0 backdrop-blur-md ${backdropTone}`} />
              )}
              {placement === 'right-panel' && (
                <div className={`absolute inset-y-0 right-0 w-[45%] backdrop-blur-md ${backdropTone}`} />
              )}

              {placement === 'viewport' && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 8, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    onClick={e => e.stopPropagation()}
                    className="relative w-full max-w-2xl rounded-xl border border-foreground/15 bg-background shadow-2xl"
                  >
                    {chartCard}
                  </motion.div>
                </div>
              )}

              {placement === 'right-panel' && (
                <div className="absolute inset-y-0 right-0 w-[45%] flex items-center justify-center p-6">
                  <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 8, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    onClick={e => e.stopPropagation()}
                    className="relative w-full max-w-md rounded-xl border border-foreground/15 bg-background shadow-2xl"
                  >
                    {chartCard}
                  </motion.div>
                </div>
              )}

              {placement === 'right-drawer' && (
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  onClick={e => e.stopPropagation()}
                  className="absolute inset-y-0 right-0 w-[min(380px,90vw)] bg-background border-l border-foreground/20 shadow-2xl overflow-y-auto"
                >
                  {chartCard}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        portalTarget
      )}
    </>
  );
}
