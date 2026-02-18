import type { DemoProduct } from '@/data/demo-data';
import { DEMO_PRODUCTS } from '@/data/demo-data';

// Category pairing rules for counterparts mode
const COUNTERPART_RULES: Record<string, string[]> = {
  'outerwear': ['streetwear', 'essentials', 'new-arrivals'], // tops, bottoms underneath
  'streetwear': ['outerwear', 'essentials', 'new-arrivals'],
  'essentials': ['outerwear', 'streetwear', 'new-arrivals'],
  'new-arrivals': ['outerwear', 'streetwear', 'essentials'],
};

// Smart orientation: which position does an anchor category take?
// 'top' = anchor locks to top half, suggestions below
// 'bottom' = anchor locks to bottom half, suggestions above
export function getSmartOrientation(category: string): 'top' | 'bottom' {
  const topCategories = ['outerwear', 'streetwear']; // upper body / layering
  if (topCategories.includes(category.toLowerCase())) return 'top';
  return 'bottom'; // essentials, bottoms, accessories lock to bottom
}

interface PairingOptions {
  anchor: DemoProduct;
  mode: 'counterparts' | 'extras';
  cartProductIds?: string[];
  lookProductIds?: string[];
}

export function getSuggestedProducts({
  anchor,
  mode,
  cartProductIds = [],
  lookProductIds = [],
}: PairingOptions): DemoProduct[] {
  const excludeIds = new Set([anchor.id, ...cartProductIds, ...lookProductIds]);

  let candidates = DEMO_PRODUCTS.filter(p => !excludeIds.has(p.id));

  if (mode === 'counterparts') {
    // Filter to complementary categories
    const suggestedCategories = COUNTERPART_RULES[anchor.category.toLowerCase()] || [];
    candidates = candidates.filter(p =>
      suggestedCategories.includes(p.category.toLowerCase())
    );
  }
  // 'extras' mode: show all products (same category first, then others)

  // Score and sort
  candidates.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Price band: prefer items within ±30% of anchor price
    const priceLow = anchor.price * 0.7;
    const priceHigh = anchor.price * 1.3;
    if (a.price >= priceLow && a.price <= priceHigh) scoreA += 3;
    if (b.price >= priceLow && b.price <= priceHigh) scoreB += 3;

    // In extras mode, same category items first
    if (mode === 'extras') {
      if (a.category === anchor.category) scoreA += 5;
      if (b.category === anchor.category) scoreB += 5;
    }

    return scoreB - scoreA;
  });

  return candidates;
}
