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
  Layers,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/grid', icon: Grid3X3, label: 'Grid' },
  { to: '/admin/flow', icon: GitBranch, label: 'Flow' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/admin/inventory', icon: Warehouse, label: 'Inventory' },
  { to: '/admin/styling-guide', icon: Layers, label: 'Styling Guide' },
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
    <div className="min-h-screen bg-background flex">
      {/* Left side: brand header + chat panel */}
      <div className="flex flex-col flex-shrink-0 border-r border-sidebar-border">
        {/* Brand section in header — aligns with chat panel width */}
        <div className="h-12 bg-sidebar border-b border-sidebar-border flex items-center px-3 xl:px-5 flex-shrink-0">
          <h1 className="font-display text-xs font-bold tracking-[0.2em] text-sidebar-foreground flex-shrink-0">CARTE BLANCHE</h1>
        </div>
        <SmartChatPanel />
      </div>

      {/* Right side: nav header + content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Nav ribbon — same height as brand bar, inline */}
        <header className="h-12 bg-sidebar border-b border-sidebar-border flex items-center px-3 xl:px-5 flex-shrink-0 z-10 overflow-hidden gap-0.5">
          {/* Store link */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-2 xl:px-3 py-1.5 rounded-md text-[11px] font-display tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors whitespace-nowrap flex-shrink-0 mr-1"
            title="Store"
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Store</span>
          </button>

          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-2 xl:px-3.5 py-1.5 rounded-md text-[11px] font-display tracking-wider transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{item.label}</span>
            </NavLink>
          ))}

          <div className="flex-1" />
          <NavLink
            to="/admin/settings"
            title="Settings"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-2 xl:px-3.5 py-1.5 rounded-md text-[11px] font-display tracking-wider transition-colors whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`
            }
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Settings</span>
          </NavLink>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
