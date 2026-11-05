// The story's scroll timeline: the opening E3 kept (a hold on the whole sheet, then the zoom into SmartShop), then
// C2's pace, one beat per tag. Each segment is a length of scroll in vh, the camera move across it, and the
// feature and beat the window shows.
import { BEATS, FEATURES } from './features';

/** Scroll per tag beat, in vh (C2's pace). The opening keeps E3's lengths. */
export const BEAT_VH = 45;
const OPEN_VH = 39.2, ZOOM_VH = 33.6;

/** The camera: on the whole sheet, or on the window (SmartShop's spot on the sheet, where the stage plays). */
export type Cam = { k: 'f' } | { k: 'o' };
/** What the chapter shows: a feature and its beat. */
export interface At { f: number; beat: number }
interface Seg { vh: number; from: Cam; to: Cam; at: At }

export function storyTimeline() {
  const segs: Seg[] = [];
  const O: Cam = { k: 'o' }, F: Cam = { k: 'f' };
  segs.push({ vh: OPEN_VH, from: O, to: O, at: { f: 0, beat: 0 } });
  segs.push({ vh: ZOOM_VH, from: O, to: F, at: { f: 0, beat: 0 } });
  const starts: number[] = [];
  FEATURES.forEach((_, f) => {
    starts.push(segs.reduce((n, s) => n + s.vh, 0));
    for (let b = 0; b < BEATS[f]; b++) segs.push({ vh: BEAT_VH, from: F, to: F, at: { f, beat: b } });
  });
  return { segs, total: segs.reduce((n, s) => n + s.vh, 0), starts };
}
