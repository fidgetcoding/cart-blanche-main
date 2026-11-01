import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Mail, ArrowUpDown } from 'lucide-react';
import { useProductWaitlist } from '@/hooks/use-product-waitlist';
import { useGridLayout } from '@/hooks/use-grid-layout';
import { supabase } from '@/lib/demo/client';
import { WaitlistTable } from '@/components/admin/WaitlistTable';

type StatusTab = 'all' | 'pending' | 'fulfilled' | 'cancelled';
type SortDir = 'desc' | 'asc';

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'fulfilled', label: 'Fulfilled' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function AdminWaitlist() {
  const { signups, markFulfilled, deleteSignup, loading } = useProductWaitlist();
  const { getAllProductsUnfiltered } = useGridLayout();

  const [tab, setTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortDir>('desc');

  // The catalogue only has what's on sale, but a signup can be for a product that's
  // since been hidden or archived.
  const [offSaleTitles, setOffSaleTitles] = useState<Record<string, string>>({});
  const signupProductIds = useMemo(() => [...new Set(signups.map(s => s.product_id))], [signups]);
  useEffect(() => {
    if (signupProductIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('products').select('id, title').in('id', signupProductIds);
      if (!cancelled && data) setOffSaleTitles(Object.fromEntries(data.map(p => [p.id, p.title])));
    })();
    return () => {
      cancelled = true;
    };
  }, [signupProductIds]);

  const allProducts = getAllProductsUnfiltered();
  const productTitleById = useMemo(() => {
    const map: Record<string, string> = { ...offSaleTitles };
    for (const p of allProducts) map[p.id] = p.title;
    for (const id of signupProductIds) map[id] ??= 'Deleted product';
    return map;
  }, [allProducts, offSaleTitles, signupProductIds]);

  const productsWithSignups = useMemo(() => {
    const ids = new Set(signups.map(s => s.product_id));
    return Array.from(ids).map(id => ({ id, title: productTitleById[id] || id }));
  }, [signups, productTitleById]);

  const filtered = useMemo(() => {
    let result = signups;
    if (tab !== 'all') result = result.filter(s => s.status === tab);
    if (productFilter !== 'all') result = result.filter(s => s.product_id === productFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(s =>
        s.email.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return sort === 'desc' ? bt - at : at - bt;
    });
    return result;
  }, [signups, tab, productFilter, search, sort]);

  const counts = useMemo(() => ({
    all: signups.length,
    pending: signups.filter(s => s.status === 'pending').length,
    fulfilled: signups.filter(s => s.status === 'fulfilled').length,
    cancelled: signups.filter(s => s.status === 'cancelled').length,
  }), [signups]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display tracking-wide text-foreground">Waitlist</h1>
          <p className="text-xs text-muted-foreground mt-1 font-display tracking-wide">
            {signups.length} total {signups.length === 1 ? 'signup' : 'signups'} across {productsWithSignups.length} {productsWithSignups.length === 1 ? 'product' : 'products'}
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="border border-border/50 rounded-lg bg-card/40">
        {/* Tabs */}
        <div className="border-b border-border/50 px-4">
          <div className="flex items-center gap-1">
            {STATUS_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative px-4 py-3 text-sm font-display tracking-wide transition-colors ${
                  tab === t.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'
                }`}
              >
                {t.label}
                <span className="ml-2 text-[10px] tracking-widest text-muted-foreground/70">
                  {counts[t.key]}
                </span>
                {tab === t.key && (
                  <motion.div
                    layoutId="waitlist-tab-indicator"
                    className="absolute left-0 right-0 -bottom-px h-px bg-foreground"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/50">
          <div className="flex items-center gap-2 flex-1 min-w-[220px] px-3 py-1.5 bg-background/40 border border-border/50 rounded-md">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email or name"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="text-xs font-display tracking-wide px-3 py-1.5 bg-background/40 border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All products</option>
            {productsWithSignups.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>

          <button
            onClick={() => setSort(s => s === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 text-xs font-display tracking-wide px-3 py-1.5 bg-background/40 border border-border/50 rounded-md hover:bg-secondary transition-colors"
            title={sort === 'desc' ? 'Newest first' : 'Oldest first'}
          >
            <ArrowUpDown className="w-3 h-3" />
            {sort === 'desc' ? 'Newest' : 'Oldest'}
          </button>
        </div>

        {/* Body */}
        <div className="p-3">
          {loading ? (
            <p className="text-xs text-muted-foreground font-display tracking-widest text-center py-10">Loading signups...</p>
          ) : signups.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
              <Mail className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-foreground font-display tracking-wide">No waitlist signups yet.</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                When shoppers sign up for out-of-stock products, they'll appear here.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground font-display tracking-widest text-center py-10">No signups match your filters.</p>
          ) : (
            <WaitlistTable
              signups={filtered}
              onMarkFulfilled={markFulfilled}
              onDelete={deleteSignup}
              showProductColumn
              productTitleById={productTitleById}
            />
          )}
        </div>
      </div>
    </div>
  );
}
