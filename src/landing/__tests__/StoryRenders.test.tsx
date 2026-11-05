import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Landing from '../Landing';
import { BEAT, STARTS, scrollStoryTo, stubStoryLayout } from './story-stubs';

// The real portal pages are heavy (the Dashboard's charts, the Orders table): count their renders.
const renders = vi.hoisted(() => ({ dashboard: 0, orders: 0 }));
vi.mock('../page/lib/portal-pages', async importOriginal => {
  const real = await importOriginal<typeof import('../page/lib/portal-pages')>();
  const counted = (name: 'dashboard' | 'orders', title: string) => async () => ({
    default: function Counted() { renders[name] += 1; return <h1>{title}</h1>; },
  });
  return { ...real, portalPageImports: { ...real.portalPageImports, dashboard: counted('dashboard', 'Dashboard'), orders: counted('orders', 'Orders') } };
});

stubStoryLayout();

describe('the story keeps scroll work small', () => {
  it('scrolling never re-renders the portal pages it is not changing', async () => {
    render(<Landing />);
    await scrollStoryTo(STARTS[0] + 0.5 * BEAT);
    await screen.findAllByText('Dashboard');
    // Through SmartShop's beats and into Build a Set: the chapter, its camera and the nav all change.
    const dashboards = renders.dashboard;
    for (let x = STARTS[0] + 0.5 * BEAT; x <= STARTS[1] + 0.5 * BEAT; x += 0.1 * BEAT) await scrollStoryTo(x);
    expect(renders.dashboard).toBe(dashboards);

    // The SmartPortal on its Orders page, scrolled through that beat.
    await scrollStoryTo(STARTS[3] + 2.3 * BEAT);
    await screen.findByRole('heading', { name: 'Orders' });
    const orders = renders.orders;
    for (let x = STARTS[3] + 2.3 * BEAT; x <= STARTS[3] + 2.9 * BEAT; x += 0.05 * BEAT) await scrollStoryTo(x);
    expect(renders.orders).toBe(orders);
  }, 60000);
});
