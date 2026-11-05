// jsdom does no layout, so the story tests give every box a size (the lens and the fitted app pages draw
// only once they have one) and let the story section report where the page has scrolled to.
import { act } from '@testing-library/react';
import { afterAll, beforeAll, vi } from 'vitest';
import { BEAT_VH, storyTimeline } from '../page/lib/story';

const STORY_H = 20000;
let scrolled = 0;

/** The story's scroll timeline in vh (lens.tsx): where each chapter starts, the total, and one tag beat. */
const timeline = storyTimeline();
export const STARTS = timeline.starts;
export const U = timeline.total;
export const BEAT = BEAT_VH;

export function stubStoryLayout() {
  const restore: (() => void)[] = [];
  const stubGetter = (proto: object, key: string, value: number) => {
    const prev = Object.getOwnPropertyDescriptor(proto, key);
    Object.defineProperty(proto, key, { configurable: true, get: () => value });
    restore.push(() => (prev ? Object.defineProperty(proto, key, prev) : delete (proto as Record<string, unknown>)[key]));
  };
  beforeAll(() => {
    class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
    vi.stubGlobal('IntersectionObserver', Observer);
    vi.stubGlobal('ResizeObserver', Observer);
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    stubGetter(HTMLElement.prototype, 'clientWidth', 1200);
    stubGetter(HTMLElement.prototype, 'clientHeight', 700);
    const rect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
      if (this.tagName === 'SECTION' && this.querySelector('#story')) {
        const top = -scrolled;
        return { top, bottom: top + STORY_H, height: STORY_H, left: 0, right: 1440, width: 1440, x: 0, y: top, toJSON() {} } as DOMRect;
      }
      return rect.call(this);
    };
    restore.push(() => { Element.prototype.getBoundingClientRect = rect; });
  });
  afterAll(() => restore.forEach(r => r()));
}

/** Scroll the story to `x` vh along its timeline and let a frame go by. */
export async function scrollStoryTo(x: number) {
  scrolled = (x / U) * (STORY_H - window.innerHeight);
  await act(async () => {
    window.dispatchEvent(new Event('scroll'));
    await new Promise(r => requestAnimationFrame(r));
  });
}
