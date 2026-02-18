import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, ShoppingCart, Package, Users } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, avgOrder: 0, products: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
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

  const cards = [
    { label: 'TOTAL ORDERS', value: stats.orders, icon: ShoppingCart, format: (v: number) => String(v) },
    { label: 'REVENUE', value: stats.revenue, icon: TrendingUp, format: (v: number) => `$${v.toLocaleString()}` },
    { label: 'AVG ORDER', value: stats.avgOrder, icon: TrendingUp, format: (v: number) => `$${v.toFixed(0)}` },
    { label: 'PRODUCTS', value: stats.products, icon: Package, format: (v: number) => String(v) },
  ];

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="liquid-glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-display tracking-widest text-muted-foreground whitespace-nowrap">{c.label}</p>
              <c.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="font-display text-3xl font-bold">
              {loading ? '—' : c.format(c.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="liquid-glass rounded-xl p-6 min-h-[160px] flex flex-col">
          <h3 className="font-display text-xs font-semibold tracking-[0.15em] text-muted-foreground mb-auto">RECENT ORDERS</h3>
          <p className="text-sm text-muted-foreground/60 mt-6">No orders yet</p>
        </div>
        <div className="liquid-glass rounded-xl p-6 min-h-[160px] flex flex-col">
          <h3 className="font-display text-xs font-semibold tracking-[0.15em] text-muted-foreground mb-auto">TOP PRODUCTS</h3>
          <p className="text-sm text-muted-foreground/60 mt-6">No sales data yet</p>
        </div>
      </div>
    </div>
  );
}
