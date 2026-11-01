import { useEffect, useState, useMemo } from 'react';
import { isDemoMode } from '@/lib/demo/client';
import { getDashboardDataForRange } from '@/data/mock-orders';
import { type LucideIcon, TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign, BarChart3, MapPin, Globe } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function formatK(n: number) {
  if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + n.toLocaleString();
}

function StatCard({ label, value, icon: Icon, change, changeLabel }: {
  label: string; value: string; icon: LucideIcon; change?: number; changeLabel?: string;
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
  const [range, setRange] = useState<TimeRange>('1M');
  // These figures are generated, not read from a store, so a signed-in merchant
  // needs telling. In the demo the header already says so.
  const [isRealStore, setIsRealStore] = useState(false);
  useEffect(() => {
    isDemoMode().then(demo => setIsRealStore(!demo));
  }, []);
  const data = useMemo(() => getDashboardDataForRange(range), [range]);

  const prevLabel = range === '1D' ? 'vs yesterday' : range === '7D' ? 'vs last week' : 'vs prev period';

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          {isRealStore && (
            <p className="text-xs text-muted-foreground mt-1">Sample numbers. Real store stats aren't connected yet.</p>
          )}
        </div>
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
        <StatCard label="TOTAL SALES" value={formatK(data.totalSales)} icon={DollarSign} change={data.salesChange} changeLabel={prevLabel} />
        <StatCard label="ORDERS" value={String(data.totalOrders)} icon={ShoppingCart} change={data.ordersChange} changeLabel={prevLabel} />
        <StatCard label="NET PROFIT" value={formatK(data.netProfit)} icon={TrendingUp} change={data.profitChange} changeLabel={prevLabel} />
        <StatCard label="AVG ORDER" value={`$${data.avgOrderValue}`} icon={BarChart3} change={data.avgChange} changeLabel={prevLabel} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="SALES VOLUME">
          <div className="flex items-center gap-4 mb-2">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> current
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" /> previous
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.salesChartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip {...chartTooltipStyle} />
              <Line type="monotone" dataKey="current" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="previous" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} opacity={0.4} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ORDER VOLUME">
          <div className="flex items-center gap-4 mb-2">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> current
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" /> previous
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.orderChartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={25} />
              <Tooltip {...chartTooltipStyle} />
              <Line type="monotone" dataKey="current" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="previous" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} opacity={0.4} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ChartCard title="ORDERS BY CHANNEL">
          <div className="space-y-3">
            {data.channelData.map(c => {
              const max = Math.max(...data.channelData.map(x => x.value), 1);
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{c.name}</span>
                    <span className="font-display font-medium">{c.value}</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(c.value / max) * 100}%`, background: c.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="SALES BY LOCATION">
          <div className="space-y-3">
            {data.locationData.map(l => (
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

        <ChartCard title="P&L STATEMENT">
          <div className="space-y-2">
            {data.plData.map(p => (
              <div key={p.label} className={`flex justify-between text-sm ${p.label === 'Total Costs' ? 'border-t border-border pt-2 mt-2 font-display font-semibold' : ''}`}>
                <span className="text-muted-foreground">{p.label}</span>
                <span className={p.amount < 0 && p.label !== 'Total Costs' ? 'text-destructive' : ''}>
                  {p.amount < 0 ? '-' : ''}{formatK(Math.abs(p.amount))}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="SALES BY REFERRER">
          <div className="space-y-3">
            {data.referrerData.map(r => (
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

      {/* Net profit margin */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="PRODUCTS" value="20" icon={Package} />
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[10px] font-display tracking-[0.2em] text-muted-foreground mb-1">NET PROFIT MARGIN</p>
          <p className="font-display text-4xl font-bold">{data.netProfitMargin}<span className="text-xl">%</span></p>
          <div className="flex items-center gap-1.5 mt-2">
            <TrendingUp className="w-3 h-3 text-[hsl(var(--success))]" />
            <span className="text-xs font-display font-medium text-[hsl(var(--success))]">consistent</span>
            <span className="text-xs text-muted-foreground">{prevLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}