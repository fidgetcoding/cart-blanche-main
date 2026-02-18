import { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
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
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/grid', icon: Grid3X3, label: 'Grid Editor' },
  { to: '/admin/flow', icon: GitBranch, label: 'Flow Editor' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/admin/inventory', icon: Warehouse, label: 'Inventory' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/auth');
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // handleLogout removed — now in Settings page

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-display text-muted-foreground tracking-widest animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div>
            <h1 className="font-display text-sm font-bold tracking-[0.2em] text-sidebar-foreground">CART BLANCHE</h1>
            <p className="text-[10px] text-text-dim mt-1 tracking-widest">MERCHANT PORTAL</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="ml-auto p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            title="View Store"
          >
            <Store className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Smart Chat AI Panel */}
      <SmartChatPanel />
    </div>
  );
}
