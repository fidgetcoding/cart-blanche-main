import { CartProvider } from '@/contexts/CartContext';
import { SpatialCanvas } from '@/components/storefront/SpatialCanvas';

const Index = () => {
  return (
    <CartProvider>
      <SpatialCanvas />
    </CartProvider>
  );
};

export default Index;
