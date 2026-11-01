/** Below this, one set of cards doesn't need the endless scroll, and repeats just look like a bug. */
export const MIN_PRODUCTS_TO_LOOP = 8;

/** Endless scrolling works by repeating the cards, so a small catalogue isn't repeated. */
export function carouselItems<Item>(items: Item[]): Item[] {
  return items.length >= MIN_PRODUCTS_TO_LOOP ? [...items, ...items, ...items] : items;
}
