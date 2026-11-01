const SIZE_RANK = ['XXS', '2XS', 'XS', 'S', 'SM', 'M', 'MD', 'L', 'LG', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL'];

const rank = (title: string) => {
  const size = title.trim().toUpperCase();
  const named = SIZE_RANK.indexOf(size);
  if (named >= 0) return named;
  const number = Number(size);
  return Number.isFinite(number) && size !== '' ? SIZE_RANK.length + number : Number.POSITIVE_INFINITY;
};

/** Sizes come back from the database in no useful order, so shoppers would see M, L, S. */
export function sortVariantsBySize<Variant extends { title: string }>(variants: Variant[]): Variant[] {
  return variants
    .map((variant, index) => ({ variant, index }))
    .sort((a, b) => {
      const [left, right] = [rank(a.variant.title), rank(b.variant.title)];
      return left === right ? a.index - b.index : left - right;
    })
    .map(({ variant }) => variant);
}
