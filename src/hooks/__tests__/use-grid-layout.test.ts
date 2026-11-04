import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { DEMO_MERCHANT_ID } from '@/lib/demo/store';

const resolveStoreMerchantId = vi.hoisted(() => vi.fn());
const rows = vi.hoisted(() => ({ products: [] as Record<string, unknown>[] }));

vi.mock('@/lib/store-merchant', () => ({ resolveStoreMerchantId }));
vi.mock('@/lib/demo/client', () => ({
  supabase: {
    from(table: string) {
      const result = { data: table === 'products' ? rows.products : table === 'product_variants' ? [] : null };
      const chain: Record<string, unknown> = {
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
      };
      for (const method of ['select', 'eq', 'in', 'order', 'limit', 'maybeSingle']) chain[method] = () => chain;
      return chain;
    },
  },
}));

import { useGridLayout } from '../use-grid-layout';

const realProduct = { id: 'real-1', title: 'Real Tee', price: 40, images: [], category: 'essentials', status: 'active' };

async function productsFor(merchantId: string | null, products: Record<string, unknown>[]) {
  resolveStoreMerchantId.mockResolvedValue(merchantId);
  rows.products = products;
  const { result } = renderHook(() => useGridLayout());
  await waitFor(() => expect(result.current.loading).toBe(false));
  return result.current.getOrderedProducts().map(p => p.id);
}

describe('which products a store shows', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows only a real store\'s own products', async () => {
    expect(await productsFor('real-merchant', [realProduct])).toEqual(['real-1']);
  });

  it('gives shoppers the colors and photo choices the merchant saved', async () => {
    const olive = { id: 'olive', name: 'Olive', hex: '#556b2f' };
    resolveStoreMerchantId.mockResolvedValue('real-merchant');
    rows.products = [{
      ...realProduct,
      colorways: [olive],
      images: ['a', 'b'],
      image_details: [
        { thumb: 'a', medium: 'a', full: 'a' },
        { thumb: 'b', medium: 'b', full: 'b', featured: true, colorway_id: 'olive' },
      ],
    }];
    const { result } = renderHook(() => useGridLayout());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const [product] = result.current.getOrderedProducts();
    expect(product.colorways).toEqual([olive]);
    expect(product.images[0]).toMatchObject({ thumb: 'b', featured: true, colorway_id: 'olive' });
  });

  it('shows no samples on a real store with no products yet', async () => {
    expect(await productsFor('real-merchant', [])).toEqual([]);
  });

  it('keeps the samples in the demo when a reviewer adds a product', async () => {
    const ids = await productsFor(DEMO_MERCHANT_ID, [realProduct]);
    expect(ids).toContain('real-1');
    expect(ids).toHaveLength(DEMO_PRODUCTS.length + 1);
  });

  it('shows the samples with no store at all', async () => {
    expect(await productsFor(null, [])).toHaveLength(DEMO_PRODUCTS.length);
  });
});


it('keeps draft and archived demo products in admin but out of the shop', async () => {
  resolveStoreMerchantId.mockResolvedValue(DEMO_MERCHANT_ID);
  rows.products = [];
  const { result } = renderHook(() => useGridLayout());
  await waitFor(() => expect(result.current.loading).toBe(false));
  const [draft, archived] = DEMO_PRODUCTS;
  act(() => window.dispatchEvent(new CustomEvent('grid-layout-changed', { detail: {
    productOrder: [], categoryOrder: [], hiddenTags: [], hiddenProductTypes: [], hiddenProductIds: [], hiddenGenders: [],
    demoProductOverrides: { [draft.id]: { status: 'draft' }, [archived.id]: { status: 'archived' } },
  } })));
  expect(result.current.getAllProductsUnfiltered().map(p => p.id)).toContain(draft.id);
  expect(result.current.getOrderedProducts().map(p => p.id)).not.toContain(draft.id);
  expect(result.current.getOrderedProducts().map(p => p.id)).not.toContain(archived.id);
});
