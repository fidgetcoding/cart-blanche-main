import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Check, X, Plus, Search, ChevronDown, ChevronRight, Tag } from 'lucide-react';
import { DEMO_PRODUCTS, type DemoProduct } from '@/data/demo-data';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductRow {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number;
  category: string;
  images: string[];
  description: string;
  tags: string[];
  variants: {
    id: string;
    title: string;
    inventory_count: number;
    sku: string | null;
  }[];
  totalStock: number;
  isDemo: boolean;
}

function buildProductRows(): ProductRow[] {
  return DEMO_PRODUCTS.map(p => ({
    id: p.id,
    title: p.title,
    price: p.price,
    compare_at_price: p.compare_at_price,
    category: p.category,
    images: p.images,
    description: p.description,
    tags: [p.category],
    variants: p.variants.map(v => ({
      id: v.id,
      title: v.title,
      inventory_count: v.inventory_count,
      sku: null,
    })),
    totalStock: p.variants.reduce((sum, v) => sum + v.inventory_count, 0),
    isDemo: true,
  }));
}

const CATEGORY_COLORS: Record<string, string> = {
  outerwear: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  streetwear: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  essentials: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  'new-arrivals': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

function getTagColor(tag: string) {
  return CATEGORY_COLORS[tag] || 'bg-primary/10 text-primary border-primary/20';
}

export default function AdminInventory() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [editForm, setEditForm] = useState({ title: '', price: '', description: '', category: '' });
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVariantValue, setEditVariantValue] = useState('');
  const [newTag, setNewTag] = useState('');
  const [addingTagForId, setAddingTagForId] = useState<string | null>(null);
  const lowStockThreshold = 5;

  useEffect(() => { fetchInventory(); }, []);

  async function fetchInventory() {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const { data: dbProducts } = await supabase.from('products').select('*')
        .eq('merchant_id', session.user.id);

      if (dbProducts && dbProducts.length > 0) {
        const productIds = dbProducts.map(p => p.id);
        const { data: variants } = await supabase.from('product_variants').select('*')
          .in('product_id', productIds);

        const variantMap = new Map<string, typeof variants>();
        variants?.forEach(v => {
          const list = variantMap.get(v.product_id) || [];
          list.push(v);
          variantMap.set(v.product_id, list);
        });

        setProducts(dbProducts.map(p => {
          const pvs = variantMap.get(p.id) || [];
          return {
            id: p.id,
            title: p.title,
            price: p.price,
            compare_at_price: p.compare_at_price ?? undefined,
            category: p.category || '',
            images: p.images || [],
            description: p.description || '',
            tags: p.tags || [p.category || ''].filter(Boolean),
            variants: pvs.map(v => ({
              id: v.id,
              title: v.title,
              inventory_count: v.inventory_count ?? 0,
              sku: v.sku,
            })),
            totalStock: pvs.reduce((sum, v) => sum + (v.inventory_count ?? 0), 0),
            isDemo: false,
          };
        }));
        setLoading(false);
        return;
      }
    }

    setProducts(buildProductRows());
    setLoading(false);
  }

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(p => {
      if (p.category) tags.add(p.category);
      p.tags?.forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (activeFilter !== 'all') {
        if (p.category !== activeFilter && !p.tags?.includes(activeFilter)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, activeFilter, search]);

  const totalItems = filtered.length;
  const lowStockProducts = filtered.filter(p => {
    const avgPerVariant = p.variants.length > 0 ? p.totalStock / p.variants.length : 0;
    return avgPerVariant > 0 && avgPerVariant <= lowStockThreshold;
  }).length;
  const outOfStockProducts = filtered.filter(p => p.totalStock === 0).length;

  function openEditPanel(p: ProductRow) {
    setEditingProduct(p);
    setEditForm({ title: p.title, price: String(p.price), description: p.description, category: p.category });
  }

  async function saveProductEdit() {
    if (!editingProduct) return;
    
    // Update local state
    setProducts(prev => prev.map(p =>
      p.id === editingProduct.id
        ? { ...p, title: editForm.title, price: parseFloat(editForm.price) || p.price, description: editForm.description, category: editForm.category, variants: editingProduct.variants, totalStock: editingProduct.variants.reduce((s, v) => s + v.inventory_count, 0) }
        : p
    ));

    // Persist to DB for non-demo products
    if (!editingProduct.isDemo) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('products').update({
          title: editForm.title,
          price: parseFloat(editForm.price) || editingProduct.price,
          description: editForm.description,
          category: editForm.category,
        }).eq('id', editingProduct.id);

        // Update variants
        for (const v of editingProduct.variants) {
          if (v.id.startsWith('new-')) {
            await supabase.from('product_variants').insert({
              product_id: editingProduct.id,
              title: v.title,
              inventory_count: v.inventory_count,
            });
          } else {
            await supabase.from('product_variants').update({
              title: v.title,
              inventory_count: v.inventory_count,
            }).eq('id', v.id);
          }
        }
      }
    }

    setEditingProduct(null);
  }

  function saveVariantStock(productId: string, variantId: string) {
    const count = parseInt(editVariantValue);
    if (isNaN(count) || count < 0) return;
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const variants = p.variants.map(v => v.id === variantId ? { ...v, inventory_count: count } : v);
      return { ...p, variants, totalStock: variants.reduce((s, v) => s + v.inventory_count, 0) };
    }));
    setEditingVariantId(null);
  }

  function addTagToProduct(productId: string, tag: string) {
    if (!tag.trim()) return;
    setProducts(prev => prev.map(p =>
      p.id === productId && !p.tags.includes(tag.trim().toLowerCase())
        ? { ...p, tags: [...p.tags, tag.trim().toLowerCase()] }
        : p
    ));
    setNewTag('');
    setAddingTagForId(null);
  }

  function removeTagFromProduct(productId: string, tag: string) {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, tags: p.tags.filter(t => t !== tag) } : p
    ));
  }

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Inventory</h1>
        <div className="flex gap-3">
          <span className="text-xs font-display px-3 py-1.5 bg-secondary rounded-lg text-muted-foreground">
            {totalItems} PRODUCTS
          </span>
          {lowStockProducts > 0 && (
            <span className="text-xs font-display px-3 py-1.5 bg-warning/20 text-warning rounded-lg flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> {lowStockProducts} LOW
            </span>
          )}
          {outOfStockProducts > 0 && (
            <span className="text-xs font-display px-3 py-1.5 bg-destructive/20 text-destructive rounded-lg">
              {outOfStockProducts} OUT
            </span>
          )}
        </div>
      </div>

      {/* Search + Category Tags */}
      <div className="space-y-3 mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 liquid-glass rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 text-xs font-display tracking-wider rounded-lg border transition-colors ${
              activeFilter === 'all' ? 'bg-foreground/10 text-foreground border-foreground/20' : 'bg-card text-muted-foreground border-border hover:bg-secondary'
            }`}>
            ALL
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveFilter(tag === activeFilter ? 'all' : tag)}
              className={`px-3 py-1.5 text-xs font-display tracking-wider rounded-lg border transition-colors ${
                activeFilter === tag ? getTagColor(tag) : 'bg-card text-muted-foreground border-border hover:bg-secondary'
              }`}>
              {tag.toUpperCase().replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground font-display tracking-wider animate-pulse">LOADING...</div>
      ) : filtered.length === 0 ? (
        <div className="liquid-glass rounded-xl p-12 text-center">
          <p className="text-muted-foreground font-display tracking-wider text-sm">No products match your criteria</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const avgStock = p.variants.length > 0 ? p.totalStock / p.variants.length : 0;
            const isLow = avgStock > 0 && avgStock <= lowStockThreshold;
            const isOut = p.totalStock === 0;
            const isExpanded = expandedId === p.id;

            return (
              <div key={p.id} className="liquid-glass rounded-xl overflow-hidden transition-colors">
                {/* Product row */}
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  {/* Expand chevron */}
                  <div className="text-muted-foreground">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>

                  {/* Thumbnail */}
                  <div className="w-12 h-12 bg-muted/40 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {p.images.length > 0 ? (
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-muted/60 rounded-md" />
                    )}
                  </div>

                  {/* Title + tags */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-medium truncate">{p.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {p.tags.map(tag => (
                        <span key={tag} className={`text-[10px] font-display px-1.5 py-0.5 rounded border ${getTagColor(tag)}`}>
                          {tag.toUpperCase().replace('-', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0 w-24">
                    <span className="font-display text-sm">${p.price}</span>
                    {p.compare_at_price && (
                      <span className="text-[10px] text-muted-foreground line-through ml-1.5">${p.compare_at_price}</span>
                    )}
                  </div>

                  {/* Total stock */}
                  <div className="flex-shrink-0 w-20 text-right">
                    <span className="font-display text-sm">{p.totalStock}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">units</span>
                  </div>

                  {/* Status badge */}
                  <div className="flex-shrink-0 w-24 text-right">
                    {isOut ? (
                      <span className="text-[10px] font-display px-2 py-1 rounded bg-destructive/20 text-destructive">OUT OF STOCK</span>
                    ) : isLow ? (
                      <span className="text-[10px] font-display px-2 py-1 rounded bg-warning/20 text-warning inline-flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> LOW
                      </span>
                    ) : (
                      <span className="text-[10px] font-display px-2 py-1 rounded bg-success/20 text-success">IN STOCK</span>
                    )}
                  </div>
                </div>

                {/* Expanded detail panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border px-6 py-5 space-y-5">
                        {/* Product info + edit */}
                        <div className="flex items-start justify-between gap-6">
                          <div className="space-y-1 flex-1">
                            <p className="text-xs text-muted-foreground font-display tracking-widest">DESCRIPTION</p>
                            <p className="text-sm text-foreground/70 leading-relaxed">{p.description}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditPanel(p); }}
                            className="px-4 py-2 text-xs font-display tracking-wider border border-border rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
                          >
                            EDIT PRODUCT
                          </button>
                        </div>

                        {/* Tags management */}
                        <div>
                          <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">TAGS</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {p.tags.map(tag => (
                              <span key={tag} className={`text-[10px] font-display px-2 py-1 rounded border inline-flex items-center gap-1.5 ${getTagColor(tag)}`}>
                                {tag.toUpperCase().replace('-', ' ')}
                                <button onClick={(e) => { e.stopPropagation(); removeTagFromProduct(p.id, tag); }} className="hover:opacity-70">
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                            {addingTagForId === p.id ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <input
                                  value={newTag}
                                  onChange={e => setNewTag(e.target.value)}
                                  placeholder="tag name"
                                  className="w-24 px-2 py-1 bg-secondary border border-border rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
                                  onKeyDown={e => { if (e.key === 'Enter') addTagToProduct(p.id, newTag); if (e.key === 'Escape') setAddingTagForId(null); }}
                                  autoFocus
                                />
                                <button onClick={() => addTagToProduct(p.id, newTag)} className="p-0.5 text-success hover:bg-success/20 rounded">
                                  <Check className="w-3 h-3" />
                                </button>
                                <button onClick={() => { setAddingTagForId(null); setNewTag(''); }} className="p-0.5 text-muted-foreground hover:bg-secondary rounded">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setAddingTagForId(p.id); setNewTag(''); }}
                                className="text-[10px] font-display px-2 py-1 rounded border border-dashed border-border text-muted-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1"
                              >
                                <Plus className="w-2.5 h-2.5" /> ADD TAG
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Variants / sizes */}
                        <div>
                          <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">
                            VARIANTS ({p.variants.length})
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {p.variants.map(v => {
                              const vIsLow = v.inventory_count > 0 && v.inventory_count <= lowStockThreshold;
                              const vIsOut = v.inventory_count === 0;
                              return (
                                <div
                                  key={v.id}
                                  className={`px-3 py-2.5 rounded-lg border text-center transition-colors ${
                                    vIsOut ? 'border-destructive/30 bg-destructive/5' : vIsLow ? 'border-warning/30 bg-warning/5' : 'border-border bg-secondary/30'
                                  }`}
                                >
                                  <p className="text-xs font-display font-medium mb-1">{v.title}</p>
                                  {editingVariantId === v.id ? (
                                    <div className="flex items-center gap-1 justify-center" onClick={e => e.stopPropagation()}>
                                      <input
                                        type="number"
                                        value={editVariantValue}
                                        onChange={e => setEditVariantValue(e.target.value)}
                                        className="w-14 px-1.5 py-0.5 bg-background border border-border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring"
                                        onKeyDown={e => { if (e.key === 'Enter') saveVariantStock(p.id, v.id); if (e.key === 'Escape') setEditingVariantId(null); }}
                                        autoFocus
                                      />
                                      <button onClick={() => saveVariantStock(p.id, v.id)} className="p-0.5 text-success">
                                        <Check className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEditingVariantId(v.id); setEditVariantValue(String(v.inventory_count)); }}
                                      className={`text-sm font-display hover:underline ${vIsOut ? 'text-destructive' : vIsLow ? 'text-warning' : 'text-foreground/70'}`}
                                    >
                                      {v.inventory_count}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit product modal */}
      <AnimatePresence>
        {editingProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
            onClick={() => setEditingProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="liquid-glass rounded-xl w-full max-w-lg p-6 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="font-display text-lg font-bold">Edit Product</h2>

              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">TITLE</label>
                <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-display tracking-widest text-muted-foreground">PRICE</label>
                  <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-display tracking-widest text-muted-foreground">CATEGORY</label>
                  <input value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">DESCRIPTION</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>

              {/* Variant / Size Management */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-display tracking-widest text-muted-foreground">SIZES & INVENTORY</label>
                  <button
                    onClick={() => {
                      const newVariant = {
                        id: `new-${Date.now()}`,
                        title: '',
                        inventory_count: 0,
                        sku: null,
                      };
                      setProducts(prev => prev.map(p =>
                        p.id === editingProduct.id
                          ? { ...p, variants: [...p.variants, newVariant] }
                          : p
                      ));
                      // Refresh editingProduct reference
                      setEditingProduct(prev => prev ? {
                        ...prev,
                        variants: [...prev.variants, newVariant],
                      } : prev);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider border border-border/50 rounded-md hover:bg-secondary/50 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> ADD SIZE
                  </button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {editingProduct.variants.map((v, vi) => (
                    <div key={v.id} className="flex items-center gap-2 bg-background/30 border border-border/30 rounded-lg px-3 py-2">
                      <input
                        value={v.title}
                        onChange={e => {
                          const newTitle = e.target.value;
                          const updated = editingProduct.variants.map((vv, i) => i === vi ? { ...vv, title: newTitle } : vv);
                          setEditingProduct({ ...editingProduct, variants: updated });
                          setProducts(prev => prev.map(p =>
                            p.id === editingProduct.id
                              ? { ...p, variants: updated, totalStock: updated.reduce((s, vv) => s + vv.inventory_count, 0) }
                              : p
                          ));
                        }}
                        placeholder="Size (e.g. S, M, L)"
                        className="flex-1 px-2 py-1.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded text-xs font-display focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">QTY</span>
                        <input
                          type="number"
                          min="0"
                          value={v.inventory_count}
                          onChange={e => {
                            const count = parseInt(e.target.value) || 0;
                            const updated = editingProduct.variants.map((vv, i) => i === vi ? { ...vv, inventory_count: count } : vv);
                            setEditingProduct({ ...editingProduct, variants: updated });
                            setProducts(prev => prev.map(p =>
                              p.id === editingProduct.id
                                ? { ...p, variants: updated, totalStock: updated.reduce((s, vv) => s + vv.inventory_count, 0) }
                                : p
                            ));
                          }}
                          className="w-16 px-2 py-1.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded text-xs text-center font-display focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const updated = editingProduct.variants.filter((_, i) => i !== vi);
                          setEditingProduct({ ...editingProduct, variants: updated });
                          setProducts(prev => prev.map(p =>
                            p.id === editingProduct.id
                              ? { ...p, variants: updated, totalStock: updated.reduce((s, vv) => s + vv.inventory_count, 0) }
                              : p
                          ));
                        }}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {editingProduct.variants.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">No sizes yet — add one above</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={saveProductEdit}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-lg hover:opacity-90 transition-opacity">
                  SAVE
                </button>
                <button onClick={() => setEditingProduct(null)}
                  className="px-6 py-2.5 border border-border rounded-lg text-sm hover:bg-secondary transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}