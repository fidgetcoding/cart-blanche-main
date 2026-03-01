/**
 * Shared layout persistence for grid editor ↔ storefront.
 * Stores product display order and category tab order in localStorage.
 */
import type { DemoProduct } from '@/data/demo-data';
import { DEMO_PRODUCTS as RAW_DEMO_PRODUCTS } from '@/data/demo-data';

const PRODUCT_ORDER_KEY = 'cb-layout-product-order';
const CATEGORY_ORDER_KEY = 'cb-layout-category-order';

const TILE_W = 220;
const TILE_H = 300;
const TILE_GAP = 6;
const COLS = 5;

export interface SavedLayout {
  productOrder: string[];
  categoryOrder: string[];
}

export function saveLayout(layout: SavedLayout): void {
  try {
    localStorage.setItem(PRODUCT_ORDER_KEY, JSON.stringify(layout.productOrder));
    localStorage.setItem(CATEGORY_ORDER_KEY, JSON.stringify(layout.categoryOrder));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function loadLayout(): SavedLayout | null {
  try {
    const productRaw = localStorage.getItem(PRODUCT_ORDER_KEY);
    const categoryRaw = localStorage.getItem(CATEGORY_ORDER_KEY);
    if (!productRaw) return null;
    return {
      productOrder: JSON.parse(productRaw),
      categoryOrder: categoryRaw ? JSON.parse(categoryRaw) : [],
    };
  } catch {
    return null;
  }
}

export function clearLayout(): void {
  localStorage.removeItem(PRODUCT_ORDER_KEY);
  localStorage.removeItem(CATEGORY_ORDER_KEY);
}

/** Returns DEMO_PRODUCTS in saved order with recomputed grid positions */
export function getOrderedProducts(): DemoProduct[] {
  const saved = loadLayout();
  if (!saved || saved.productOrder.length === 0) return RAW_DEMO_PRODUCTS;
  const ordered: DemoProduct[] = [];
  for (const id of saved.productOrder) {
    const found = RAW_DEMO_PRODUCTS.find(p => p.id === id);
    if (found) ordered.push(found);
  }
  for (const p of RAW_DEMO_PRODUCTS) {
    if (!ordered.find(o => o.id === p.id)) ordered.push(p);
  }
  return ordered.map((p, i) => ({
    ...p,
    grid_position: {
      x: (i % COLS) * (TILE_W + TILE_GAP),
      y: Math.floor(i / COLS) * (TILE_H + TILE_GAP),
    },
  }));
}

/** Returns category tab order from saved layout */
export function getOrderedCategories(): string[] {
  const saved = loadLayout();
  if (saved && saved.categoryOrder.length > 0) {
    return saved.categoryOrder.map(c => c.toUpperCase());
  }
  return ['ALL', ...new Set(RAW_DEMO_PRODUCTS.map(p => p.category.toUpperCase()))];
}
