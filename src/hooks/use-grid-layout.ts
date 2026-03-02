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
}

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
        // Fetch layout
        const { data: layoutData } = await supabase
          .from('grid_layouts')
          .select('product_order, category_order, hidden_tags, hidden_product_types')
          .eq('layout_type', 'default')
          .limit(1)
          .maybeSingle();

        if (layoutData) {
          setLayout({
            productOrder: (layoutData.product_order as string[])?.length > 0 ? (layoutData.product_order as string[]) : [],
            categoryOrder: (layoutData.category_order as string[])?.length > 0 ? (layoutData.category_order as string[]) : [],
            hiddenTags: (layoutData.hidden_tags as string[]) || [],
            hiddenProductTypes: (layoutData.hidden_product_types as string[]) || [],
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
              images: p.images || [],
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

  // Merge demo + DB products (DB products won't have demo IDs so no dupes)
  const allProducts = useCallback((): DemoProduct[] => {
    return [...DEMO_PRODUCTS, ...dbProducts];
  }, [dbProducts]);

  // Save layout to Supabase (requires auth)
  const saveLayout = useCallback(async (productOrder: string[], categoryOrder: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('grid_layouts')
      .upsert({
        merchant_id: user.id,
        layout_type: 'default',
        product_order: productOrder,
        category_order: categoryOrder,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,layout_type' });

    if (!error) {
      const updated = { productOrder, categoryOrder, hiddenTags: layout?.hiddenTags || [], hiddenProductTypes: layout?.hiddenProductTypes || [] };
      setLayout(updated);
      broadcastLayoutChange(updated);
    }
    return !error;
  }, []);

  // Save hidden tags
  const saveHiddenTags = useCallback(async (hiddenTags: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('grid_layouts')
      .upsert({
        merchant_id: user.id,
        layout_type: 'default',
        hidden_tags: hiddenTags,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,layout_type' });

    if (!error) {
      const updated = layout ? { ...layout, hiddenTags } : { productOrder: [], categoryOrder: [], hiddenTags, hiddenProductTypes: [] };
      setLayout(updated);
      broadcastLayoutChange(updated);
    }
    return !error;
  }, []);

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
      const updated = layout ? { ...layout, hiddenProductTypes } : { productOrder: [], categoryOrder: [], hiddenTags: [], hiddenProductTypes };
      setLayout(updated);
      broadcastLayoutChange(updated);
    }
    return !error;
  }, []);

  // Get products in saved order (with grid positions recalculated)
  const getOrderedProducts = useCallback((): DemoProduct[] => {
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
    const finalOrder = [...ordered, ...unsaved];

    return finalOrder.map((p, i) => ({
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

  // Reset layout (clear saved order)
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
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,layout_type' });

    if (!error) {
      const updated = { productOrder: [], categoryOrder: [], hiddenTags: [], hiddenProductTypes: [] };
      setLayout(updated);
      broadcastLayoutChange(updated);
    }
    return !error;
  }, []);

  return { layout, loading, saveLayout, saveHiddenTags, saveHiddenProductTypes, resetLayout, getOrderedProducts, getOrderedCategories };
}
