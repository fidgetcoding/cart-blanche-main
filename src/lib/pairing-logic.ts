import type { DemoProduct } from '@/data/demo-data';
import { DEMO_PRODUCTS } from '@/data/demo-data';

// ─── Body-zone classification ────────────────────────────────────
// "tops" = anything worn on the upper body (shirts, jackets, hoodies, etc.)
// "bottoms" = anything worn on the lower body (pants, shorts, joggers, etc.)
// "accessory" = hats, scarves, bags — neutral, can pair with anything
type BodyZone = 'top' | 'bottom' | 'accessory';

const ZONE_MAP: Record<string, BodyZone> = {
  shirt:     'top',
  jacket:    'top',
  hat:       'accessory',
  accessory: 'accessory',
  pants:     'bottom',
  shorts:    'bottom',
};

export function getBodyZone(product: DemoProduct): BodyZone {
  // Use product_category first (typed field), fall back to category string
  const pc = product.product_category?.toLowerCase();
  if (pc && ZONE_MAP[pc]) return ZONE_MAP[pc];

  // Heuristic fallback based on category string (for DB products without product_category)
  const cat = product.category?.toLowerCase() || '';
  if (/pant|trouser|jogger|short|cargo/i.test(cat) || /pant|trouser|jogger|short|cargo/i.test(product.title)) return 'bottom';
  if (/jacket|coat|hoodie|sweater|shirt|tee|polo|tank|crewneck|blazer|vest|sleeve|puffer|trench|bomber|windbreaker|moto|overcoat/i.test(cat)
    || /jacket|coat|hoodie|sweater|shirt|tee|polo|tank|crewneck|blazer|vest|sleeve|puffer|trench|bomber|windbreaker|moto|overcoat/i.test(product.title)) return 'top';
  if (/hat|cap|beanie|scarf|bag|belt/i.test(cat) || /hat|cap|beanie|scarf|bag|belt/i.test(product.title)) return 'accessory';
  return 'top'; // default to top if unknown
}

// Smart orientation for layout: tops anchor at the top, bottoms at the bottom
export function getSmartOrientation(category: string): 'top' | 'bottom' {
  const lower = category.toLowerCase();
  if (ZONE_MAP[lower] === 'bottom') return 'bottom';
  return 'top';
}

// ─── Pairing logic ───────────────────────────────────────────────
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
  const anchorZone = getBodyZone(anchor);

  let candidates = DEMO_PRODUCTS.filter(p => !excludeIds.has(p.id));

  if (mode === 'counterparts') {
    // PAIRS: show the OPPOSITE body zone
    // If anchor is a top → show bottoms. If anchor is bottom → show tops.
    // Accessories pair with tops first, then bottoms.
    if (anchorZone === 'top') {
      candidates = candidates.filter(p => getBodyZone(p) === 'bottom');
    } else if (anchorZone === 'bottom') {
      candidates = candidates.filter(p => getBodyZone(p) === 'top');
    } else {
      // accessory — show both tops and bottoms, tops first
      candidates.sort((a, b) => {
        const zA = getBodyZone(a);
        const zB = getBodyZone(b);
        if (zA === 'top' && zB !== 'top') return -1;
        if (zB === 'top' && zA !== 'top') return 1;
        return 0;
      });
    }
  } else {
    // EXTRAS: show the SAME body zone (more of the same type)
    // Top → tops, Bottom → bottoms, Accessory → accessories (+ fallback to all)
    const sameZone = candidates.filter(p => getBodyZone(p) === anchorZone);
    if (sameZone.length > 0) {
      candidates = sameZone;
    }
    // If very few same-zone items, keep all but sort same-zone first
  }

  // Score and sort by price similarity
  candidates.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Price band: prefer items within ±30% of anchor price
    const priceLow = anchor.price * 0.7;
    const priceHigh = anchor.price * 1.3;
    if (a.price >= priceLow && a.price <= priceHigh) scoreA += 3;
    if (b.price >= priceLow && b.price <= priceHigh) scoreB += 3;

    // In extras mode, same product_category gets a bonus (e.g. jacket with jacket specifically)
    if (mode === 'extras') {
      if (a.product_category === anchor.product_category) scoreA += 2;
      if (b.product_category === anchor.product_category) scoreB += 2;
    }

    return scoreB - scoreA;
  });

  return candidates;
}
