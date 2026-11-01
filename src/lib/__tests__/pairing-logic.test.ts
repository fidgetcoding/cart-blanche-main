import { describe, it, expect } from 'vitest';
import { getFillProducts, getSuggestedProducts, getBodyZone, type ProductPreset } from '../pairing-logic';
import { DEMO_PRODUCTS, type DemoProduct } from '@/data/demo-data';

const findProduct = (id: string) => DEMO_PRODUCTS.find(p => p.id === id)!;

describe('getBodyZone', () => {
  it('classifies jackets as top', () => {
    expect(getBodyZone(findProduct('p1'))).toBe('top'); // Cloud Puffer Jacket
  });

  it('classifies pants as bottom', () => {
    expect(getBodyZone(findProduct('p5'))).toBe('bottom'); // Cargo Pants
  });

  it('classifies shorts as bottom', () => {
    expect(getBodyZone(findProduct('p11'))).toBe('bottom'); // Mesh Shorts
  });

  it('classifies shirts as top', () => {
    expect(getBodyZone(findProduct('p6'))).toBe('top'); // Oversized Tee
  });
});

describe('getSuggestedProducts — counterparts (pairs) mode', () => {
  it('suggests bottoms when anchor is a top', () => {
    const results = getSuggestedProducts({
      anchor: findProduct('p1'), // jacket (top)
      mode: 'counterparts',
    });
    expect(results.length).toBeGreaterThan(0);
    results.forEach(p => {
      expect(getBodyZone(p)).toBe('bottom');
    });
  });

  it('suggests tops when anchor is a bottom', () => {
    const results = getSuggestedProducts({
      anchor: findProduct('p5'), // pants (bottom)
      mode: 'counterparts',
    });
    expect(results.length).toBeGreaterThan(0);
    results.forEach(p => {
      expect(getBodyZone(p)).toBe('top');
    });
  });

  it('excludes anchor product from results', () => {
    const anchor = findProduct('p1');
    const results = getSuggestedProducts({ anchor, mode: 'counterparts' });
    expect(results.find(p => p.id === anchor.id)).toBeUndefined();
  });

  it('excludes cart and look products', () => {
    const results = getSuggestedProducts({
      anchor: findProduct('p1'),
      mode: 'counterparts',
      cartProductIds: ['p5'],
      lookProductIds: ['p16'],
    });
    expect(results.find(p => p.id === 'p5')).toBeUndefined();
    expect(results.find(p => p.id === 'p16')).toBeUndefined();
  });
});

describe('getSuggestedProducts — extras mode', () => {
  it('suggests same zone (tops) when anchor is a top', () => {
    const results = getSuggestedProducts({
      anchor: findProduct('p1'), // jacket (top)
      mode: 'extras',
    });
    expect(results.length).toBeGreaterThan(0);
    results.forEach(p => {
      expect(getBodyZone(p)).toBe('top');
    });
  });

  it('suggests same zone (bottoms) when anchor is a bottom', () => {
    const results = getSuggestedProducts({
      anchor: findProduct('p5'), // pants (bottom)
      mode: 'extras',
    });
    expect(results.length).toBeGreaterThan(0);
    results.forEach(p => {
      expect(getBodyZone(p)).toBe('bottom');
    });
  });
});

describe('getSuggestedProducts — preset integration', () => {
  // Fixture note: anchor and all preset products share gender ('men') so
  // gender-compatibility filtering doesn't act as a confounder in tests
  // that are meant to exercise PRESET ORDERING. Gender filtering is
  // covered separately by tests in the gender chip / strict-mode block.
  const presets: ProductPreset[] = [
    {
      anchorProductId: 'p1',                    // Cloud Puffer (men, top)
      pairs: ['p5', 'p25', 'p5b'],              // Cargo, Utility, Cargo II — all men's pants
      extras: ['p1b', 'p9'],                    // Cloud Puffer II, Leather Moto — all men's jackets
    },
  ];

  it('preset products appear first in counterparts mode', () => {
    const results = getSuggestedProducts({
      anchor: findProduct('p1'),
      mode: 'counterparts',
      presets,
    });
    // First three should be the preset products in order
    expect(results[0].id).toBe('p5');  // Cargo Pants
    expect(results[1].id).toBe('p25'); // Utility Pant
    expect(results[2].id).toBe('p5b'); // Cargo Pants II
  });

  it('preset products appear first in extras mode', () => {
    const results = getSuggestedProducts({
      anchor: findProduct('p1'),
      mode: 'extras',
      presets,
    });
    expect(results[0].id).toBe('p1b'); // Cloud Puffer Jacket II
    expect(results[1].id).toBe('p9');  // Leather Moto Jacket
  });

  it('automatic suggestions follow after preset products (deduped)', () => {
    const results = getSuggestedProducts({
      anchor: findProduct('p1'),
      mode: 'counterparts',
      presets,
    });
    // After the 3 presets, remaining products should NOT include them again
    const afterPresets = results.slice(3);
    expect(afterPresets.find(p => p.id === 'p5')).toBeUndefined();
    expect(afterPresets.find(p => p.id === 'p25')).toBeUndefined();
    expect(afterPresets.find(p => p.id === 'p5b')).toBeUndefined();
  });

  it('excludes preset products that are in cart', () => {
    const results = getSuggestedProducts({
      anchor: findProduct('p1'),
      mode: 'counterparts',
      presets,
      cartProductIds: ['p5'], // Cargo Pants in cart
    });
    expect(results[0].id).toBe('p25'); // Utility first since Cargo excluded
    expect(results[1].id).toBe('p5b'); // Cargo II second
  });

  it('falls back to automatic when no preset exists for anchor', () => {
    const results = getSuggestedProducts({
      anchor: findProduct('p5'), // No preset for Cargo Pants
      mode: 'counterparts',
      presets,
    });
    // Should still get results (automatic logic)
    expect(results.length).toBeGreaterThan(0);
    // All should be tops (opposite of bottom)
    results.forEach(p => {
      expect(getBodyZone(p)).toBe('top');
    });
  });

  it('empty presets array behaves same as no presets', () => {
    const withPresets = getSuggestedProducts({
      anchor: findProduct('p5'),
      mode: 'counterparts',
      presets: [],
    });
    const without = getSuggestedProducts({
      anchor: findProduct('p5'),
      mode: 'counterparts',
    });
    expect(withPresets.map(p => p.id)).toEqual(without.map(p => p.id));
  });
});

describe('pairing with a store catalogue', () => {
  const product = (id: string, category: string, type: DemoProduct['product_type']): DemoProduct => ({
    id,
    title: id,
    price: 10,
    images: [],
    category,
    product_type: type,
    gender: 'unisex',
    status: 'active',
    grid_position: { x: 0, y: 0 },
    description: '',
    variants: [],
  });
  const top = product('real-top', 'essentials', 'shirt');
  const pants = product('real-pants', 'essentials', 'pants');
  const catalog = [top, pants];

  it('suggests only what the store sells', () => {
    const ids = getSuggestedProducts({ anchor: top, mode: 'counterparts', catalog }).map(p => p.id);
    expect(ids).toEqual(['real-pants']);
  });

  it('fills a look only from what the store sells', () => {
    const ids = getFillProducts({ anchor: top, cartProductIds: [], lookProductIds: [], catalog }).map(p => p.id);
    expect(ids).toEqual(['real-pants']);
  });
});
