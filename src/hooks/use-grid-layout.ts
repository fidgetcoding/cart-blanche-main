import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import type { DemoProduct } from '@/data/demo-data';

const TILE_W = 220;
const TILE_H = 300;
const TILE_GAP = 6;
const COLS = 6;

export interface GridLayout {
  productOrder: string[];
  categoryOrder: string[];
}

export function useGridLayout() {
  const [layout, setLayout] = useState<GridLayout | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch saved layout on mount
  useEffect(() => {
    async function fetchLayout() {
      try {
        const { data, error } = await supabase
          .from('grid_layouts')
          .select('product_order, category_order')
          .eq('layout_type', 'default')
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          setLayout({
            productOrder: (data.product_order as string[])?.length > 0 ? (data.product_order as string[]) : [],
            categoryOrder: (data.category_order as string[])?.length > 0 ? (data.category_order as string[]) : [],
          });
        }
      } catch {
        // fallback to defaults
      }
      setLoading(false);
    }
    fetchLayout();
  }, []);

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
      setLayout({ productOrder, categoryOrder });
    }
    return !error;
  }, []);

  // Get products in saved order (with grid positions recalculated)
  const getOrderedProducts = useCallback((): DemoProduct[] => {
    if (!layout || layout.productOrder.length === 0) {
      return DEMO_PRODUCTS;
    }

    const idToProduct = new Map(DEMO_PRODUCTS.map(p => [p.id, p]));
    const ordered = layout.productOrder
      .map(id => idToProduct.get(id))
      .filter(Boolean) as DemoProduct[];

    // Append any new products not in saved order
    const savedIds = new Set(layout.productOrder);
    const unsaved = DEMO_PRODUCTS.filter(p => !savedIds.has(p.id));
    const allOrdered = [...ordered, ...unsaved];

    return allOrdered.map((p, i) => ({
      ...p,
      grid_position: {
        x: (i % COLS) * (TILE_W + TILE_GAP),
        y: Math.floor(i / COLS) * (TILE_H + TILE_GAP),
      },
    }));
  }, [layout]);

  // Get categories in saved order
  const getOrderedCategories = useCallback((): string[] => {
    if (!layout || layout.categoryOrder.length === 0) {
      const cats = new Set(DEMO_PRODUCTS.map(p => p.category));
      return ['ALL', ...Array.from(cats).map(c => c.toUpperCase())];
    }
    return layout.categoryOrder.map(c => c.toUpperCase());
  }, [layout]);

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
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,layout_type' });

    if (!error) {
      setLayout({ productOrder: [], categoryOrder: [] });
    }
    return !error;
  }, []);

  return { layout, loading, saveLayout, resetLayout, getOrderedProducts, getOrderedCategories };
}
