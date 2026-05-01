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
  // Use product_type first (typed field), fall back to category string
  const pc = product.product_type?.toLowerCase();
  if (pc && ZONE_MAP[pc]) return ZONE_MAP[pc];

  // Heuristic fallback based on category string (for DB products without product_type)
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

// ─── Preset type ─────────────────────────────────────────────────
export interface ProductPreset {
  anchorProductId: string;
  pairs: string[];
  extras: string[];
}

// ─── Pairing logic ───────────────────────────────────────────────
interface PairingOptions {
  anchor: DemoProduct;
  mode: 'counterparts' | 'extras';
  cartProductIds?: string[];
  lookProductIds?: string[];
  presets?: ProductPreset[];
}

export function getSuggestedProducts({
  anchor,
  mode,
  cartProductIds = [],
  lookProductIds = [],
  presets = [],
}: PairingOptions): DemoProduct[] {
  const excludeIds = new Set([anchor.id, ...cartProductIds, ...lookProductIds]);
  const anchorZone = getBodyZone(anchor);

  // Check for a matching preset
  const preset = presets.find(p => p.anchorProductId === anchor.id);
  const presetIds = mode === 'counterparts'
    ? (preset?.pairs || [])
    : (preset?.extras || []);

  const presetProducts = presetIds
    .filter(id => !excludeIds.has(id))
    .map(id => DEMO_PRODUCTS.find(p => p.id === id))
    .filter(Boolean) as DemoProduct[];

  let candidates = DEMO_PRODUCTS.filter(p => !excludeIds.has(p.id));

  if (mode === 'counterparts') {
    // Accessories are always counterparts (pairs), not extras
    if (anchorZone === 'top') {
      candidates = candidates.filter(p => { const z = getBodyZone(p); return z === 'bottom' || z === 'accessory'; });
    } else if (anchorZone === 'bottom') {
      candidates = candidates.filter(p => { const z = getBodyZone(p); return z === 'top' || z === 'accessory'; });
    } else {
      // Accessory anchor: pair with tops and bottoms
      candidates = candidates.filter(p => { const z = getBodyZone(p); return z === 'top' || z === 'bottom'; });
    }
  } else {
    // Extras = same zone, but accessories are excluded (they belong in pairs)
    const sameZone = candidates.filter(p => { const z = getBodyZone(p); return z === anchorZone && z !== 'accessory'; });
    if (sameZone.length > 0) {
      candidates = sameZone;
    }
  }

  // Score and sort by price similarity
  candidates.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    const priceLow = anchor.price * 0.7;
    const priceHigh = anchor.price * 1.3;
    if (a.price >= priceLow && a.price <= priceHigh) scoreA += 3;
    if (b.price >= priceLow && b.price <= priceHigh) scoreB += 3;

    if (mode === 'extras') {
      if (a.product_type === anchor.product_type) scoreA += 2;
      if (b.product_type === anchor.product_type) scoreB += 2;
    }

    return scoreB - scoreA;
  });

  // Merge: preset products first, then auto (deduped)
  const presetProductIds = new Set(presetProducts.map(p => p.id));
  const autoCandidates = candidates.filter(p => !presetProductIds.has(p.id));

  const result = [...presetProducts, ...autoCandidates];

  // Fallback: if no suggestions, return all products of the target zone (excluding only anchor and cart items)
  if (result.length === 0) {
    const fallbackExclude = new Set([anchor.id, ...cartProductIds]);
    let fallback = DEMO_PRODUCTS.filter(p => !fallbackExclude.has(p.id));

    if (mode === 'counterparts') {
      if (anchorZone === 'top') {
        fallback = fallback.filter(p => { const z = getBodyZone(p); return z === 'bottom' || z === 'accessory'; });
      } else if (anchorZone === 'bottom') {
        fallback = fallback.filter(p => { const z = getBodyZone(p); return z === 'top' || z === 'accessory'; });
      }
    } else {
      fallback = fallback.filter(p => getBodyZone(p) === anchorZone);
    }

    return fallback;
  }

  return result;
}
