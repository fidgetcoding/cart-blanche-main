import { describe, expect, it } from 'vitest';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { visibleGenderChips, withoutHiddenGenders } from '../hidden-genders';

describe('hidden genders', () => {
  it("drops the products of a gender the merchant hid, whatever the case", () => {
    const shown = withoutHiddenGenders(DEMO_PRODUCTS, ['Women']);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.some(p => p.gender === 'women')).toBe(false);
    expect(shown.filter(p => p.gender === 'men')).toHaveLength(DEMO_PRODUCTS.filter(p => p.gender === 'men').length);
  });

  it('treats a product with no gender as unisex', () => {
    const genderless = [{ ...DEMO_PRODUCTS[0], gender: undefined }];
    expect(withoutHiddenGenders(genderless, ['unisex'])).toHaveLength(0);
    expect(withoutHiddenGenders(genderless, ['men'])).toHaveLength(1);
  });

  it('leaves everything when nothing is hidden', () => {
    expect(withoutHiddenGenders(DEMO_PRODUCTS, undefined)).toBe(DEMO_PRODUCTS);
    expect(withoutHiddenGenders(DEMO_PRODUCTS, [])).toBe(DEMO_PRODUCTS);
  });

  it('lists the filter chips without the hidden ones', () => {
    expect(visibleGenderChips(undefined)).toEqual(['MEN', 'WOMEN', 'UNISEX']);
    expect(visibleGenderChips(['women'])).toEqual(['MEN', 'UNISEX']);
  });
});
