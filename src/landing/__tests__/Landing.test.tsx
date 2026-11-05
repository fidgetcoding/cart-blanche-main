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

  it('opens on the headline alone, with no eyebrow above it', () => {
    render(<Landing />);
    expect(document.body.textContent).not.toMatch(/invite only/i);
  });

  it('keeps the demo one click away, and only the demo', () => {
    render(<Landing />);
    const ctas = [...document.querySelectorAll<HTMLAnchorElement>('a.signup-cta')];
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) expect(cta.getAttribute('href')).toBe('/demo');
  });

  it('shows no store label, cart or SmartPortal icon in its header', () => {
    render(<Landing />);
    expect(screen.queryByText(/demo storefront/i)).toBeNull();
    expect(screen.queryByTitle('SmartPortal')).toBeNull();
  });

  it('writes SmartPortal as one word', () => {
    render(<Landing />);
    expect(document.body.textContent).toContain('SmartPortal');
    expect(document.body.textContent).not.toMatch(/smart portal/i);
  });

  it('goes from the story straight to the footer: no compare table, no closing invite', () => {
    render(<Landing />);
    expect(document.body.textContent).not.toContain('One system beats a stack of apps.');
    expect(document.body.textContent).not.toMatch(/premier boutique fashion brands/i);
    expect(document.body.textContent).not.toContain('No login needed');
    // The bar's Enter the demo is the only one left.
    expect(document.querySelectorAll('a.signup-cta')).toHaveLength(1);
  });

  it('credits Lorecraft LLC and marks the code link with the GitHub icon', () => {
    render(<Landing />);
    const footer = document.querySelector('footer')!;
    expect(footer.textContent).toContain('Built by Lorecraft LLC');
    const code = [...footer.querySelectorAll('a')].find(a => a.textContent === 'GitHub')!;
    const icon = code.querySelector('svg')!;
    expect(icon).not.toBeNull();
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(code.firstElementChild).toBe(icon);
  });
});
