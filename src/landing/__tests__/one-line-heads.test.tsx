import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import Landing from '../Landing';
import { COPY } from '../copy';

// From 1024 up every section head sits on one line: it doesn't wrap, and its size follows the viewport so it
// shrinks rather than overflowing. jsdom has no layout, so this checks the rule each head carries; the QA run
// measures the heads in Chrome at 1024, 1280, 1440 and 1920.
beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.stubGlobal('ResizeObserver', Observer);
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
});

const heads = [COPY.hero.headline, COPY.problem.head, COPY.system.head];

describe('section heads from 1024 up', () => {
  it.each(heads)('keeps “%s” on one line, sized to the viewport', text => {
    render(<Landing />);
    const head = [...document.querySelectorAll('h1, h2')].find(h => h.textContent?.replace(/\s+/g, ' ').trim() === text) as HTMLElement;
    expect(head).toBeTruthy();
    expect(head.className).toMatch(/\blg:whitespace-nowrap\b/);
    expect(head.className).toMatch(/\blg:\[font-size:min\(\d+px,calc\(/);
    // Sentences sit inline from lg up (below lg each sentence may take its own balanced line).
    for (const s of head.querySelectorAll('span')) expect(s.className).toMatch(/\blg:inline\b/);
  });
});
