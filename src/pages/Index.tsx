import { CartProvider } from '@/contexts/CartContext';
import { StyleKitProvider } from '@/contexts/StyleKitContext';
import { SpatialCanvas } from '@/components/storefront/SpatialCanvas';
import { StyleKitView } from '@/components/storefront/StyleKitView';

const Index = () => {
  return (
    <CartProvider>
      <StyleKitProvider>
        <SpatialCanvas />
        <StyleKitView />
      </StyleKitProvider>
    </CartProvider>
  );
};

export default Index;
