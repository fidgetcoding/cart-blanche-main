import { useEffect, useRef, useState } from 'react';
import { useNavigate, Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { realAuth } from '@/lib/demo/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { SmartChatPanel } from '@/components/admin/SmartChatPanel';
import {
  LayoutDashboard,
  Tag,
  Grid3X3,
  ShoppingCart,
  Warehouse,
  Settings,
  Store,
  Layers,
  FlaskConical,
  Ruler,
  Mail,
  Users,
  Sparkles,
  X,
} from 'lucide-react';

// Below this width the chat opens over the page instead of beside it: next to a 380px chat,
// a tablet's page was too narrow for the nav and the pages' own layouts.
const CHAT_BESIDE_PAGE_MIN_WIDTH = 1024;

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/inventory', icon: Warehouse, label: 'Inventory' },
  { to: '/admin/grid', icon: Grid3X3, label: 'Grid Editor' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/admin/waitlist', icon: Mail, label: 'Waitlist' },
  { to: '/admin/subscribers', icon: Users, label: 'Subscribers' },
  { to: '/admin/discounts', icon: Tag, label: 'Discounts' },
  { to: '/admin/size-charts', icon: Ruler, label: 'Size Charts' },
  { to: '/admin/styling-guide', icon: Layers, label: 'Look Book' },
  { to: '/admin/lab', icon: FlaskConical, label: 'Template Lab' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const isMobile = useIsMobile(CHAT_BESIDE_PAGE_MIN_WIDTH);
  // A phone or tablet can't fit the chat beside the page, so it opens over it.
  const [chatOpen, setChatOpen] = useState(false);
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);

  // A narrow nav scrolls sideways, so bring the current page's tab into view.
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [pathname, loading]);

  // No session means demo data, never a redirect: pages read through the
  // demo-aware client in @/lib/demo/client, so they stay away from the database.
  useEffect(() => {
    const applySession = (session: Session | null) => {
      setIsDemo(!session);
      setLoading(false);
    };
    const { data: { subscription } } = realAuth.onAuthStateChange((_event, session) => applySession(session));
    realAuth.getSession().then(({ data: { session } }) => applySession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-display text-muted-foreground tracking-widest animate-pulse">LOADING...</div>
      </div>
    );
  }

  /* ── MAIN ADMIN LAYOUT ── */
  return (
    <div key={isDemo ? 'demo' : 'live'} className="h-screen dynamic-bg flex flex-col lg:flex-row overflow-hidden">
      {/* Left side: brand header + chat panel */}
      <div className={`flex flex-col flex-shrink-0 lg:border-r border-sidebar-border lg:h-full ${isMobile && chatOpen ? 'flex-1 min-h-0' : ''}`}>
        <div className="h-12 liquid-glass border-b border-sidebar-border flex items-center px-3 xl:px-5 flex-shrink-0 gap-2">
          <h1 className="font-display text-xs font-bold tracking-[0.2em] text-sidebar-foreground flex-shrink-0">CART BLANCHE</h1>
          {isDemo && (
            <Link
              to="/auth"
              title="Sample data. Changes aren't saved. Merchants can sign in here."
              className="text-[9px] font-display tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground whitespace-nowrap flex-shrink-0 transition-colors"
            >
              Demo data
            </Link>
          )}
          <div className="flex-1" />
          {isMobile && (
            <button
              onClick={() => setChatOpen(open => !open)}
              title={chatOpen ? 'Close AI store manager' : 'Open AI store manager'}
              aria-label={chatOpen ? 'Close AI store manager' : 'Open AI store manager'}
              className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors flex-shrink-0"
            >
              {chatOpen ? <X className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-display tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors whitespace-nowrap flex-shrink-0"
            title="Back to Store"
          >
            <span className="text-[10px] tracking-wider opacity-80">SMART SHOP</span>
            <Store className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className={isMobile && !chatOpen ? 'hidden' : 'contents'}>
          <SmartChatPanel overlay={isMobile} />
        </div>
      </div>

      {/* Right side: nav header + content */}
      <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${isMobile && chatOpen ? 'hidden' : ''}`}>
        <header ref={navRef} className="h-12 liquid-glass border-b border-sidebar-border flex items-center px-3 xl:px-5 flex-shrink-0 z-10 overflow-x-auto lg:overflow-hidden gap-0.5">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) =>
                `group flex items-center gap-1.5 px-2 xl:px-3 py-1.5 rounded-md text-[11px] font-display tracking-wider transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span
                    className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out ${
                      isActive
                        ? 'max-w-[160px] opacity-100'
                        : 'max-w-0 opacity-0 group-hover:max-w-[160px] group-hover:opacity-100'
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          <div className="flex-1" />
          <NavLink
            to="/admin/settings"
            title="Settings"
            aria-label="Settings"
            className={({ isActive }) =>
              `flex items-center justify-center p-1.5 rounded-md transition-colors flex-shrink-0 ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`
            }
          >
            <Settings className="w-3.5 h-3.5" />
          </NavLink>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
