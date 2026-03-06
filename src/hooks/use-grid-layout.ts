import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import type { DemoProduct } from '@/data/demo-data';

const TILE_W = 220;
const TILE_H = 300;
const TILE_GAP = 6;
const COLS = 5;

export interface GridLayout {
  productOrder: string[];
  categoryOrder: string[];
  hiddenTags: string[];
  hiddenProductTypes: string[];
  hiddenProductIds: string[];
}

const EMPTY_LAYOUT: GridLayout = { productOrder: [], categoryOrder: [], hiddenTags: [], hiddenProductTypes: [], hiddenProductIds: [] };

// Broadcast layout changes across hook instances
const LAYOUT_CHANGE_EVENT = 'grid-layout-changed';
function broadcastLayoutChange(layout: GridLayout) {
  window.dispatchEvent(new CustomEvent(LAYOUT_CHANGE_EVENT, { detail: layout }));
}

export function useGridLayout() {
  const [layout, setLayout] = useState<GridLayout | null>(null);
  const [dbProducts, setDbProducts] = useState<DemoProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen for layout changes from other hook instances
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<GridLayout>).detail;
      setLayout(detail);
    };
    window.addEventListener(LAYOUT_CHANGE_EVENT, handler);
    return () => window.removeEventListener(LAYOUT_CHANGE_EVENT, handler);
  }, []);

  // Fetch saved layout and DB products on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Wait for auth before fetching — RLS requires authenticated user
        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase
          .from('grid_layouts')
          .select('product_order, category_order, hidden_tags, hidden_product_types, hidden_product_ids')
          .eq('layout_type', 'default');

        if (user) {
          query = query.eq('merchant_id', user.id);
        }

        const { data: layoutData } = await query.limit(1).maybeSingle();

        if (layoutData) {
          setLayout({
            productOrder: (layoutData.product_order as string[])?.length > 0 ? (layoutData.product_order as string[]) : [],
            categoryOrder: (layoutData.category_order as string[])?.length > 0 ? (layoutData.category_order as string[]) : [],
            hiddenTags: (layoutData.hidden_tags as string[]) || [],
            hiddenProductTypes: (layoutData.hidden_product_types as string[]) || [],
            hiddenProductIds: (layoutData.hidden_product_ids as string[]) || [],
          });
        }

        // Fetch DB products (active ones, publicly readable)
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active');

        if (products && products.length > 0) {
          const productIds = products.map(p => p.id);
          const { data: variants } = await supabase
            .from('product_variants')
            .select('*')
            .in('product_id', productIds);

          const variantMap = new Map<string, any[]>();
          variants?.forEach(v => {
            const list = variantMap.get(v.product_id) || [];
            list.push(v);
            variantMap.set(v.product_id, list);
          });

          setDbProducts(products.map(p => {
            const pvs = variantMap.get(p.id) || [];
            return {
              id: p.id,
              title: p.title,
              price: p.price,
              compare_at_price: p.compare_at_price ?? undefined,
              images: (p.images || []).map((url: string) => ({
                thumb: url, medium: url, full: url,
              })),
              category: p.category || 'uncategorized',
              product_category: '' as const,
              status: 'active' as const,
              grid_position: { x: 0, y: 0 },
              description: p.description || '',
              variants: pvs.map(v => ({
                id: v.id,
                title: v.title,
                options: v.options as Record<string, string> || {},
                inventory_count: v.inventory_count ?? 0,
                price: v.price ?? undefined,
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
  }, []);

  // Merge demo + DB products
  const allProducts = useCallback((): DemoProduct[] => {
    return [...DEMO_PRODUCTS, ...dbProducts];
  }, [dbProducts]);

  // Save layout to Supabase (requires auth)
  const saveLayout = useCallback(async (productOrder: string[], categoryOrder: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const current = layout || EMPTY_LAYOUT;
    const { error } = await supabase
      .from('grid_layouts')
      .upsert({
        merchant_id: user.id,
        layout_type: 'default',
        product_order: productOrder,
        category_order: categoryOrder,
        hidden_tags: current.hiddenTags,
        hidden_product_types: current.hiddenProductTypes,
        hidden_product_ids: current.hiddenProductIds,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,layout_type' });

    if (!error) {
      const updated: GridLayout = { ...current, productOrder, categoryOrder };
      setLayout(updated);
      broadcastLayoutChange(updated);
    }
    return !error;
  }, [layout]);

  // Save hidden tags
  const saveHiddenTags = useCallback(async (hiddenTags: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const current = layout || EMPTY_LAYOUT;
    const { error } = await supabase
      .from('grid_layouts')
      .upsert({
        merchant_id: user.id,
        layout_type: 'default',
        product_order: current.productOrder,
        category_order: current.categoryOrder,
        hidden_tags: hiddenTags,
        hidden_product_types: current.hiddenProductTypes,
        hidden_product_ids: current.hiddenProductIds,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,layout_type' });

    if (!error) {
      const updated: GridLayout = { ...current, hiddenTags };
      setLayout(updated);
      broadcastLayoutChange(updated);
    }
    return !error;
  }, [layout]);

  // Save hidden product types
  const saveHiddenProductTypes = useCallback(async (hiddenProductTypes: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('grid_layouts')
      .upsert({
        merchant_id: user.id,
        layout_type: 'default',
        hidden_product_types: hiddenProductTypes,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,layout_type' });

    if (!error) {
      const updated: GridLayout = { ...EMPTY_LAYOUT, ...layout, hiddenProductTypes };
      setLayout(updated);
      broadcastLayoutChange(updated);
    }
    return !error;
  }, [layout]);

  // Save hidden product IDs
  const saveHiddenProductIds = useCallback(async (hiddenProductIds: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('grid_layouts')
      .upsert({
        merchant_id: user.id,
        layout_type: 'default',
        hidden_product_ids: hiddenProductIds,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,layout_type' });

    if (!error) {
      const updated: GridLayout = { ...EMPTY_LAYOUT, ...layout, hiddenProductIds };
      setLayout(updated);
      broadcastLayoutChange(updated);
    }
    return !error;
  }, [layout]);

  // Get products in saved order, excluding hidden product IDs
  const getOrderedProducts = useCallback((): DemoProduct[] => {
    const all = allProducts();
    const hiddenIds = new Set(layout?.hiddenProductIds || []);

    // Filter out hidden products
    const visible = all.filter(p => !hiddenIds.has(p.id));

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

  // Reset layout
  const resetLayout = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('grid_layouts')
      .upsert({
        merchant_id: user.id,
        layout_type: 'default',
        product_order: [],
        category_order: [],
        hidden_tags: [],
        hidden_product_types: [],
        hidden_product_ids: [],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,layout_type' });

    if (!error) {
      const updated: GridLayout = { ...EMPTY_LAYOUT };
      setLayout(updated);
      broadcastLayoutChange(updated);
    }
    return !error;
  }, []);

  return { layout, loading, saveLayout, saveHiddenTags, saveHiddenProductTypes, saveHiddenProductIds, resetLayout, getOrderedProducts, getOrderedCategories, getAllProductsUnfiltered };
}
