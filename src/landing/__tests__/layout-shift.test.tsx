import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Drawer } from '../page/parts/cart';
import { GridEditorPage } from '../page/parts/pages';

// Content the story moves as it scrolls has to move by transform: Chrome counts any change to a box's layout
// position as a layout shift (scrolling isn't an input that excuses it), and transforms are exempt. The QA run
// measured 0.12 CLS per pass through the story before: the stylist's earlier messages climbing as new ones
// arrived, and the Grid Editor's tiles sliding by left/top.
describe('story content that moves', () => {
  it('holds the stylist’s messages at the bottom by a transform, not by layout', () => {
    const { container } = render(<Drawer step={2} t={1} />);
    const first = [...container.querySelectorAll('p')].find(p => p.textContent === 'Show me the newest arrivals')!;
    const column = first.closest('.flex-col.gap-3') as HTMLElement;
    expect(column.className).toMatch(/\btop-full\b/);
    expect(column.className).toMatch(/-translate-y-full/);
    expect(column.className).not.toMatch(/justify-end/);
  });

  it('slides the Grid Editor’s tiles by transform', () => {
    const { container } = render(<GridEditorPage t={0.5} />);
    const tiles = [...container.querySelectorAll<HTMLElement>('.absolute.rounded-xl.border')];
    expect(tiles.length).toBe(20);
    for (const tile of tiles) {
      expect(tile.style.transform).toMatch(/^translate\(/);
      expect(tile.style.transition).not.toMatch(/left|top/);
    }
  });
});
