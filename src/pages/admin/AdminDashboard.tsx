import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getMockOrderStats } from '@/data/mock-orders';
import { TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign, BarChart3, MapPin, Globe, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Realistic mock chart data
const salesVolumeData = [
  { name: 'Jan', thisMonth: 4820, lastMonth: 3910 },
  { name: 'Feb', thisMonth: 5340, lastMonth: 4200 },
  { name: 'Mar', thisMonth: 6100, lastMonth: 4850 },
  { name: 'Apr', thisMonth: 5780, lastMonth: 5100 },
  { name: 'May', thisMonth: 7200, lastMonth: 5640 },
  { name: 'Jun', thisMonth: 8450, lastMonth: 6320 },
  { name: 'Jul', thisMonth: 9100, lastMonth: 7100 },
  { name: 'Aug', thisMonth: 8700, lastMonth: 7580 },
  { name: 'Sep', thisMonth: 10200, lastMonth: 7900 },
  { name: 'Oct', thisMonth: 11500, lastMonth: 8400 },
  { name: 'Nov', thisMonth: 14200, lastMonth: 10100 },
  { name: 'Dec', thisMonth: 16800, lastMonth: 12500 },
];

const orderVolumeData = [
  { name: 'Jan', thisMonth: 18, lastMonth: 14 },
  { name: 'Feb', thisMonth: 22, lastMonth: 16 },
  { name: 'Mar', thisMonth: 27, lastMonth: 19 },
  { name: 'Apr', thisMonth: 24, lastMonth: 21 },
  { name: 'May', thisMonth: 31, lastMonth: 23 },
  { name: 'Jun', thisMonth: 38, lastMonth: 26 },
  { name: 'Jul', thisMonth: 42, lastMonth: 30 },
  { name: 'Aug', thisMonth: 39, lastMonth: 32 },
  { name: 'Sep', thisMonth: 46, lastMonth: 34 },
  { name: 'Oct', thisMonth: 52, lastMonth: 37 },
  { name: 'Nov', thisMonth: 64, lastMonth: 44 },
  { name: 'Dec', thisMonth: 78, lastMonth: 55 },
];

const channelData = [
  { name: 'Direct', value: 187, color: 'hsl(var(--primary))' },
  { name: 'Social', value: 143, color: 'hsl(var(--success))' },
  { name: 'Referral', value: 98, color: 'hsl(var(--warning))' },
  { name: 'Email', value: 73, color: 'hsl(var(--accent-foreground))' },
];

const locationData = [
  { region: 'United States', amount: 68400 },
  { region: 'Canada', amount: 14200 },
  { region: 'United Kingdom', amount: 9800 },
  { region: 'Germany', amount: 6100 },
  { region: 'Australia', amount: 4300 },
  { region: 'France', amount: 2900 },
];

const referrerData = [
  { source: 'Direct / None', amount: 42600 },
  { source: 'instagram.com', amount: 18900 },
  { source: 'tiktok.com', amount: 12400 },
  { source: 'google.com', amount: 8700 },
  { source: 'pinterest.com', amount: 3200 },
];

const plData = [
  { label: 'Gross Sales', amount: 108190 },
  { label: 'Discounts', amount: -6490 },
  { label: 'Refunds', amount: -2160 },
  { label: 'Shipping Costs', amount: -5410 },
  { label: 'Processing Fees', amount: -3246 },
  { label: 'Total Costs', amount: -17306 },
];

function formatK(n: number) {
  if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + n.toLocaleString();
}

function StatCard({ label, value, icon: Icon, change, changeLabel }: {
  label: string; value: string; icon: any; change?: number; changeLabel?: string;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-display tracking-[0.2em] text-muted-foreground">{label}</p>
        <Icon className="w-4 h-4 text-muted-foreground/50" />
      </div>
      <p className="font-display text-3xl font-bold mt-1">{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          {positive ? <TrendingUp className="w-3 h-3 text-[hsl(var(--success))]" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
          <span className={`text-xs font-display font-medium ${positive ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
            {positive ? '+' : ''}{typeof change === 'number' ? formatK(change) : change}
          </span>
          {changeLabel && <span className="text-xs text-muted-foreground">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${className}`}>
      <h3 className="font-display text-xs font-semibold tracking-[0.15em] text-muted-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

const chartTooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  labelStyle: { color: 'hsl(var(--foreground))' },
};

const TIME_RANGES = ['1D','7D','1M','3M','6M','1Y','YTD'] as const;
type TimeRange = typeof TIME_RANGES[number];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, avgOrder: 0, products: 0 });
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>('1M');

  useEffect(() => {
    async function fetchStats() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const uid = session.user.id;
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact' }).eq('merchant_id', uid),
        supabase.from('orders').select('total').eq('merchant_id', uid),
      ]);
      const productCount = productsRes.count || 0;
      const orders = (ordersRes.data || []) as { total: number }[];
      const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
      const avgOrder = orders.length > 0 ? totalRevenue / orders.length : 0;
      setStats({ orders: orders.length, revenue: totalRevenue, avgOrder, products: productCount });
      setLoading(false);
    }
    fetchStats();
  }, []);

  // Use real data if available, otherwise derive from mock orders
  const mockStats = getMockOrderStats();
  const totalSales = stats.revenue > 0 ? stats.revenue : mockStats.totalRevenue;
  const totalOrders = stats.orders > 0 ? stats.orders : mockStats.totalOrders;
  const totalProducts = stats.products > 0 ? stats.products : 20;
  const avgOrderVal = stats.revenue > 0 ? (totalSales / totalOrders) : mockStats.avgOrderValue;
  const netProfit = totalSales * 0.59;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center bg-secondary rounded-lg p-0.5 gap-0.5">
          {TIME_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-[11px] font-display font-medium tracking-wide rounded-md transition-colors ${
                range === r
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="TOTAL SALES" value={loading ? '—' : formatK(totalSales)} icon={DollarSign} change={4820} changeLabel="vs last week" />
        <StatCard label="ORDERS" value={loading ? '—' : String(totalOrders)} icon={ShoppingCart} change={23} changeLabel="vs last week" />
        <StatCard label="NET PROFIT" value={loading ? '—' : formatK(netProfit)} icon={TrendingUp} change={8200} changeLabel="vs last month" />
        <StatCard label="PRODUCTS" value={loading ? '—' : String(totalProducts)} icon={Package} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="SALES VOLUME">
          <div className="flex items-center gap-4 mb-2">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> this month
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" /> last month
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={salesVolumeData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={35} />
              <Tooltip {...chartTooltipStyle} />
              <Line type="monotone" dataKey="thisMonth" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="lastMonth" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} opacity={0.4} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ORDER VOLUME">
          <div className="flex items-center gap-4 mb-2">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> this month
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" /> last month
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={orderVolumeData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={25} />
              <Tooltip {...chartTooltipStyle} />
              <Line type="monotone" dataKey="thisMonth" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="lastMonth" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} opacity={0.4} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bottom row: channels, locations, P&L, referrers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Orders by channel */}
        <ChartCard title="ORDERS BY CHANNEL">
          <div className="space-y-3">
            {channelData.map(c => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{c.name}</span>
                  <span className="font-display font-medium">{c.value}</span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(c.value / 130) * 100}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Sales by location */}
        <ChartCard title="SALES BY LOCATION">
          <div className="space-y-3">
            {locationData.map(l => (
              <div key={l.region} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-muted-foreground/50" />
                  {l.region}
                </span>
                <span className="font-display font-medium">{formatK(l.amount)}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* P&L */}
        <ChartCard title="P&L STATEMENT">
          <div className="space-y-2">
            {plData.map(p => (
              <div key={p.label} className={`flex justify-between text-sm ${p.label === 'Total Costs' ? 'border-t border-border pt-2 mt-2 font-display font-semibold' : ''}`}>
                <span className="text-muted-foreground">{p.label}</span>
                <span className={p.amount < 0 && p.label !== 'Total Costs' ? 'text-destructive' : ''}>
                  {p.amount < 0 ? '-' : ''}{formatK(Math.abs(p.amount))}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Sales by referrer */}
        <ChartCard title="SALES BY REFERRER">
          <div className="space-y-3">
            {referrerData.map(r => (
              <div key={r.source} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 truncate max-w-[60%]">
                  <Globe className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                  <span className="truncate">{r.source}</span>
                </span>
                <span className="font-display font-medium">{formatK(r.amount)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Avg order + Net profit margin row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="AVG ORDER VALUE" value={loading ? '—' : `$${avgOrderVal.toFixed(0)}`} icon={BarChart3} change={12} changeLabel="vs last week" />
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[10px] font-display tracking-[0.2em] text-muted-foreground mb-1">NET PROFIT MARGIN</p>
          <p className="font-display text-4xl font-bold">59<span className="text-xl">%</span></p>
          <div className="flex items-center gap-1.5 mt-2">
            <TrendingUp className="w-3 h-3 text-[hsl(var(--success))]" />
            <span className="text-xs font-display font-medium text-[hsl(var(--success))]">+2%</span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        </div>
      </div>
    </div>
  );
}
