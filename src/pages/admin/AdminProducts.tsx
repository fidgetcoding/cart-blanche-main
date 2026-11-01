import { useState, useEffect } from 'react';
import { supabase } from '@/lib/demo/client';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, EyeOff, Archive } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Product {
  id: string;
  title: string;
  price: number;
  compare_at_price: number | null;
  category: string;
  status: string;
  images: string[];
  created_at: string;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formComparePrice, setFormComparePrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('draft');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('merchant_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) setProducts(data as Product[]);
    setLoading(false);
  }

  function openCreate() {
    setEditProduct(null);
    setFormTitle('');
    setFormPrice('');
    setFormComparePrice('');
    setFormCategory('');
    setFormDescription('');
    setFormStatus('draft');
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    setFormTitle(p.title);
    setFormPrice(String(p.price));
    setFormComparePrice(p.compare_at_price ? String(p.compare_at_price) : '');
    setFormCategory(p.category);
    setFormStatus(p.status);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = {
      merchant_id: session.user.id,
      title: formTitle,
      price: parseFloat(formPrice),
      compare_at_price: formComparePrice ? parseFloat(formComparePrice) : null,
      category: formCategory,
      description: formDescription,
      status: formStatus,
    };

    if (editProduct) {
      await supabase.from('products').update(payload).eq('id', editProduct.id);
    } else {
      await supabase.from('products').insert(payload);
    }

    setSaving(false);
    setShowForm(false);
    fetchProducts();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  }

  async function handleStatusChange(id: string, newStatus: string) {
    await supabase.from('products').update({ status: newStatus }).eq('id', id);
    fetchProducts();
  }

  const filtered = products.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-success/20 text-success',
    draft: 'bg-muted text-muted-foreground',
    archived: 'bg-secondary text-text-dim',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <button onClick={openCreate}
          className="px-4 py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
          <Plus className="w-4 h-4" /> ADD PRODUCT
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 liquid-glass rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Product form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-8" onClick={() => setShowForm(false)}>
          <div className="liquid-glass rounded-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-lg font-bold">{editProduct ? 'Edit Product' : 'New Product'}</h2>

            <div>
              <label className="text-xs font-display tracking-widest text-muted-foreground">TITLE</label>
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">PRICE</label>
                <input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">COMPARE AT PRICE</label>
                <input type="number" value={formComparePrice} onChange={e => setFormComparePrice(e.target.value)}
                  placeholder="Optional" className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            <div>
              <label className="text-xs font-display tracking-widest text-muted-foreground">CATEGORY</label>
              <input value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="e.g. outerwear"
                className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div>
              <label className="text-xs font-display tracking-widest text-muted-foreground">DESCRIPTION</label>
              <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3}
                className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>

            <div>
              <label className="text-xs font-display tracking-widest text-muted-foreground">STATUS</label>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className={`text-xs font-display ${formStatus === 'active' ? 'text-success' : 'text-muted-foreground/60'}`}>
                  {formStatus === 'active' ? 'Visible on storefront' : 'Hidden from storefront'}
                </span>
                <Switch
                  checked={formStatus === 'active'}
                  onCheckedChange={(checked) => setFormStatus(checked ? 'active' : 'draft')}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving || !formTitle || !formPrice}
                className="flex-1 py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? 'SAVING...' : editProduct ? 'UPDATE' : 'CREATE'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-6 py-2.5 border border-border rounded-lg text-sm hover:bg-secondary transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products table */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground font-display tracking-wider animate-pulse">LOADING...</div>
      ) : filtered.length === 0 ? (
        <div className="liquid-glass rounded-xl p-12 text-center">
          <p className="text-muted-foreground font-display tracking-wider text-sm mb-4">
            {products.length === 0 ? 'No products yet — add your first product to get started' : 'No products match your filters'}
          </p>
          {products.length === 0 && (
            <button onClick={openCreate}
              className="px-4 py-2 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-lg hover:opacity-90">
              ADD FIRST PRODUCT
            </button>
          )}
        </div>
      ) : (
        <div className="liquid-glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">PRODUCT</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">CATEGORY</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">PRICE</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">STATUS</th>
                <th className="text-right px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center text-[8px] font-display text-muted-foreground">IMG</div>
                      <span className="font-display text-sm font-medium">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{p.category || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-display text-sm">${p.price}</span>
                    {p.compare_at_price && (
                      <span className="text-xs text-muted-foreground line-through ml-2">${p.compare_at_price}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-display px-2 py-1 rounded ${STATUS_COLORS[p.status] || ''}`}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center gap-1.5" title={p.status === 'active' ? 'Visible on storefront' : 'Hidden from storefront'}>
                        <span className={`text-[10px] font-display ${p.status === 'active' ? 'text-success' : 'text-muted-foreground/50'}`}>
                          {p.status === 'active' ? 'LIVE' : 'DRAFT'}
                        </span>
                        <Switch
                          checked={p.status === 'active'}
                          onCheckedChange={() => handleStatusChange(p.id, p.status === 'active' ? 'draft' : 'active')}
                        />
                      </div>
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-secondary rounded transition-colors" title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-destructive/20 rounded transition-colors text-destructive" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
