import type { DemoProduct } from '@/data/demo-data';
import { DEMO_PRODUCTS } from '@/data/demo-data';

// ─── Body-zone classification ────────────────────────────────────
type BodyZone = 'top' | 'bottom' | 'accessory';

const ZONE_MAP: Record<string, BodyZone> = {
  shirt:     'top',
  jacket:    'top',
  hat:       'accessory',
  accessory: 'accessory',
  pants:     'bottom',
  shorts:    'bottom',
};

// ─── Style-register classification ────────────────────────────────
type StyleRegister = 'formal' | 'athletic' | 'heavy_outerwear' | 'outerwear' | 'casual';

export function getStyleRegister(product: DemoProduct): StyleRegister {
  const title = product.title.toLowerCase();
  const cat = (product.category || '').toLowerCase();
  const ptype = (product.product_type || '').toLowerCase();
  const haystack = `${title} ${cat} ${ptype}`;

  // Heavy outerwear first — long-form coats and serious jackets.
  if (/puffer|trench|overcoat|wool coat|down coat|parka|moto/.test(haystack)) {
    return 'heavy_outerwear';
  }
  // Athletic next — must come before generic outerwear so a
  // "track jacket" (jacket product_type, athletic register) is
  // tagged athletic rather than outerwear, preserving its
  // ability to pair with mesh shorts.
  if (/\bmesh\b|athletic|gym wear|gym short|track jacket|track pant/.test(haystack)) {
    return 'athletic';
  }
  // Formal — tailored garments.
  if (/blazer|suit|dress shirt|oxford shirt|tuxedo|chinos|trouser/.test(haystack)) {
    return 'formal';
  }
  // Generic outerwear — any other jacket-typed top that didn't
  // hit the heavy / athletic / formal branches above. Catches
  // bombers, windbreakers, varsity jackets — garments that
  // shouldn't pair with shorts but aren't heavy enough to be
  // "winter coats".
  if (ptype === 'jacket') {
    return 'outerwear';
  }
  return 'casual';
}

// ─── Gender-compatibility helper ──────────────────────────────────
export function isGenderCompatible(
  anchor: DemoProduct,
  candidate: DemoProduct,
  activeGenders?: string[]
): boolean {
  const c = (candidate.gender || 'unisex').toLowerCase();
  // STRICT MODE — when the user has explicit gender chips
  // selected on the grid, those chips are a HARD LOCK. Only
  // products tagged with the exact selected gender pass.
  // Unisex products do NOT pass through unless the user
  // explicitly selects 'unisex' as a chip (which the current
  // chip UI doesn't support, so unisex is effectively excluded
  // when any chip is active — this is the intended behavior).
  if (activeGenders && activeGenders.length > 0) {
    const chips = new Set(activeGenders.map(g => g.toLowerCase()));
    return chips.has(c);
  }
  // Default rule: anchor's gender + unisex overlap.
  const a = (anchor.gender || 'unisex').toLowerCase();
  if (a === 'unisex' || c === 'unisex') return true;
  return a === c;
}

// ─── Register-incompatibility detection ───────────────────────────
export function isRegisterIncompatible(anchor: DemoProduct, candidate: DemoProduct): boolean {
  const aReg = getStyleRegister(anchor);
  const cReg = getStyleRegister(candidate);
  const aZone = getBodyZone(anchor);
  const cZone = getBodyZone(candidate);

  const isShorts = (p: DemoProduct) =>
    /\bshorts?\b/.test(p.title.toLowerCase()) || (p.product_type || '').toLowerCase() === 'shorts';
  const isAthleticShorts = (p: DemoProduct) =>
    isShorts(p) && getStyleRegister(p) === 'athletic';

  // Rule 1 — Heavy outerwear × any shorts. Seasonal mismatch.
  if (aReg === 'heavy_outerwear' && cZone === 'bottom' && isShorts(candidate)) return true;
  if (cReg === 'heavy_outerwear' && aZone === 'bottom' && isShorts(anchor)) return true;

  // Rule 2 — Generic outerwear (bomber, windbreaker) × any shorts.
  if (aReg === 'outerwear' && cZone === 'bottom' && isShorts(candidate)) return true;
  if (cReg === 'outerwear' && aZone === 'bottom' && isShorts(anchor)) return true;

  // Rule 3 — Formal tops × any shorts.
  if (aReg === 'formal' && cZone === 'bottom' && isShorts(candidate)) return true;
  if (cReg === 'formal' && aZone === 'bottom' && isShorts(anchor)) return true;

  // Rule 4 — Formal × athletic (any zone).
  if ((aReg === 'formal' && cReg === 'athletic') || (cReg === 'formal' && aReg === 'athletic')) {
    return true;
  }

  // Rule 5 — Athletic shorts (mesh) × non-athletic top.
  if (isAthleticShorts(candidate) && aZone === 'top' && aReg !== 'athletic') return true;
  if (isAthleticShorts(anchor) && cZone === 'top' && cReg !== 'athletic') return true;

  return false;
}

export function getBodyZone(product: DemoProduct): BodyZone {
  const pc = product.product_type?.toLowerCase();
  if (pc && ZONE_MAP[pc]) return ZONE_MAP[pc];

  const cat = product.category?.toLowerCase() || '';
  if (/pant|trouser|jogger|short|cargo/i.test(cat) || /pant|trouser|jogger|short|cargo/i.test(product.title)) return 'bottom';
  if (/jacket|coat|hoodie|sweater|shirt|tee|polo|tank|crewneck|blazer|vest|sleeve|puffer|trench|bomber|windbreaker|moto|overcoat/i.test(cat)
    || /jacket|coat|hoodie|sweater|shirt|tee|polo|tank|crewneck|blazer|vest|sleeve|puffer|trench|bomber|windbreaker|moto|overcoat/i.test(product.title)) return 'top';
  if (/hat|cap|beanie|scarf|bag|belt/i.test(cat) || /hat|cap|beanie|scarf|bag|belt/i.test(product.title)) return 'accessory';
  return 'top';
}

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
  activeGenders?: string[];
}

export function getSuggestedProducts({
  anchor,
  mode,
  cartProductIds = [],
  lookProductIds = [],
  presets = [],
  activeGenders = [],
}: PairingOptions): DemoProduct[] {
  const excludeIds = new Set([anchor.id, ...cartProductIds, ...lookProductIds]);
  const anchorZone = getBodyZone(anchor);

  const preset = presets.find(p => p.anchorProductId === anchor.id);
  const presetIds = mode === 'counterparts'
    ? (preset?.pairs || [])
    : (preset?.extras || []);

  const presetProducts = presetIds
    .filter(id => !excludeIds.has(id))
    .map(id => DEMO_PRODUCTS.find(p => p.id === id))
    .filter((p): p is DemoProduct => Boolean(p))
    .filter(p => isGenderCompatible(anchor, p, activeGenders))
    .filter(p => !isRegisterIncompatible(anchor, p));

  let candidates = DEMO_PRODUCTS.filter(p => !excludeIds.has(p.id));

  candidates = candidates.filter(p => isGenderCompatible(anchor, p, activeGenders));
  candidates = candidates.filter(p => !isRegisterIncompatible(anchor, p));

  if (mode === 'counterparts') {
    if (anchorZone === 'top') {
      candidates = candidates.filter(p => { const z = getBodyZone(p); return z === 'bottom' || z === 'accessory'; });
    } else if (anchorZone === 'bottom') {
      candidates = candidates.filter(p => { const z = getBodyZone(p); return z === 'top' || z === 'accessory'; });
    } else {
      candidates = candidates.filter(p => { const z = getBodyZone(p); return z === 'top' || z === 'bottom'; });
    }
  } else {
    const sameZone = candidates.filter(p => { const z = getBodyZone(p); return z === anchorZone && z !== 'accessory'; });
    if (sameZone.length > 0) {
      candidates = sameZone;
    }
  }

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

  const presetProductIds = new Set(presetProducts.map(p => p.id));
  const autoCandidates = candidates.filter(p => !presetProductIds.has(p.id));

  const result = [...presetProducts, ...autoCandidates];

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

    const filtered = fallback
      .filter(p => isGenderCompatible(anchor, p, activeGenders))
      .filter(p => !isRegisterIncompatible(anchor, p));
    return filtered;
  }

  return result;
}

// ─── Fill-mode helper — guarantees a non-empty lane ───────────────
export function getFillProducts(opts: {
  anchor: DemoProduct;
  cartProductIds: string[];
  lookProductIds: string[];
  activeGenders?: string[];
  zone?: 'top' | 'bottom';
  limit?: number;
}): DemoProduct[] {
  const { anchor, cartProductIds, lookProductIds, activeGenders, zone, limit = 12 } = opts;
  const excludeIds = new Set<string>([anchor.id, ...cartProductIds, ...lookProductIds]);

  const matchesZone = (p: DemoProduct): boolean => {
    if (!zone) return true;
    const pz = getBodyZone(p);
    if (zone === 'top') return pz === 'top' || pz === 'accessory';
    return pz === 'bottom';
  };

  const rankByRelevance = (pool: DemoProduct[]): DemoProduct[] => {
    const sameCategory: DemoProduct[] = [];
    const sameType: DemoProduct[] = [];
    const rest: DemoProduct[] = [];
    for (const p of pool) {
      if (p.category === anchor.category) sameCategory.push(p);
      else if (p.product_type === anchor.product_type) sameType.push(p);
      else rest.push(p);
    }
    return [...sameCategory, ...sameType, ...rest];
  };

  const base = DEMO_PRODUCTS.filter(p => !excludeIds.has(p.id) && p.status === 'active');

  const tier1 = base
    .filter(matchesZone)
    .filter(p => isGenderCompatible(anchor, p, activeGenders));
  if (tier1.length > 0) return rankByRelevance(tier1).slice(0, limit);

  const tier2 = base.filter(matchesZone);
  if (tier2.length > 0) return rankByRelevance(tier2).slice(0, limit);

  return rankByRelevance(base).slice(0, limit);
}
