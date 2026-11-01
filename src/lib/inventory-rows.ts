import type { ProductImage } from '@/data/demo-data';
import type { Json } from '@/integrations/supabase/types';

interface HasId {
  id: string;
}

/**
 * Which rows the inventory lists. The grid hook's list can include a store's own
 * products, so they're removed from it to avoid listing them twice. Samples only
 * stay alongside real rows in the demo: a real store just sees what it sells.
 */
export function mergeInventoryRows<Row extends HasId>(dbRows: Row[], gridRows: Row[], isDemo: boolean): Row[] {
  if (!isDemo) return dbRows;
  const dbIds = new Set(dbRows.map(row => row.id));
  return [...dbRows, ...gridRows.filter(row => !dbIds.has(row.id))];
}

export interface SavableProduct {
  title: string;
  price: number;
  compare_at_price?: number;
  description: string;
  category: string;
  product_type: string;
  gender: string;
  tags: string[];
  images: string[];
  imagesFull: ProductImage[];
  status: string;
  weight_oz: number;
  shipping_type: string;
  hs_code: string;
}

/** Everything inventory edits on a real product, ready for the products table. */
export function productUpdate(product: SavableProduct) {
  return {
    title: product.title,
    price: product.price,
    compare_at_price: product.compare_at_price ?? null,
    description: product.description,
    category: product.category,
    product_type: product.product_type,
    gender: product.gender || 'unisex',
    tags: product.tags,
    images: product.images,
    image_details: product.imagesFull as unknown as Json,
    status: product.status,
    weight_oz: product.weight_oz,
    shipping_type: product.shipping_type,
    hs_code: product.hs_code,
  };
}

/**
 * A real product's photos, with what the merchant set on each. The details only
 * count while they still describe the photos on the product: anything else that
 * changes its images leaves them out of date.
 */
export function productImages(images: string[] | null, details: unknown): ProductImage[] {
  const urls = images ?? [];
  const saved = Array.isArray(details) ? (details as ProductImage[]) : [];
  const matches = saved.length === urls.length && saved.every((image, i) => image?.thumb === urls[i]);
  return matches ? saved : urls.map(url => ({ thumb: url, medium: url, full: url }));
}
