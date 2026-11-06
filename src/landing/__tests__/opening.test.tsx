import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import Landing from '../Landing';
import { COPY } from '../copy';

// Every call to the page's self-scroll, with the stops it was given.
const intro = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock('../page/lib/intro', () => ({ useAutoIntro: (...args: unknown[]) => { intro.calls.push(args); } }));

beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.stubGlobal('ResizeObserver', Observer);
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
});

// jsdom has no WebGL, like an old device: the opening has to stand without its 3D scene.
describe('the opening without WebGL', () => {
  it('still shows the whole headline over a still ring of the collection, with no canvas', () => {
    render(<Landing />);
    const top = document.getElementById('top')!;
    expect(top.querySelector('h1')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(COPY.hero.headline);
    expect(top.querySelectorAll('[data-flat-ring] img')).toHaveLength(20);
    expect(top.querySelector('canvas')).toBeNull();
    // One screen, no flight, and the story right after it.
    expect(top.style.height).toBe('100vh');
    expect(top.nextElementSibling!.querySelector('#story')).not.toBeNull();
  });
});

describe('the self-scroll', () => {
  it('runs once, from the opening, never also from the page', () => {
    intro.calls.length = 0;
    render(<Landing />);
    expect(intro.calls.length).toBeGreaterThan(0);
    // The opening always names its resting point (the landed store); a second caller wouldn't.
    for (const call of intro.calls) expect(call[2]).toBe('carousel-grid');
  });
});
