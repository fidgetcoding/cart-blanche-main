import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CartProvider } from '@/contexts/CartContext';
import { SmartCartProvider } from '@/contexts/SmartCartContext';
import { MaisonCanvas } from '@/components/storefront/MaisonCanvas';

export default function SlTemplate() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#FAF7F2' }}>
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
        style={{
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid #e8e4de',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
        }}
      >
        <button
          onClick={() => navigate('/admin/lab')}
          className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase hover:opacity-70 transition-opacity"
          style={{ color: '#1a1a1a' }}
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          BACK TO SMART PORTAL
        </button>
        <div className="flex-1" />
        <span className="text-[10px] tracking-[0.25em] uppercase" style={{ color: '#999' }}>
          MAISON TEMPLATE · PREVIEW
        </span>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto">
        <CartProvider>
          <SmartCartProvider>
            <MaisonCanvas />
          </SmartCartProvider>
        </CartProvider>
      </div>
    </div>
  );
}
