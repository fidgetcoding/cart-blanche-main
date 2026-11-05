// The six features from copy.ts, the chapter nav, and the beats: one per tag, plus one more for the
// Template Lab's Coming to the Lab list.
import { COPY } from '../../copy';

export const FEATURES = COPY.features;
export const NAV = [{ id: 'all', label: 'All' }, ...FEATURES.map(f => ({ id: f.id as string, label: f.label as string }))];
export const nn = (i: number) => String(i + 1).padStart(2, '0');

export const tagsOf = (fi: number): string[] => (fi === 5 ? [...FEATURES[5].tags, FEATURES[5].coming.label] : [...FEATURES[fi].tags]);
export const BEATS = FEATURES.map((_, fi) => tagsOf(fi).length);

/** What a feature shows when it isn't the current one: finished if passed, at its start if still ahead. */
export const restOf = (fi: number, cur: number) => (fi < cur ? { beat: BEATS[fi] - 1, t: 1 } : { beat: 0, t: 0 });
