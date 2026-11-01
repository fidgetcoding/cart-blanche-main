import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/demo/client';
import { generateMockOrders } from '@/data/mock-orders';
import {
  Search, ChevronDown, Truck, Package, CheckCircle, XCircle, Clock,
  ArrowLeft, MoreHorizontal, MapPin, FileText, Printer, Eye,
  ChevronLeft, ChevronRight, Download,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface OrderItem {
  title?: string;
  name?: string;
  variant?: string;
  variantTitle?: string;
  sku?: string;
  image?: string;
  price?: number;
  qty?: number;
  quantity?: number;
}

interface ShippingAddress {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  postal_code?: string;
  country?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string | null;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: string;
  tracking_number: string | null;
  shipping_address: ShippingAddress | null;
  notes: string | null;
  created_at: string;
}

type TabFilter = 'all' | 'open' | 'unfulfilled' | 'unpaid';

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]' },
  paid:      { label: 'Paid',      color: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' },
  refunded:  { label: 'Refunded',  color: 'bg-muted text-muted-foreground' },
  partially_refunded: { label: 'Partially Refunded', color: 'bg-muted text-muted-foreground' },
};

const FULFILLMENT_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Unfulfilled', color: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]' },
  fulfilled:  { label: 'Fulfilled',   color: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' },
  shipped:    { label: 'Shipped',     color: 'bg-primary/15 text-primary' },
  delivered:  { label: 'Delivered',   color: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' },
  cancelled:  { label: 'Cancelled',  color: 'bg-destructive/15 text-destructive' },
};

function getPaymentStatus(order: Order) {
  // Derive payment status from order status for now
  if (order.status === 'cancelled') return 'refunded';
  if (order.status === 'pending') return 'pending';
  return 'paid';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Order Detail View ───────────────────────────────────────────
function OrderDetail({ order, onBack, onUpdateStatus }: {
  order: Order;
  onBack: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const payment = getPaymentStatus(order);
  const paymentInfo = PAYMENT_LABELS[payment] || PAYMENT_LABELS.pending;
  const fulfillInfo = FULFILLMENT_LABELS[order.status] || FULFILLMENT_LABELS.pending;
  const items = Array.isArray(order.items) ? order.items : [];
  const addr = order.shipping_address || {};

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 md:p-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button onClick={onBack} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-display text-xl font-bold">#{order.order_number}</h2>
        <span className={`text-[10px] font-display font-semibold tracking-wider px-2 py-0.5 rounded-full ${paymentInfo.color}`}>
          {paymentInfo.label}
        </span>
        <span className={`text-[10px] font-display font-semibold tracking-wider px-2 py-0.5 rounded-full ${fulfillInfo.color}`}>
          {fulfillInfo.label}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="px-3 py-1.5 text-xs font-display tracking-wider border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-1.5"
            >
              More actions <ChevronDown className="w-3 h-3" />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 animate-in fade-in-0 zoom-in-95">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors">
                  <FileText className="w-4 h-4 text-muted-foreground" /> Print order page
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors">
                  <Printer className="w-4 h-4 text-muted-foreground" /> Print packing slips
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors">
                  <Eye className="w-4 h-4 text-muted-foreground" /> View order status page
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-destructive">
                  <XCircle className="w-4 h-4" /> Cancel order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground ml-10 mb-6">{formatDate(order.created_at)}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — fulfillment + payment */}
        <div className="lg:col-span-2 space-y-5">
          {/* Fulfillment card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${order.status === 'fulfilled' || order.status === 'delivered' ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--warning))]'}`} />
              <span className="font-display text-sm font-semibold">{fulfillInfo.label} ({items.length})</span>
            </div>

            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-secondary" />
                    ) : (
                      <div className="w-10 h-10 bg-secondary/50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title || item.name || 'Item'}</p>
                      <p className="text-xs text-muted-foreground">{item.variantTitle || item.variant || ''}{item.sku ? ` · SKU: ${item.sku}` : ''}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(item.price || 0)} × {item.quantity || item.qty || 1}
                    </span>
                    <span className="text-sm font-display font-medium w-20 text-right">
                      {formatCurrency((item.price || 0) * (item.quantity || item.qty || 1))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No line items</p>
            )}

            <div className="mt-5 flex justify-end">
              <select
                value={order.status}
                onChange={e => onUpdateStatus(order.id, e.target.value)}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-display font-semibold tracking-wider rounded-lg cursor-pointer focus:outline-none"
              >
                <option value="pending">Mark Pending</option>
                <option value="fulfilled">Fulfill Items</option>
                <option value="shipped">Mark Shipped</option>
                <option value="delivered">Mark Delivered</option>
                <option value="cancelled">Cancel</option>
              </select>
            </div>
          </div>

          {/* Payment card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" />
              <span className="font-display text-sm font-semibold">{paymentInfo.label}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-muted-foreground">Standard</span>
                <span>$0.00</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-display font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs pt-1">
                <span>Paid by customer</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — notes + customer + shipping */}
        <div className="space-y-5">
          {/* Notes */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold mb-2">Notes</h3>
            <p className="text-sm text-muted-foreground">{order.notes || 'No notes from customer.'}</p>
          </div>

          {/* Customer */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold mb-3">Customer</h3>
            <p className="text-sm text-primary hover:underline cursor-pointer">
              {order.customer_name || order.customer_email}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{order.customer_email}</p>
          </div>

          {/* Shipping address */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold mb-3">Shipping address</h3>
            {addr.line1 || addr.city ? (
              <div className="text-sm text-muted-foreground space-y-0.5">
                {addr.name && <p>{addr.name}</p>}
                {addr.line1 && <p>{addr.line1}</p>}
                {addr.line2 && <p>{addr.line2}</p>}
                <p>{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</p>
                {addr.country && <p>{addr.country}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No shipping address provided.</p>
            )}
            {order.tracking_number && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] font-display tracking-widest text-muted-foreground mb-1">TRACKING</p>
                <p className="text-sm font-mono">{order.tracking_number}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Orders List ─────────────────────────────────────────────────
export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setOrders(generateMockOrders(100));
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('orders').select('*')
      .eq('merchant_id', session.user.id).order('created_at', { ascending: false });
    // A real store with no orders yet gets the empty state, not made-up orders.
    setOrders((data ?? []) as unknown as Order[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders();
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null);
  }

  const filtered = useMemo(() => {
    let list = orders;
    if (tab === 'open') list = list.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
    if (tab === 'unfulfilled') list = list.filter(o => o.status === 'pending');
    if (tab === 'unpaid') list = list.filter(o => getPaymentStatus(o) === 'pending');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, tab, search]);

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(o => o.id)));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'unfulfilled', label: 'Unfulfilled' },
    { key: 'unpaid', label: 'Unpaid' },
  ];

  // ─── Detail view ──────────────────────────────────────────────
  if (selectedOrder) {
    return (
      <AnimatePresence mode="wait">
        <OrderDetail
          key={selectedOrder.id}
          order={selectedOrder}
          onBack={() => setSelectedOrder(null)}
          onUpdateStatus={updateStatus}
        />
      </AnimatePresence>
    );
  }

  // ─── List view ────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Orders</h1>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {/* Tabs + search card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Tab strip */}
        <div className="border-b border-border">
          <div className="flex items-center gap-0 px-4">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative px-4 py-3 text-sm font-display tracking-wide transition-colors ${
                  tab === t.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'
                }`}
              >
                {t.label}
                {tab === t.key && (
                  <motion.div
                    layoutId="orders-tab-indicator"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search orders"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-20 text-muted-foreground font-display tracking-wider animate-pulse text-sm">
            LOADING...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground font-display tracking-wider text-sm">
              {orders.length === 0
                ? 'No orders yet — orders will appear here when customers checkout'
                : 'No orders match this filter'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-border accent-primary cursor-pointer"
                  />
                </th>
                <th className="text-left px-3 py-3 text-xs font-display tracking-widest text-muted-foreground font-medium">ORDER</th>
                <th className="text-left px-3 py-3 text-xs font-display tracking-widest text-muted-foreground font-medium">ITEMS</th>
                <th className="text-left px-3 py-3 text-xs font-display tracking-widest text-muted-foreground font-medium">DATE</th>
                <th className="text-left px-3 py-3 text-xs font-display tracking-widest text-muted-foreground font-medium">CUSTOMER</th>
                <th className="text-left px-3 py-3 text-xs font-display tracking-widest text-muted-foreground font-medium">PAYMENT</th>
                <th className="text-left px-3 py-3 text-xs font-display tracking-widest text-muted-foreground font-medium">FULFILLMENT</th>
                <th className="text-right px-4 py-3 text-xs font-display tracking-widest text-muted-foreground font-medium">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const payment = getPaymentStatus(o);
                const payInfo = PAYMENT_LABELS[payment] || PAYMENT_LABELS.pending;
                const fulfInfo = FULFILLMENT_LABELS[o.status] || FULFILLMENT_LABELS.pending;
                return (
                  <tr
                    key={o.id}
                    className="border-b border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer group"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <td className="w-10 px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggleOne(o.id)}
                        className="w-3.5 h-3.5 rounded border-border accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm font-display font-medium text-primary group-hover:underline">
                        #{o.order_number}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center -space-x-1.5">
                        {(Array.isArray(o.items) ? o.items : []).slice(0, 3).map((item, idx) => (
                          item.image ? (
                            <img key={idx} src={item.image} alt="" className="w-7 h-7 rounded-md object-cover border-2 border-card" />
                          ) : (
                            <div key={idx} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center border-2 border-card">
                              <Package className="w-3 h-3 text-muted-foreground/40" />
                            </div>
                          )
                        ))}
                        {Array.isArray(o.items) && o.items.length > 3 && (
                          <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center border-2 border-card text-[9px] font-display font-medium text-muted-foreground">
                            +{o.items.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{formatDate(o.created_at)}</td>
                    <td className="px-3 py-3 text-sm">
                      {o.customer_name || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-display font-semibold tracking-wider px-2 py-0.5 rounded-full ${payInfo.color}`}>
                        {payInfo.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-display font-semibold tracking-wider px-2 py-0.5 rounded-full ${fulfInfo.color}`}>
                        {fulfInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-display text-sm font-medium">
                      {formatCurrency(o.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
