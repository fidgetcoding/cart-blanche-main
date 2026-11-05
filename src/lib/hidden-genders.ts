// Genders the merchant hid in Inventory (grid_layouts.hidden_genders, saved lowercase) leave the
// storefront: their products and their filter chips.

export const GENDER_CHIPS = ['MEN', 'WOMEN', 'UNISEX'];

const hiddenSet = (hidden: string[] | undefined) => new Set((hidden ?? []).map(g => g.toLowerCase()));

/** The products whose gender isn't hidden. A product with no gender counts as unisex. */
export function withoutHiddenGenders<P extends { gender?: string }>(products: P[], hidden: string[] | undefined): P[] {
  const set = hiddenSet(hidden);
  if (set.size === 0) return products;
  return products.filter(p => !set.has((p.gender || 'unisex').toLowerCase()));
}

/** The gender filter chips, without the hidden genders. */
export function visibleGenderChips(hidden: string[] | undefined): string[] {
  const set = hiddenSet(hidden);
  return GENDER_CHIPS.filter(g => !set.has(g.toLowerCase()));
}
