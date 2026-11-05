import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CartProvider } from '@/contexts/CartProvider';
import { SmartCartProvider } from '@/contexts/SmartCartProvider';
import { StyleKitProvider } from '@/contexts/StyleKitProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';

vi.mock('@/hooks/use-grid-layout', () => ({
  useGridLayout: () => ({
    loading: false,
    layout: null,
    getOrderedProducts: () => [],
    getAllProductsUnfiltered: () => [],
    getOrderedCategories: () => ['ALL'],
  }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: null, isBackendConfigured: false }));
for (const observer of ['IntersectionObserver', 'ResizeObserver']) {
  vi.stubGlobal(observer, class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
}

import { MaisonCanvas } from '../MaisonCanvas';
import { SpatialCanvas } from '../SpatialCanvas';

const inProviders = (canvas: JSX.Element) => (
  <MemoryRouter>
    <ThemeProvider>
      <CartProvider>
        <SmartCartProvider>
          <StyleKitProvider>{canvas}</StyleKitProvider>
        </SmartCartProvider>
      </CartProvider>
    </ThemeProvider>
  </MemoryRouter>
);

describe('a real store with no products', () => {
  it('says so in the SL template', async () => {
    render(inProviders(<MaisonCanvas />));
    await screen.findByText('Nothing here yet');
  });

  it('says so in the YZ template', async () => {
    render(inProviders(<SpatialCanvas />));
    await screen.findByText('Nothing here yet');
  });
});
