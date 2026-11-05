import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Landing from '../Landing';
import { stubStoryLayout } from './story-stubs';

stubStoryLayout();

describe('the live store’s hover glow on the light landing', () => {
  it('glows dark, so it shows on the light page', () => {
    render(<Landing />);
    const tile = document.querySelector<HTMLElement>('#top [data-canvas] > div')!;
    fireEvent.mouseEnter(tile);
    const shadow = tile.querySelector<HTMLElement>('.rounded-lg')!.style.boxShadow;
    expect(shadow).not.toBe('');
    // The store's default glow is white at 8%, which disappears on the landing's near-white background.
    expect(shadow).not.toMatch(/hsla\(0,\s*0%,\s*100%|rgba\(255,\s*255,\s*255/);
  });
});
