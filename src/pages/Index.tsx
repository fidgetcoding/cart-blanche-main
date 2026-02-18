import { CartProvider } from '@/contexts/CartContext';
import { StyleKitProvider } from '@/contexts/StyleKitContext';
import { ALEProvider } from '@/contexts/ALEContext';
import { SpatialCanvas } from '@/components/storefront/SpatialCanvas';
import { StyleKitView } from '@/components/storefront/StyleKitView';
import { DEMO_PRODUCTS } from '@/data/demo-data';

const pinnedIds = DEMO_PRODUCTS.filter(p => false).map(p => p.id); // no demo pins

const Index = () => {
  return (
    <CartProvider>
      <StyleKitProvider>
        <ALEProvider enabled={true} intensity="medium" pinnedProductIds={pinnedIds}>
          <SpatialCanvas />
          <StyleKitView />
        </ALEProvider>
      </StyleKitProvider>
    </CartProvider>
  );
};

export default Index;
