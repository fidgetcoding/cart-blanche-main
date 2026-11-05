import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Landing from '../Landing';
import { FEATURES, tagsOf } from '../page/lib/features';
import { BEAT, STARTS, scrollStoryTo, stubStoryLayout } from './story-stubs';

stubStoryLayout();

/** The rail's showing layer: its head, and the tag whose bar is lit. */
function rail() {
  const story = document.getElementById('story')!.closest('section')!;
  const layer = [...story.querySelectorAll('[aria-hidden="false"]')].find(l => l.querySelector('h2') && l.textContent?.includes(' / 06 · '))!;
  const lit = [...layer.querySelectorAll('span.text-foreground')].map(s => s.textContent);
  return { head: layer.querySelector('h2')!.textContent, lit };
}

describe('the story’s rail (C2, on the left)', () => {
  it('sits left of the window', () => {
    render(<Landing />);
    const grid = document.getElementById('story')!.closest('section')!.querySelector('.grid')! as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('280px minmax(0,1fr)');
  });

  it('lights exactly one bar per tag beat, the tag the window is acting out, one step per beat', async () => {
    render(<Landing />);
    for (let f = 0; f < FEATURES.length; f++) {
      for (let b = 0; b < tagsOf(f).length; b++) {
        await scrollStoryTo(STARTS[f] + (b + 0.5) * BEAT);
        const r = rail();
        expect(r.head).toBe(FEATURES[f].head);
        expect(r.lit).toEqual([tagsOf(f)[b]]);
      }
    }
  }, 60000);

  it('lights no bar on the opening overview, before the zoom lands', async () => {
    render(<Landing />);
    await scrollStoryTo(10);
    expect(rail().lit).toEqual([]);
  });

  it('stacks the screens into the window by transform, so the handoff from the sheet logs no layout shift', async () => {
    render(<Landing />);
    await scrollStoryTo(STARTS[1] + 0.5 * BEAT);
    const sheet = document.getElementById('story')!.closest('section')!.querySelector('[style*="transform-origin"]')!;
    const screens = [...sheet.children] as HTMLElement[];
    expect(screens).toHaveLength(FEATURES.length);
    for (const el of screens) {
      expect(el.style.left).toBe('');
      expect(el.style.top).toBe('');
      expect(el.style.transform).toMatch(/^translate\(/);
    }
  });
});
