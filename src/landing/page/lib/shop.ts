// The SmartShop canvas geometry (SpatialCanvas.tsx tile size and pitch), the camera scene type, and the
// SmartShop chapter's four beats from the copy.ts tags: zoom out, drag, step in, size waitlists.
import type { DemoProduct } from '@/data/demo-data';
import { clamp01 } from './core';

export const TW = 220, TH = 280, PX = 226, PY = 306;
export type Box = { x: number; y: number; w: number; h: number };
export interface Open { i: number; color: number; size: string | null; img: number; waitlist: boolean }
export interface Scene { cam: Box | 'all'; max?: number; hovered?: number; open?: Open | null }

export const posOf = (i: number, cols: number) => ({ x: (i % cols) * PX, y: Math.floor(i / cols) * PY });
const boxOf = (ids: number[], cols: number): Box => {
  const ps = ids.map(i => posOf(i, cols));
  const x = Math.min(...ps.map(p => p.x)), y = Math.min(...ps.map(p => p.y));
  return { x, y, w: Math.max(...ps.map(p => p.x)) + TW - x, h: Math.max(...ps.map(p => p.y)) + TH - y };
};
/** The demo has no sold-out size, so one is set aside: the Cloud Puffer in Forest, size L (the AI Manager restocks it). */
export const isOut = (p: DemoProduct, color: number, size: string) => p.id === 'p1' && color === 1 && size === 'L';

export function storyScene(beat: number, t: number): Scene {
  if (beat <= 0) return { cam: 'all' };
  if (beat === 1) {
    const col = 2 - 2 * clamp01((t - 0.1) / 0.8);
    return { cam: { x: col * PX, y: 0, w: 3 * PX - 6, h: PY + TH }, max: 1.1 };
  }
  const zoomed = { cam: boxOf([0], 5), max: 1.6 };
  if (beat === 2) return t < 0.4 ? { ...zoomed, hovered: 0 } : { ...zoomed, open: { i: 0, color: 0, size: null, img: t < 0.75 ? 0 : 1, waitlist: false } };
  return { ...zoomed, open: { i: 0, color: 1, size: 'L', img: 0, waitlist: t >= 0.35 } };
}
