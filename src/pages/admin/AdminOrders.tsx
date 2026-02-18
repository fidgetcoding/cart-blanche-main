import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, Truck, Package, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string | null;
  items: any;
  subtotal: number;
  total: number;
  status: string;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  fulfilled: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/20 text-warning',
  fulfilled: 'bg-accent/20 text-accent',
  shipped: 'bg-primary/20 text-primary',
  delivered: 'bg-success/20 text-success',
  cancelled: 'bg-destructive/20 text-destructive',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('orders').select('*')
      .eq('merchant_id', session.user.id).order('created_at', { ascending: false });
    if (data) setOrders(data as Order[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders();
    if (selectedOrder?.id === id) setSelectedOrder({ ...selectedOrder, status });
  }

  const filtered = orders.filter(o => statusFilter === 'all' || o.status === statusFilter);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground font-display tracking-wider animate-pulse">LOADING...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground font-display tracking-wider text-sm">
            {orders.length === 0 ? 'No orders yet — orders will appear here when customers checkout' : 'No orders match this filter'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">ORDER</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">DATE</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">CUSTOMER</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">TOTAL</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">STATUS</th>
                <th className="text-right px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const Icon = STATUS_ICONS[o.status] || Clock;
                return (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(o)}>
                    <td className="px-4 py-3 font-display text-sm font-medium">{o.order_number}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{o.customer_email}</td>
                    <td className="px-4 py-3 font-display text-sm">${o.total}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-display px-2 py-1 rounded inline-flex items-center gap-1 ${STATUS_COLORS[o.status]}`}>
                        <Icon className="w-3 h-3" /> {o.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select value={o.status} onChange={e => { e.stopPropagation(); updateStatus(o.id, e.target.value); }}
                        onClick={e => e.stopPropagation()}
                        className="px-2 py-1 bg-secondary border border-border rounded text-xs focus:outline-none">
                        <option value="pending">Pending</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
