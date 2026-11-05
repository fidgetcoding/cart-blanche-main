import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import Landing from '../Landing';

beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.stubGlobal('ResizeObserver', Observer);
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  // jsdom has no element scrolling; the header pill bar centres its active pill with it.
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
});

describe('Landing', () => {
  it('leads with the headline in light mode', () => {
    render(<Landing />);
    expect(document.body.textContent).toContain('Fashion commerce with AI on both sides of the counter.');
    expect(document.querySelector('.light')).not.toBeNull();
  });

  it('keeps the demo one click away, and only the demo', () => {
    render(<Landing />);
    const ctas = [...document.querySelectorAll<HTMLAnchorElement>('a.signup-cta')];
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) expect(cta.getAttribute('href')).toBe('/demo');
  });

  it('shows no store label, cart or Smart Portal in its header', () => {
    render(<Landing />);
    expect(screen.queryByText(/demo storefront/i)).toBeNull();
    expect(screen.queryByTitle('Smart Portal')).toBeNull();
  });
});
