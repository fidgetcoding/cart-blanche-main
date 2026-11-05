import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LabVisual } from '../page/parts/lab';

// jsdom does no layout, so this checks the sizing rule; the landing QA run measures it in Chrome at 768 wide,
// where the lens is tall and narrow and the two phones, sized by height alone, ran wider than their columns
// and overlapped.
beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('ResizeObserver', Observer);
});

describe('the Template Lab phones', () => {
  it('size each phone to fit its column’s width as well as its height', () => {
    const { container } = render(<LabVisual step={0} t={0} />);
    const frames = [...container.querySelectorAll<HTMLElement>('img[alt="YZ"], img[alt="SL"]')].map(img => img.parentElement!);
    expect(frames).toHaveLength(2);
    for (const f of frames) {
      expect(f.parentElement!.style.containerType).toBe('size');
      expect(f.style.height.replace(/\s+/g, '')).toBe('min(100cqh,100cqw*700/390)');
    }
  });
});
