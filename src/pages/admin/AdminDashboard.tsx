import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign, BarChart3, MapPin, Globe, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Demo chart data
const salesVolumeData = MONTHS.map((m, i) => ({
  name: m,
  thisMonth: Math.round(400 + Math.random() * 1600),
  lastMonth: Math.round(300 + Math.random() * 1400),
}));

const orderVolumeData = MONTHS.map((m) => ({
  name: m,
  thisMonth: Math.round(10 + Math.random() * 50),
  lastMonth: Math.round(8 + Math.random() * 40),
}));

const channelData = [
  { name: 'Direct', value: 123, color: 'hsl(var(--primary))' },
  { name: 'Social', value: 102, color: 'hsl(var(--success))' },
  { name: 'Referral', value: 99, color: 'hsl(var(--warning))' },
];

const locationData = [
  { region: 'United States', amount: 15100 },
  { region: 'Canada', amount: 3600 },
  { region: 'United Kingdom', amount: 2100 },
  { region: 'Germany', amount: 890 },
];

const referrerData = [
  { source: 'Direct / None', amount: 15300 },
  { source: 'instagram.com', amount: 1124 },
  { source: 'tiktok.com', amount: 958 },
  { source: 'google.com', amount: 546 },
];

const plData = [
  { label: 'Gross Sales', amount: 22000 },
  { label: 'Discounts', amount: -1200 },
  { label: 'Refunds', amount: -580 },
  { label: 'Shipping Costs', amount: -1140 },
  { label: 'Processing Fees', amount: -441 },
  { label: 'Total Costs', amount: -3361 },
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

export default function AdminDashboard() {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, avgOrder: 0, products: 0 });
  const [loading, setLoading] = useState(true);

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

  const netProfit = stats.revenue * 0.59;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold">Dashboard</h1>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="TOTAL SALES" value={loading ? '—' : formatK(stats.revenue)} icon={DollarSign} change={229} changeLabel="vs last week" />
        <StatCard label="ORDERS" value={loading ? '—' : String(stats.orders)} icon={ShoppingCart} change={8} changeLabel="vs last week" />
        <StatCard label="NET PROFIT" value={loading ? '—' : formatK(netProfit)} icon={TrendingUp} change={2020} changeLabel="vs last month" />
        <StatCard label="PRODUCTS" value={loading ? '—' : String(stats.products)} icon={Package} />
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
        <StatCard label="AVG ORDER VALUE" value={loading ? '—' : `$${stats.avgOrder.toFixed(0)}`} icon={BarChart3} />
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
