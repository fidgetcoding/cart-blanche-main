import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CartProvider } from '@/contexts/CartProvider';
import { SmartCartProvider } from '@/contexts/SmartCartProvider';
import { StyleKitProvider } from '@/contexts/StyleKitProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { DEMO_PRODUCTS } from '@/data/demo-data';

vi.mock('@/integrations/supabase/client', () => ({ supabase: null, isBackendConfigured: false }));
for (const observer of ['IntersectionObserver', 'ResizeObserver']) {
  vi.stubGlobal(observer, class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
}

// The merchant hid "women" in Inventory, which saves grid_layouts.hidden_genders.
vi.mock('@/hooks/use-grid-layout', async () => {
  const { DEMO_PRODUCTS: products } = await import('@/data/demo-data');
  const ordered = products.map((p, i) => ({ ...p, grid_position: { x: (i % 5) * 226, y: Math.floor(i / 5) * 306 } }));
  const categories = ['ALL', ...new Set(products.map(p => p.category.toUpperCase()))];
  const layout = {
    productOrder: [], categoryOrder: [], hiddenTags: [], hiddenProductTypes: [], hiddenProductIds: [],
    hiddenGenders: ['women'], demoProductOverrides: {},
  };
  const getOrderedProducts = () => ordered;
  const getOrderedCategories = () => categories;
  return { useGridLayout: () => ({ layout, loading: false, getOrderedProducts, getOrderedCategories }) };
});

import { SpatialCanvas } from '../SpatialCanvas';
import { MaisonCanvas } from '../MaisonCanvas';
import { ProductView } from '../ProductView';

const womens = DEMO_PRODUCTS.find(p => p.gender === 'women')!;
const mens = DEMO_PRODUCTS.find(p => p.gender === 'men')!;

function shell(children: React.ReactNode) {
  return (
    <MemoryRouter>
      <ThemeProvider>
        <CartProvider>
          <SmartCartProvider>
            <StyleKitProvider>{children}</StyleKitProvider>
          </SmartCartProvider>
        </CartProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('a gender hidden in Inventory', () => {
  it('leaves the YZ canvas: no products, no chip', async () => {
    render(shell(<SpatialCanvas />));
    await screen.findByRole('button', { name: 'OUTERWEAR' });
    expect(screen.queryByAltText(womens.title)).toBeNull();
    expect(screen.getByAltText(mens.title)).toBeTruthy();
    expect(screen.queryByTitle('Women')).toBeNull();
    expect(screen.getByTitle('Men')).toBeTruthy();
  });

  it('leaves the YZ product view chips', () => {
    render(shell(
      <ProductView
        productIndex={0}
        products={DEMO_PRODUCTS.filter(p => p.gender !== 'women')}
        categories={['ALL']}
        activeCategory="ALL"
        onCategoryChange={() => {}}
        onClose={() => {}}
        onNavigate={() => {}}
        onToggleGender={() => {}}
        availableGenders={new Set(['men', 'unisex'])}
        hiddenGenders={['women']}
      />,
    ));
    expect(screen.queryByTitle('Women')).toBeNull();
    expect(screen.getByTitle('Men')).toBeTruthy();
  });

  it('leaves the SL grid and its filter', async () => {
    render(shell(<MaisonCanvas />));
    await screen.findByRole('button', { name: 'OUTERWEAR' });
    const grid = document.querySelector<HTMLElement>('.grid.w-full')!;
    expect(within(grid).queryByText(womens.title)).toBeNull();
    expect(within(grid).getAllByText(mens.title).length).toBeGreaterThan(0);
    fireEvent.mouseEnter(screen.getByText('CATEGORY').closest('button')!);
    expect(await screen.findByRole('button', { name: 'Men' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Women' })).toBeNull();
  });
});
