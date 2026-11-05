import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import Landing from '../Landing';
import { FEATURES } from '../page/lib/features';

// Variant B of the opening (lib/opening.ts): no Problem; the Hand follows the hero.
vi.mock('../page/lib/opening', async importOriginal => ({ ...(await importOriginal<typeof import('../page/lib/opening')>()), OPENING: 'B' }));

beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.stubGlobal('ResizeObserver', Observer);
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
});

describe('opening B', () => {
  it('drops the Problem and moves the Hand up to follow the hero, opening with the room the Problem gave it', () => {
    render(<Landing />);
    expect(document.getElementById('top')).not.toBeNull();
    expect(document.getElementById('problem')).toBeNull();
    expect(document.body.textContent).not.toContain('Every store looks the same.');
    const system = document.getElementById('system')!;
    expect(system).not.toBeNull();
    expect(system.previousElementSibling?.id).toBe('top');
    // It opens with the room the Problem used to give the hero, not the gap it kept below the Problem.
    expect(system.className).toMatch(/\bpt-32\b/);
    // The story the opening lands on is still there.
    expect(document.getElementById('story')).not.toBeNull();
  });

  it('keeps the pill nav and the progress bars to the six features', () => {
    render(<Landing />);
    const pills = [...document.querySelectorAll('header nav button')].map(b => b.textContent);
    expect(pills).toEqual(['All', ...FEATURES.map(f => f.label)]);
    expect(document.querySelectorAll('[data-progress] span')).toHaveLength(FEATURES.length);
    expect(screen.getAllByRole('button', { name: 'SmartShop' }).length).toBeGreaterThan(0);
  });
});
