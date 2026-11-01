import { describe, expect, it } from 'vitest';
import { mergeInventoryRows, productImages, productUpdate } from '../inventory-rows';

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
    imagesFull: [{ thumb: 'https://x.test/a.png', medium: 'https://x.test/m.png', full: 'https://x.test/f.png', featured: true, colorway_id: 'olive' }],
    status: 'active',
    weight_oz: 6,
    shipping_type: 'international',
    hs_code: '6109.10',
  };

  it('keeps everything the form edits, instead of resetting or dropping it', () => {
    const { imagesFull, ...columns } = product;
    expect(productUpdate(product)).toEqual({ ...columns, image_details: imagesFull, compare_at_price: null });
  });

  it('falls back to unisex only when no gender is set', () => {
    expect(productUpdate({ ...product, gender: '' }).gender).toBe('unisex');
  });
});

describe('productImages', () => {
  const tagged = { thumb: 'a', medium: 'm', full: 'f', featured: true, colorway_id: 'olive' };

  it('keeps the grid photo, color tag and per-size files the merchant saved', () => {
    expect(productImages(['a'], [tagged])).toEqual([tagged]);
  });

  it('uses the plain URLs when nothing extra was saved', () => {
    expect(productImages(['a'], null)).toEqual([{ thumb: 'a', medium: 'a', full: 'a' }]);
  });

  it('ignores details that no longer match the photos', () => {
    expect(productImages(['b'], [tagged])).toEqual([{ thumb: 'b', medium: 'b', full: 'b' }]);
  });

  it('copes with a product with no photos', () => {
    expect(productImages(null, null)).toEqual([]);
  });
});
