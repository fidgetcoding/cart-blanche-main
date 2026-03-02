import { CartProvider } from '@/contexts/CartContext';
import { SmartCartProvider } from '@/contexts/SmartCartContext';
import { StyleKitProvider } from '@/contexts/StyleKitContext';
import { SpatialCanvas } from '@/components/storefront/SpatialCanvas';
import { StyleKitView } from '@/components/storefront/StyleKitView';

const Index = () => {
  return (
    <div className="h-screen w-full">
      <CartProvider>
        <SmartCartProvider>
          <StyleKitProvider>
            <SpatialCanvas />
            <StyleKitView />
          </StyleKitProvider>
        </SmartCartProvider>
      </CartProvider>
    </div>
  );
};

export default Index;
