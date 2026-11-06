import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import Landing from '../Landing';
import { PageHint } from '../page/parts/chrome';
import { mobileGoTo } from '../page/lib/mobile';
import { stubStoryLayout } from './story-stubs';

// A visitor who has asked for less motion.
const matchMedia = window.matchMedia;
beforeAll(() => {
  window.matchMedia = ((q: string) => ({ ...matchMedia(q), matches: q.includes('prefers-reduced-motion: reduce') })) as typeof window.matchMedia;
});
afterAll(() => { window.matchMedia = matchMedia; });

stubStoryLayout();

describe('under reduced motion', () => {
  it('holds the opening still: one screen, no flight, the words already in place', async () => {
    vi.useFakeTimers();
    render(<Landing />);
    const top = document.getElementById('top')!;
    expect(top.style.height).toBe('100vh');
    expect(document.getElementById('carousel-grid')).toBeNull();
    for (const w of top.querySelectorAll<HTMLElement>('.g-w > span')) expect(w.style.animation).toMatch(/none/);
    await act(async () => { vi.advanceTimersByTime(7000); });
    expect(top.style.height).toBe('100vh');
    vi.useRealTimers();
  });

  it('stills the scroll cue’s running line', () => {
    const { container } = render(<PageHint progress={-1} thumb={false} />);
    const line = container.querySelector<HTMLElement>('.cbe-cue')!;
    expect(line).not.toBeNull();
    expect(line.style.animation).toBe('');
    expect(container.querySelector('style')!.textContent).toMatch(/@media \(prefers-reduced-motion: reduce\)\{\.cbe-cue\{animation:none\}\}/);
  });

  it('jumps to a chapter instead of gliding there', () => {
    const to = window.scrollTo as unknown as ReturnType<typeof vi.fn>;
    render(<Landing />);
    to.mockClear();
    fireEvent.click(screen.getAllByRole('button', { name: 'SmartPortal' })[0]);
    expect(to).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }));
    to.mockClear();
    document.body.insertAdjacentHTML('beforeend', '<section id="m-portal"></section>');
    mobileGoTo('portal');
    expect(to).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });
});
