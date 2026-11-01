import { describe, expect, it } from 'vitest';
import { sortVariantsBySize } from '../variant-order';

const titles = (list: string[]) => sortVariantsBySize(list.map(title => ({ title }))).map(v => v.title);

describe('sortVariantsBySize', () => {
  it('puts letter sizes smallest first', () => {
    expect(titles(['M', 'XL', 'L', 'S', 'XS'])).toEqual(['XS', 'S', 'M', 'L', 'XL']);
  });

  it('puts number sizes smallest first', () => {
    expect(titles(['34', '28', '32'])).toEqual(['28', '32', '34']);
  });

  it('keeps sizes it doesn\'t know in the order they came, after the rest', () => {
    expect(titles(['One Size', 'M', 'Tall'])).toEqual(['M', 'One Size', 'Tall']);
  });
});
