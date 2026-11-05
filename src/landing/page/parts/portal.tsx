// SmartPortal, AI Manager and Template Lab chapter UI. The frame is AdminLayout.tsx (brand header,
// SmartChatPanel column, tab header, page). Dashboard, Orders, Waitlist, Subscribers, Discounts and
// Size Charts are the real page components; the chat column copies SmartChatPanel.tsx markup.
import { Component, lazy, memo, Suspense, useCallback, useLayoutEffect, useState, type ReactNode } from 'react';
import {
  LayoutDashboard, Warehouse, Grid3X3, ShoppingCart, Mail, Users, Tag, Ruler, Layers, FlaskConical, Settings, Store,
  Sparkles, BarChart3, Package, ImagePlus, Send, PanelLeft, Check, XCircle, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDashboardDataForRange } from '@/data/mock-orders';
import { useLatch } from '../lib/core';
import { portalPageImports } from '../lib/portal-pages';
import { FitWidth, Layer, PortalDark } from './core';
import { GridEditorPage, InventoryPage, LabPage } from './pages';

export type Route = 'dashboard' | 'inventory' | 'grid' | 'orders' | 'waitlist' | 'subscribers' | 'discounts' | 'size-charts' | 'styling-guide' | 'lab';
const NAV: { key: Route; icon: LucideIcon; label: string }[] = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' }, { key: 'inventory', icon: Warehouse, label: 'Inventory' },
  { key: 'grid', icon: Grid3X3, label: 'Grid Editor' }, { key: 'orders', icon: ShoppingCart, label: 'Orders' },
  { key: 'waitlist', icon: Mail, label: 'Waitlist' }, { key: 'subscribers', icon: Users, label: 'Subscribers' },
  { key: 'discounts', icon: Tag, label: 'Discounts' }, { key: 'size-charts', icon: Ruler, label: 'Size Charts' },
  { key: 'styling-guide', icon: Layers, label: 'Look Book' }, { key: 'lab', icon: FlaskConical, label: 'Template Lab' },
];

// SmartChatPanel.tsx PROMPTS_BY_ROUTE (routes without their own set fall back to dashboard there too).
const PROMPTS: Partial<Record<Route, { icon: LucideIcon; label: string }[]>> = {
  dashboard: [{ icon: BarChart3, label: 'Sales Report' }, { icon: Package, label: 'View Products' }, { icon: Tag, label: 'Pricing Help' }, { icon: Sparkles, label: 'Generate Copy' }],
  inventory: [{ icon: Warehouse, label: 'Low Stock' }, { icon: Package, label: 'Stock Overview' }, { icon: BarChart3, label: 'Restock Alerts' }, { icon: Sparkles, label: 'Stock Planning' }],
  orders: [{ icon: ShoppingCart, label: 'Recent Orders' }, { icon: BarChart3, label: 'Revenue' }, { icon: Package, label: 'Unfulfilled' }, { icon: Sparkles, label: 'Order Trends' }],
  grid: [{ icon: Grid3X3, label: 'Grid Tips' }, { icon: Sparkles, label: 'Layout Ideas' }, { icon: Package, label: 'Featured Items' }, { icon: Tag, label: 'Editorial Help' }],
  discounts: [{ icon: Tag, label: 'Active Codes' }, { icon: Sparkles, label: 'Promo Strategy' }, { icon: BarChart3, label: 'Top Codes' }, { icon: Package, label: 'New Code' }],
  lab: [{ icon: Sparkles, label: 'Browse Templates' }, { icon: Settings, label: 'Customize' }, { icon: Grid3X3, label: 'Compare' }, { icon: Package, label: 'Recommend' }],
};

function BrandBar() {
  return (
    <div className="h-12 liquid-glass border-b border-sidebar-border flex items-center px-3 xl:px-5 flex-shrink-0 gap-2">
      <h1 className="font-display text-xs font-bold tracking-[0.2em] text-sidebar-foreground flex-shrink-0">CART BLANCHE</h1>
      <span className="text-[9px] font-display tracking-wider text-sidebar-foreground/50 whitespace-nowrap flex-shrink-0">Demo data</span>
      <div className="flex-1" />
      <span className="group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-display tracking-wider text-sidebar-foreground/60 whitespace-nowrap flex-shrink-0">
        <span className="text-[10px] tracking-wider opacity-80">SMART SHOP</span><Store className="w-3.5 h-3.5" />
      </span>
    </div>
  );
}

export function PortalNav({ active }: { active: Route }) {
  return (
    <header className="h-12 liquid-glass border-b border-sidebar-border flex items-center px-3 xl:px-5 flex-shrink-0 z-10 overflow-hidden gap-0.5">
      {NAV.map(item => {
        const on = item.key === active;
        return (
          <span key={item.key} className={`group flex items-center gap-1.5 px-2 xl:px-3 py-1.5 rounded-md text-[11px] font-display tracking-wider transition-colors duration-500 whitespace-nowrap ${on ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60'}`}>
            <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-500 ease-out ${on ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0'}`}>{item.label}</span>
          </span>
        );
      })}
      <div className="flex-1" />
      <span className="flex items-center justify-center p-1.5 rounded-md flex-shrink-0 text-sidebar-foreground/60"><Settings className="w-3.5 h-3.5" /></span>
    </header>
  );
}

/** SmartChatPanel.tsx new-chat state for a route. */
function Suggestions({ route }: { route: Route }) {
  const list = PROMPTS[route] ?? PROMPTS.dashboard!;
  return (
    <div className="space-y-4 pt-6">
      <div className="text-center space-y-2">
        <Sparkles className="w-7 h-7 text-accent mx-auto" />
        <h3 className="font-display text-xs font-semibold tracking-wider">AI STORE MANAGER</h3>
        <p className="text-[11px] text-muted-foreground">Ask me anything about your store.</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 pt-2">
        {list.map(p => (
          <span key={p.label} className="flex flex-col items-start gap-1 p-2.5 rounded-lg liquid-glass text-left transition-all">
            <p.icon className="w-3.5 h-3.5 text-accent" /><span className="text-[10px] font-medium">{p.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function UserMsg({ children }: { children: ReactNode }) {
  return <div className="flex justify-end"><div className="max-w-[90%] rounded-xl px-3 py-2 text-sm bg-accent text-accent-foreground"><p>{children}</p></div></div>;
}
export function BotMsg({ children, tools }: { children: ReactNode; tools?: string[] }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-xl px-3 py-2 text-sm bg-card border border-border">
        <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1"><p>{children}</p></div>
        {tools && (
          <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-border/50">
            {tools.map(tl => <span key={tl} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">{tl}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

/** SmartChatPanel.tsx ActionConfirmCard, waiting for the merchant. */
export function ConfirmCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-card border-2 border-accent/30 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-accent">
        <Sparkles className="w-3.5 h-3.5" />
        <span className="text-[11px] font-display tracking-wider font-semibold">{title}</span>
      </div>
      <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono">{description}</pre>
      <div className="flex gap-2">
        <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-7"><Check className="w-3 h-3" />Confirm</Button>
        <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground text-xs h-7"><XCircle className="w-3 h-3" />Cancel</Button>
      </div>
    </div>
  );
}

function Composer({ text }: { text?: string }) {
  return (
    <div className="liquid-glass border-t border-sidebar-border p-3 rounded-t-xl">
      <div className="flex items-end gap-2">
        <span className="p-2 rounded-lg text-muted-foreground flex-shrink-0"><ImagePlus className="w-4 h-4" /></span>
        <span className={`flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm min-h-[36px] truncate ${text ? 'text-foreground' : 'text-muted-foreground'}`}>{text || 'Ask your AI store manager...'}</span>
        <span className="h-9 w-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center flex-shrink-0"><Send className="w-4 h-4" /></span>
      </div>
    </div>
  );
}

function ChatColumn({ route, chat, typed, title }: { route: Route; chat?: ReactNode; typed?: string; title?: string }) {
  return (
    <div className="flex-1 flex flex-col bg-sidebar overflow-hidden min-h-0">
      <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0">
        <span className="p-1 rounded text-muted-foreground"><PanelLeft className="w-3.5 h-3.5" /></span>
        {title && <span className="text-[10px] font-display tracking-wider text-muted-foreground truncate">{title}</span>}
      </div>
      <div className={`flex-1 overflow-hidden p-3 flex flex-col gap-3 ${chat ? 'justify-end' : ''}`}>{chat ?? <Suggestions route={route} />}</div>
      <Composer text={typed} />
    </div>
  );
}

/** A page that fails (its chunk didn't load) leaves its panel empty instead of taking the landing down. */
class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Mounts with its page, so the page's layer knows the page has arrived. */
function Arrived({ onArrive }: { onArrive: () => void }) {
  useLayoutEffect(onArrive, [onArrive]);
  return null;
}

/**
 * One portal page, mounted only around when it shows. Its layer fades in once the page has arrived: a page
 * whose chunk is still loading (a slow network, a visitor who scrolled straight here) fades in when it lands
 * instead of popping into an empty panel. A page that's ready arrives in the same frame, so nothing changes.
 */
function Page({ on, children, thumb }: { on: boolean; children: ReactNode; thumb: boolean }) {
  const mounted = useLatch(on);
  const [arrived, setArrived] = useState(false);
  const arrive = useCallback(() => setArrived(true), []);
  return (
    <Layer on={on && arrived} thumb={thumb} className="overflow-hidden">
      <PageBoundary><Suspense fallback={null}>{mounted && <>{children}<Arrived onArrive={arrive} /></>}</Suspense></PageBoundary>
    </Layer>
  );
}

// The real pages take no props and are heavy (the Dashboard's charts, the Orders table), so they're memoised:
// the story re-renders its frame as it scrolls, and that never needs to reach them.
const AdminDashboard = memo(lazy(portalPageImports.dashboard));
const AdminOrders = memo(lazy(portalPageImports.orders));
const AdminWaitlist = memo(lazy(portalPageImports.waitlist));
const AdminSubscribers = memo(lazy(portalPageImports.subscribers));
const AdminDiscounts = memo(lazy(portalPageImports.discounts));
const AdminSizeCharts = memo(lazy(portalPageImports.sizeCharts));

const PAGES: Partial<Record<Route, (t: number, thumb: boolean) => ReactNode>> = {
  dashboard: () => <AdminDashboard />,
  inventory: (t, thumb) => <InventoryPage open thumb={thumb} />,
  grid: (t, thumb) => <GridEditorPage t={t} thumb={thumb} />,
  orders: () => <AdminOrders />,
  waitlist: () => <AdminWaitlist />,
  subscribers: () => <AdminSubscribers />,
  discounts: () => <AdminDiscounts />,
  'size-charts': () => <AdminSizeCharts />,
};

/** AdminLayout.tsx at 1440 × 900. `pages` lists every route this frame can switch to. */
export function PortalFrame({ route, pages, t = 0, chat, typed, chatTitle, thumb = false, labActive = 'yz', compact, h = 900 }: {
  route: Route; pages: Route[]; t?: number; chat?: ReactNode; typed?: string; chatTitle?: string; thumb?: boolean; labActive?: 'yz' | 'sl';
  compact?: 'page' | 'chat'; h?: number;
}) {
  const main = (
    <main className="flex-1 relative overflow-hidden">
      {pages.map(r => (
        <Page key={r} on={r === route} thumb={thumb}>
          {r === 'lab' ? <LabPage active={labActive} /> : PAGES[r]?.(r === route ? t : 0, thumb)}
        </Page>
      ))}
    </main>
  );
  if (compact) {
    // The portal on a phone: one column, header, tabs, then the page or the AI store manager.
    return (
      <PortalDark className="w-full h-full dynamic-bg flex flex-col overflow-hidden rounded-xl border border-border">
        <BrandBar />
        <PortalNav active={route} />
        {compact === 'chat' ? <ChatColumn route={route} chat={chat} typed={typed} title={chatTitle} /> : main}
      </PortalDark>
    );
  }
  return (
    <PortalDark className="w-[1440px] dynamic-bg flex flex-row overflow-hidden" style={{ height: h }}>
      <div className="flex flex-col flex-shrink-0 border-r border-sidebar-border h-full" style={{ width: 380 }}>
        <BrandBar />
        <ChatColumn route={route} chat={chat} typed={typed} title={chatTitle} />
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <PortalNav active={route} />
        {main}
      </div>
    </PortalDark>
  );
}

const CYCLE: Route[] = ['orders', 'waitlist', 'subscribers', 'discounts', 'size-charts'];
const PORTAL_PAGES: Route[] = ['dashboard', 'inventory', ...CYCLE, 'grid'];

/** SmartPortal, four beats: 0 dashboard · 1 inventory by colourway · 2 orders to size charts · 3 Grid Editor. */
export function PortalVisual({ step, t, thumb = false, compact = false, framed = true }: { step: number; t: number; thumb?: boolean; compact?: boolean; framed?: boolean }) {
  const route: Route = step === 0 ? 'dashboard' : step === 1 ? 'inventory' : step === 2 ? CYCLE[Math.min(4, Math.floor(t * 5))] : 'grid';
  if (compact) return <PortalFrame route={route} pages={PORTAL_PAGES} t={step === 3 ? t : 0} thumb={thumb} compact="page" />;
  return (
    <FitWidth w={1440} minH={720} className={`w-full h-full ${framed ? 'rounded-xl border border-border' : ''}`} style={{ background: 'hsl(0 0% 5%)' }}>
      {h => <PortalFrame route={route} pages={PORTAL_PAGES} t={step === 3 ? t : 0} thumb={thumb} h={h} />}
    </FitWidth>
  );
}

const ROUTE_CYCLE: Route[] = ['dashboard', 'inventory', 'grid', 'discounts'];
const ASKS = ['Suggest prices for my catalog', 'Write descriptions for products missing one', 'Which variants need restocking?'];

/** AI Manager, three beats: 0 knows the page you're on · 1 ask it anything · 2 a change waits for Confirm. */
// The month the manager quotes, from the Dashboard's own mock orders. Worked out once, not on every scroll frame.
let month: ReturnType<typeof getDashboardDataForRange> | null = null;

export function ManagerVisual({ step, t, thumb = false, compact = false, framed = true }: { step: number; t: number; thumb?: boolean; compact?: boolean; framed?: boolean }) {
  const d = (month ??= getDashboardDataForRange('1M'));
  const sales = d.totalSales >= 1000 ? `$${(d.totalSales / 1000).toFixed(1)}K` : `$${d.totalSales}`;
  let route: Route = 'dashboard', chat: ReactNode = undefined, typed: string | undefined, title: string | undefined;
  if (step === 0) route = ROUTE_CYCLE[Math.min(3, Math.floor(t * 4))];
  if (step === 1) {
    title = 'How are my sales this month?';
    chat = (
      <>
        <UserMsg>How are my sales this month?</UserMsg>
        <BotMsg tools={['analyze_sales']}>{sales} in sales from {d.totalOrders} orders this month, ${d.avgOrderValue} per order on average.</BotMsg>
      </>
    );
    typed = ASKS[Math.min(2, Math.floor(t * 3))];
  }
  if (step === 2) {
    route = 'inventory';
    title = 'Which variants need restocking?';
    chat = (
      <>
        <UserMsg>Which variants need restocking?</UserMsg>
        <BotMsg tools={['query_inventory']}>Cloud Puffer Jacket in Forest, size L, is at 0 units.</BotMsg>
        <ConfirmCard title={'Update Inventory: "Cloud Puffer Jacket · Forest · L"'} description="0 → 12 units" />
      </>
    );
  }
  if (compact) return <PortalFrame route={route} pages={[]} chat={chat} typed={typed} chatTitle={title} thumb={thumb} compact="chat" />;
  return (
    <FitWidth w={1440} minH={720} className={`w-full h-full ${framed ? 'rounded-xl border border-border' : ''}`} style={{ background: 'hsl(0 0% 5%)' }}>
      {h => <PortalFrame route={route} pages={['dashboard', 'inventory', 'grid', 'discounts']} chat={chat} typed={typed} chatTitle={title} thumb={thumb} h={h} />}
    </FitWidth>
  );
}

/** The Lab page inside the portal shell (tab header + Templates), 1060 × 250, for the Template Lab chapter. */
export function LabPanel({ active }: { active: 'yz' | 'sl' }) {
  return (
    <PortalDark className="w-[1060px] h-[250px] dynamic-bg flex flex-col overflow-hidden rounded-xl border border-border">
      <PortalNav active="lab" />
      <LabPage active={active} />
    </PortalDark>
  );
}
