import { describe, expect, it } from 'vitest';
import { mergeInventoryRows } from '../inventory-rows';

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
