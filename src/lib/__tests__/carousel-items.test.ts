import { describe, expect, it } from 'vitest';
import { carouselItems, MIN_PRODUCTS_TO_LOOP } from '../carousel-items';

describe('carouselItems', () => {
  it('shows each product once in a small store', () => {
    expect(carouselItems(['tee', 'cap'])).toEqual(['tee', 'cap']);
  });

  it('repeats a big catalogue for endless scrolling', () => {
    const big = Array.from({ length: MIN_PRODUCTS_TO_LOOP }, (_, i) => i);
    expect(carouselItems(big)).toHaveLength(MIN_PRODUCTS_TO_LOOP * 3);
  });

  it('copes with nothing to show', () => {
    expect(carouselItems([])).toEqual([]);
  });
});
