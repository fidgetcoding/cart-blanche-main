import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/demo/client';
import type { Json } from '@/integrations/supabase/types';
import { resolveStoreMerchantId } from '@/lib/store-merchant';
import { DEMO_MERCHANT_ID } from '@/lib/demo/store';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { productImages } from '@/lib/inventory-rows';
import { sortVariantsBySize } from '@/lib/variant-order';
import type { DemoProduct, ProductImage, ProductType, Colorway } from '@/data/demo-data';

const TILE_W = 220;
const TILE_H = 300;
const TILE_GAP = 6;
const COLS = 5;

/**
 * Per-product overrides on demo products. Keyed by demo product id.
 * Each value is a partial DemoProduct: only the fields the merchant
 * has edited away from the canonical demo. Merged at runtime.
 */
export interface DemoProductOverride {
  variants?: { id: string; title: string; inventory_count: number; price?: number; options?: Record<string, string> }[];
  gender?: string;
  weight_oz?: number;
  shipping_type?: 'domestic' | 'international';
  hs_code?: string;
  status?: 'active' | 'draft' | 'archived';
  title?: string;
  price?: number;
  compare_at_price?: number | null;
  description?: string;
  category?: string;
  images?: ProductImage[];
  tags?: string[];
  colorways?: Colorway[];
  product_type?: string;
}

export type DemoProductOverrides = Record<string, DemoProductOverride>;

export interface GridLayout {
  productOrder: string[];
  categoryOrder: string[];
  hiddenTags: string[];
  hiddenProductTypes: string[];
  hiddenProductIds: string[];
  hiddenGenders: string[];
  demoProductOverrides: DemoProductOverrides;
}

const EMPTY_LAYOUT: GridLayout = { productOrder: [], categoryOrder: [], hiddenTags: [], hiddenProductTypes: [], hiddenProductIds: [], hiddenGenders: [], demoProductOverrides: {} };

function normalizeProductImages(images: ProductImage[] = [], colorways: Colorway[] = []): ProductImage[] {
  if (images.length === 0) return images;

  const colorwayIdOrder = new Map<string, number>();
  colorways.forEach((c, i) => colorwayIdOrder.set(c.id, i));

  const firstFeaturedIndex = images.findIndex(img => img.featured);
  const normalized: ProductImage[] = images.map((img, idx) => {
    if (img.featured && idx !== firstFeaturedIndex) {
      const { featured: _featured, ...rest } = img;
      return rest as ProductImage;
    }
    return img;
  });

  const withFallback: ProductImage[] = firstFeaturedIndex === -1 && normalized.length > 0
    ? normalized.map((img, idx) => idx === 0 ? { ...img, featured: true } : img)
    : normalized;

  const indexed = withFallback.map((img, idx) => ({
    img,
    idx,
    colorwayOrder: img.colorway_id && colorwayIdOrder.has(img.colorway_id)
      ? colorwayIdOrder.get(img.colorway_id)!
      : Number.MAX_SAFE_INTEGER,
  }));

  indexed.sort((a, b) => {
    const aFeatured = a.img.featured ? 0 : 1;
    const bFeatured = b.img.featured ? 0 : 1;
    if (aFeatured !== bFeatured) return aFeatured - bFeatured;
    if (a.colorwayOrder !== b.colorwayOrder) return a.colorwayOrder - b.colorwayOrder;
    return a.idx - b.idx;
  });

  return indexed.map(({ img }) => img);
}

// Broadcast layout changes across hook instances
const LAYOUT_CHANGE_EVENT = 'grid-layout-changed';
function broadcastLayoutChange(layout: GridLayout) {
  window.dispatchEvent(new CustomEvent(LAYOUT_CHANGE_EVENT, { detail: layout }));
}

// Serialize writes from every mounted editor for a merchant. Each operation
// merges against the latest broadcast snapshot rather than its render closure.
const pendingWrites = new Map<string, Promise<boolean>>();

export function useGridLayout() {
  const [layout, setLayout] = useState<GridLayout | null>(null);
  const layoutRef = useRef<GridLayout | null>(null);
  const applyLayout = useCallback((next: GridLayout) => {
    layoutRef.current = next;
    setLayout(next);
  }, []);
  const [dbProducts, setDbProducts] = useState<DemoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  // A real store only ever sells its own products, even before it has any.
  const [hideSamples, setHideSamples] = useState(false);

  // Listen for layout changes from other hook instances
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<GridLayout>).detail;
      applyLayout(detail);
    };
    window.addEventListener(LAYOUT_CHANGE_EVENT, handler);
    return () => window.removeEventListener(LAYOUT_CHANGE_EVENT, handler);
  }, [applyLayout]);

  // Fetch saved layout and DB products on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Only ever show one merchant's rows: the signed-in user's, or the store
        // this deployment is configured for. Otherwise stick to the demo catalogue.
        const merchantId = await resolveStoreMerchantId();
        if (!merchantId) {
          setLoading(false);
          return;
        }
        setHideSamples(merchantId !== DEMO_MERCHANT_ID);

        const { data: layoutData } = await supabase
          .from('grid_layouts')
          .select('product_order, category_order, hidden_tags, hidden_product_types, hidden_product_ids, hidden_genders, demo_product_overrides')
          .eq('layout_type', 'default')
          .eq('merchant_id', merchantId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (layoutData) {
          applyLayout({
            productOrder: (layoutData.product_order as string[])?.length > 0 ? (layoutData.product_order as string[]) : [],
            categoryOrder: (layoutData.category_order as string[])?.length > 0 ? (layoutData.category_order as string[]) : [],
            hiddenTags: (layoutData.hidden_tags as string[]) || [],
            hiddenProductTypes: (layoutData.hidden_product_types as string[]) || [],
            hiddenProductIds: (layoutData.hidden_product_ids as string[]) || [],
            hiddenGenders: (layoutData.hidden_genders as string[]) || [],
            demoProductOverrides: (layoutData.demo_product_overrides as unknown as DemoProductOverrides) || {},
          });
        }

        // Fetch DB products (active ones, publicly readable)
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('merchant_id', merchantId)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true });

        if (products && products.length > 0) {
          const productIds = products.map(p => p.id);
          const { data: variants } = await supabase
            .from('product_variants')
            .select('*')
            .in('product_id', productIds)
            .order('id', { ascending: true });

          const variantMap = new Map<string, NonNullable<typeof variants>>();
          variants?.forEach(v => {
            const list = variantMap.get(v.product_id) || [];
            list.push(v);
            variantMap.set(v.product_id, list);
          });

          setDbProducts(products.map(p => {
            const pvs = variantMap.get(p.id) || [];
            const colorways = (p.colorways as unknown as Colorway[] | null) ?? [];
            return {
              id: p.id,
              title: p.title,
              price: p.price,
              compare_at_price: p.compare_at_price ?? undefined,
              images: normalizeProductImages(productImages(p.images, p.image_details), colorways),
              colorways,
              category: p.category || 'uncategorized',
              product_type: (p.product_type || '') as ProductType,
              gender: p.gender || 'unisex',
              status: 'active' as const,
              grid_position: { x: 0, y: 0 },
              description: p.description || '',
              variants: sortVariantsBySize(pvs).map(v => ({
                id: v.id,
                title: v.title,
                options: v.options as Record<string, string> || {},
                inventory_count: v.inventory_count ?? 0,
                price: v.price ?? undefined,
                colorway_id: v.colorway_id ?? undefined,
              })),
            };
          }));
        }
      } catch {
        // fallback to defaults
      }
      setLoading(false);
    }
    fetchData();
  }, [applyLayout]);

  // Merge demo + DB products. Apply per-merchant demo overrides on top
  // of canonical demo data.
  const allProducts = useCallback((): DemoProduct[] => {
    const overrides = layout?.demoProductOverrides || {};
    const mergedDemos = DEMO_PRODUCTS.map(p => {
      const ov = overrides[p.id];
      if (!ov) return p;
      // Variant merge: merge per-variant inventory_count + title + price
      // by id, falling back to canonical values for variants not in the
      // override array.
      const mergedVariants = ov.variants
        ? p.variants.map(v => {
            const ovV = ov.variants!.find(x => x.id === v.id);
            return ovV ? { ...v, ...ovV } : v;
          })
        : p.variants;
      const mergedImages = normalizeProductImages((ov.images ?? p.images) as ProductImage[], (ov.colorways ?? p.colorways ?? []) as Colorway[]);

      return {
        ...p,
        ...ov,
        images: mergedImages,
        variants: mergedVariants,
        // Cast back to DemoProduct's variant type since override variants
        // type is structurally compatible.
      } as DemoProduct;
    });

    if (hideSamples) return dbProducts;
    return [...mergedDemos, ...dbProducts];
  }, [dbProducts, layout, hideSamples]);

  const persistLayout = useCallback(async (change: (current: GridLayout) => GridLayout) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const previous = pendingWrites.get(user.id) ?? Promise.resolve(true);
      const pending = previous.then(async () => {
        const updated = change(layoutRef.current || EMPTY_LAYOUT);
        const { error } = await supabase.from('grid_layouts').upsert({
          merchant_id: user.id,
          layout_type: 'default',
          product_order: updated.productOrder,
          category_order: updated.categoryOrder,
          hidden_tags: updated.hiddenTags,
          hidden_product_types: updated.hiddenProductTypes,
          hidden_product_ids: updated.hiddenProductIds,
          hidden_genders: updated.hiddenGenders,
          demo_product_overrides: updated.demoProductOverrides as unknown as Json,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'merchant_id,layout_type' });
        if (error) return false;
        applyLayout(updated);
        broadcastLayoutChange(updated);
        return true;
      }).catch(() => false);
      pendingWrites.set(user.id, pending);
      try {
        return await pending;
      } finally {
        if (pendingWrites.get(user.id) === pending) pendingWrites.delete(user.id);
      }
    } catch {
      return false;
    }
  }, [applyLayout]);

  const saveLayout = useCallback((productOrder: string[], categoryOrder: string[]) =>
    persistLayout(current => ({ ...current, productOrder, categoryOrder })), [persistLayout]);
  const saveHiddenTags = useCallback((hiddenTags: string[]) =>
    persistLayout(current => ({ ...current, hiddenTags })), [persistLayout]);
  const saveHiddenProductTypes = useCallback((hiddenProductTypes: string[]) =>
    persistLayout(current => ({ ...current, hiddenProductTypes })), [persistLayout]);
  const saveHiddenProductIds = useCallback((hiddenProductIds: string[]) =>
    persistLayout(current => ({ ...current, hiddenProductIds })), [persistLayout]);
  const saveHiddenGenders = useCallback((hiddenGenders: string[]) =>
    persistLayout(current => ({ ...current, hiddenGenders })), [persistLayout]);

  const saveDemoProductOverride = useCallback((productId: string, override: DemoProductOverride | null) =>
    persistLayout(current => {
      const nextOverrides = { ...current.demoProductOverrides };
      if (override === null) delete nextOverrides[productId];
      else nextOverrides[productId] = { ...nextOverrides[productId], ...override };
      return { ...current, demoProductOverrides: nextOverrides };
    }), [persistLayout]);

  // Get products in saved order, excluding hidden product IDs
  const getOrderedProducts = useCallback((): DemoProduct[] => {
    const all = allProducts();
    const hiddenIds = new Set(layout?.hiddenProductIds || []);

    // Filter out hidden products
    const visible = all.filter(p => p.status === 'active' && !hiddenIds.has(p.id));

    if (!layout || layout.productOrder.length === 0) {
      return visible.map((p, i) => ({
        ...p,
        grid_position: {
          x: (i % COLS) * (TILE_W + TILE_GAP),
          y: Math.floor(i / COLS) * (TILE_H + TILE_GAP),
        },
      }));
    }

    const idToProduct = new Map(visible.map(p => [p.id, p]));
    const ordered = layout.productOrder
      .map(id => idToProduct.get(id))
      .filter(Boolean) as DemoProduct[];

    const savedIds = new Set(layout.productOrder);
    const unsaved = visible.filter(p => !savedIds.has(p.id));
    const finalOrder = [...ordered, ...unsaved];

    return finalOrder.map((p, i) => ({
      ...p,
      grid_position: {
        x: (i % COLS) * (TILE_W + TILE_GAP),
        y: Math.floor(i / COLS) * (TILE_H + TILE_GAP),
      },
    }));
  }, [layout, allProducts]);

  // Get ALL products (including hidden) — for admin views like inventory
  const getAllProductsUnfiltered = useCallback((): DemoProduct[] => {
    const all = allProducts();
    if (!layout || layout.productOrder.length === 0) {
      return all.map((p, i) => ({
        ...p,
        grid_position: {
          x: (i % COLS) * (TILE_W + TILE_GAP),
          y: Math.floor(i / COLS) * (TILE_H + TILE_GAP),
        },
      }));
    }
    const idToProduct = new Map(all.map(p => [p.id, p]));
    const ordered = layout.productOrder
      .map(id => idToProduct.get(id))
      .filter(Boolean) as DemoProduct[];
    const savedIds = new Set(layout.productOrder);
    const unsaved = all.filter(p => !savedIds.has(p.id));
    return [...ordered, ...unsaved].map((p, i) => ({
      ...p,
      grid_position: {
        x: (i % COLS) * (TILE_W + TILE_GAP),
        y: Math.floor(i / COLS) * (TILE_H + TILE_GAP),
      },
    }));
  }, [layout, allProducts]);

  // Get categories in saved order — excludes hidden tags
  const getOrderedCategories = useCallback((): string[] => {
    const hidden = new Set((layout?.hiddenTags || []).map(t => t.toUpperCase()));
    
    if (!layout || layout.categoryOrder.length === 0) {
      const all = allProducts();
      const cats = new Set(all.map(p => p.category));
      return ['ALL', ...Array.from(cats).map(c => c.toUpperCase()).filter(c => !hidden.has(c))];
    }
    const savedCats = layout.categoryOrder.map(c => c.toUpperCase());
    const all = allProducts();
    const allCats = new Set(all.map(p => p.category.toUpperCase()));
    const missing = Array.from(allCats).filter(c => !savedCats.includes(c) && c !== 'ALL');
    return [...savedCats, ...missing].filter(c => !hidden.has(c));
  }, [layout, allProducts]);

  const resetLayout = useCallback(() =>
    persistLayout(() => ({ ...EMPTY_LAYOUT })), [persistLayout]);

  return { layout, loading, saveLayout, saveHiddenTags, saveHiddenProductTypes, saveHiddenProductIds, saveHiddenGenders, saveDemoProductOverride, resetLayout, getOrderedProducts, getOrderedCategories, getAllProductsUnfiltered };
}
