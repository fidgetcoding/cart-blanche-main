import { useEffect, useState } from 'react';
import { useNavigate, Outlet, NavLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SmartChatPanel } from '@/components/admin/SmartChatPanel';
import {
  LayoutDashboard,
  Package,
  Grid3X3,
  GitBranch,
  ShoppingCart,
  Warehouse,
  Settings,
  Store,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/grid', icon: Grid3X3, label: 'Grid' },
  { to: '/admin/flow', icon: GitBranch, label: 'Flow' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/admin/inventory', icon: Warehouse, label: 'Inventory' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate('/auth');
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/auth');
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-display text-muted-foreground tracking-widest animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top ribbon header */}
      <header className="h-12 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-1 flex-shrink-0 z-10 overflow-hidden">
        <h1 className="font-display text-xs font-bold tracking-[0.2em] text-sidebar-foreground mr-4">CART BLANCHE</h1>

        {/* Nav items */}
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-display tracking-wider transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`
            }
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </NavLink>
        ))}

        {/* Spacer + View Store */}
        <div className="flex-1" />
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-display tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Store className="w-3.5 h-3.5" />
          Store
        </button>
      </header>

      {/* Body: chat on left, content on right */}
      <div className="flex flex-1 overflow-hidden">
        {/* AI Chat — always visible on left */}
        <SmartChatPanel />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
