import { describe, expect, it } from 'vitest';
import { mergeInventoryRows, productUpdate } from '../inventory-rows';

const real = { id: 'real-1' };
const sample = { id: 'p1' };

describe('mergeInventoryRows', () => {
  it('lists only a real store\'s own products', () => {
    expect(mergeInventoryRows([real], [real, sample], false)).toEqual([real]);
  });

  it('keeps samples alongside a demo product, without duplicates', () => {
    expect(mergeInventoryRows([real], [real, sample], true)).toEqual([real, sample]);
  });
});

describe('productUpdate', () => {
  const product = {
    title: 'Tee',
    price: 40,
    description: 'd',
    category: 'essentials',
    product_type: 'shirt',
    gender: 'women',
    tags: ['essentials'],
    images: ['https://x.test/a.png'],
    status: 'active',
    weight_oz: 6,
    shipping_type: 'international',
    hs_code: '6109.10',
  };

  it('keeps everything the form edits, instead of resetting or dropping it', () => {
    expect(productUpdate(product)).toEqual({ ...product, compare_at_price: null });
  });

  it('falls back to unisex only when no gender is set', () => {
    expect(productUpdate({ ...product, gender: '' }).gender).toBe('unisex');
  });
});
