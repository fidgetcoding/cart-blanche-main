import { describe, expect, it, vi } from 'vitest';
import { DEMO_PRODUCTS } from '../demo-data';

// The demo has to show the size waitlist, so some sizes are sold out, the same ones on every visit.
describe('demo stock', () => {
  const soldOut = DEMO_PRODUCTS.flatMap(p => p.variants.filter(v => v.inventory_count === 0).map(v => v.id));

  it('sells out a few sizes, never a whole product', () => {
    expect(soldOut.length).toBeGreaterThanOrEqual(6);
    for (const p of DEMO_PRODUCTS) expect(p.variants.some(v => v.inventory_count > 0)).toBe(true);
  });

  it('sells out the same sizes on every load', async () => {
    vi.resetModules();
    const again = await import('../demo-data');
    const soldOutAgain = again.DEMO_PRODUCTS.flatMap(p => p.variants.filter(v => v.inventory_count === 0).map(v => v.id));
    expect(soldOutAgain).toEqual(soldOut);
  });
});
