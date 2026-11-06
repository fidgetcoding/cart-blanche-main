import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProductPhoto } from '../ProductPhoto';

// Each photo's decode stays pending until the test lets it finish, the way a slow network or a busy page holds it.
const pending = new Map<string, () => void>();
beforeEach(() => {
  // jsdom has no decode(); this one resolves when the test says so.
  Object.defineProperty(HTMLImageElement.prototype, 'decode', {
    configurable: true,
    value(this: HTMLImageElement) { return new Promise<void>(resolve => { pending.set(this.src, resolve); }); },
  });
});
afterEach(() => { delete (HTMLImageElement.prototype as { decode?: unknown }).decode; pending.clear(); });
const finish = async (src: string) => { await act(async () => { pending.get(`http://localhost:3000${src}`)?.(); pending.get(src)?.(); }); };
const shown = (c: HTMLElement) => c.querySelector('img')!.getAttribute('src');

describe('ProductPhoto', () => {
  it('opens on the thumbnail the canvas already has, never an empty frame, then sharpens', async () => {
    const { container } = render(<ProductPhoto src="/p/a-medium.webp" placeholder="/p/a-thumb.webp" alt="A" />);
    expect(shown(container)).toBe('/p/a-thumb.webp');
    await finish('/p/a-medium.webp');
    expect(shown(container)).toBe('/p/a-medium.webp');
  });

  it('keeps the photo on screen until the next one is decoded', async () => {
    const { container, rerender } = render(<ProductPhoto src="/p/a-medium.webp" placeholder="/p/a-thumb.webp" alt="A" />);
    await finish('/p/a-medium.webp');
    rerender(<ProductPhoto src="/p/b-medium.webp" placeholder="/p/b-thumb.webp" alt="A" />);
    expect(shown(container)).toBe('/p/a-medium.webp');
    await finish('/p/b-medium.webp');
    expect(shown(container)).toBe('/p/b-medium.webp');
  });
});
