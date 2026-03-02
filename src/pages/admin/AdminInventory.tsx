import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Check, X, Plus, Search, ChevronDown, ChevronRight, Tag, ImageIcon, Video, Loader2, Trash2, Pencil, Eye, EyeOff, GripVertical } from 'lucide-react';
import { useGridLayout } from '@/hooks/use-grid-layout';
import { DraggableImageGrid } from '@/components/admin/DraggableImageGrid';
import { type DemoProduct, PRODUCT_CATEGORIES, type ProductCategory } from '@/data/demo-data';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductRow {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number;
  category: string;
  product_category: ProductCategory;
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

function buildProductRows(orderedProducts: DemoProduct[]): ProductRow[] {
  return orderedProducts.map(p => ({
    id: p.id,
    title: p.title,
    price: p.price,
    compare_at_price: p.compare_at_price,
    category: p.category,
    product_category: p.product_category || '',
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  outerwear: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  streetwear: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  essentials: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20' },
  'new-arrivals': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

const EXTRA_TAG_COLORS = [
  { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/20' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/20' },
  { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/20' },
  { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/20' },
];

function getTagColorObj(tag: string) {
  if (CATEGORY_COLORS[tag]) return CATEGORY_COLORS[tag];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return EXTRA_TAG_COLORS[Math.abs(hash) % EXTRA_TAG_COLORS.length];
}

function getTagColor(tag: string) {
  const c = getTagColorObj(tag);
  return `${c.bg} ${c.text} ${c.border}`;
}

function getTagTextColor(tag: string) {
  return getTagColorObj(tag).text;
}

export default function AdminInventory() {
  const { layout: gridLayout, saveHiddenTags, saveLayout, getOrderedProducts } = useGridLayout();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [editForm, setEditForm] = useState({ title: '', price: '', description: '', category: '' });
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVariantValue, setEditVariantValue] = useState('');
  const [newTag, setNewTag] = useState('');
  const [tagEditMode, setTagEditMode] = useState(false);
  const [addingTagForId, setAddingTagForId] = useState<string | null>(null);
  const [modalNewTag, setModalNewTag] = useState('');
  // Inline editing state for expanded panel
  const [inlineEditing, setInlineEditing] = useState<Record<string, Record<string, boolean>>>({});
  const [inlineValues, setInlineValues] = useState<Record<string, Record<string, string>>>({});
  const lowStockThreshold = 5;
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', price: '', description: '' });
  const [addTags, setAddTags] = useState<string[]>([]);
  const [addTagInput, setAddTagInput] = useState('');
  const [addProductCategory, setAddProductCategory] = useState<ProductCategory>('');
  const [addVariants, setAddVariants] = useState<{ title: string; inventory_count: number }[]>([{ title: 'S', inventory_count: 0 }, { title: 'M', inventory_count: 0 }, { title: 'L', inventory_count: 0 }]);
  const [addSaving, setAddSaving] = useState(false);
  const [addImages, setAddImages] = useState<string[]>([]);
  const [addVideo, setAddVideo] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  const [hiddenTags, setHiddenTags] = useState<string[]>([]);

  // Sync hiddenTags from gridLayout once loaded
  useEffect(() => {
    if (gridLayout?.hiddenTags) {
      setHiddenTags(gridLayout.hiddenTags);
    }
  }, [gridLayout]);

  const toggleTagVisibility = async (tag: string) => {
    const newHidden = hiddenTags.includes(tag)
      ? hiddenTags.filter(t => t !== tag)
      : [...hiddenTags, tag];
    setHiddenTags(newHidden);
    await saveHiddenTags(newHidden);
  };

  // Drag-and-drop state for product reordering
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Initialize products from hook's ordered list
  const [initialized, setInitialized] = useState(false);

  useEffect(() => { fetchInventory(); }, []);

  // Re-initialize when gridLayout loads to apply saved order
  useEffect(() => {
    if (gridLayout && !initialized && !loading) {
      fetchInventory();
      setInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridLayout]);

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((idx: number) => {
    if (dragIdx === null || idx === dragIdx) return;
    setDragOverIdx(idx);
  }, [dragIdx]);

  const handleDragEnd = useCallback(() => {
    if (dragIdx === null || dragOverIdx === null || dragIdx === dragOverIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }

    setProducts(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(dragOverIdx, 0, moved);
      // Save the new order
      const productOrder = next.map(p => p.id);
      const categoryOrder = gridLayout?.categoryOrder || [];
      saveLayout(productOrder, categoryOrder);
      return next;
    });

    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, dragOverIdx, gridLayout?.categoryOrder, saveLayout]);

  async function fetchInventory() {
    // Use hook's ordered products as base (respects saved grid layout order)
    const ordered = getOrderedProducts();
    const demoRows = buildProductRows(ordered);
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

        const dbRows: ProductRow[] = dbProducts.map(p => {
          const pvs = variantMap.get(p.id) || [];
          return {
            id: p.id,
            title: p.title,
            price: p.price,
            compare_at_price: p.compare_at_price ?? undefined,
            category: p.category || '',
            product_category: '' as ProductCategory,
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
        });

        // Merge: use saved order — DB products slot in where grid layout places them, demo products fill the rest
        const allRows = [...dbRows, ...demoRows];
        if (gridLayout?.productOrder && gridLayout.productOrder.length > 0) {
          const idMap = new Map(allRows.map(p => [p.id, p]));
          const finalOrder: ProductRow[] = [];
          const usedIds = new Set<string>();
          for (const id of gridLayout.productOrder) {
            const p = idMap.get(id);
            if (p) { finalOrder.push(p); usedIds.add(id); }
          }
          for (const p of allRows) {
            if (!usedIds.has(p.id)) finalOrder.push(p);
          }
          setProducts(finalOrder);
        } else {
          setProducts(allRows);
        }
        setLoading(false);
        return;
      }
    }

    setProducts(demoRows);
    setLoading(false);
  }

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(p => {
      if (p.category) tags.add(p.category);
      p.tags?.forEach(t => tags.add(t));
    });
    // Also include categories from grid layout (added via Grid Editor)
    if (gridLayout?.categoryOrder) {
      gridLayout.categoryOrder.forEach(c => {
        const lower = c.toLowerCase();
        if (lower !== 'all') tags.add(lower);
      });
    }
    return Array.from(tags).sort();
  }, [products, gridLayout]);

  const allProductCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => { if (p.product_category) cats.add(p.product_category); });
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (activeFilter !== 'all') {
        if (p.category !== activeFilter && !p.tags?.includes(activeFilter)) return false;
      }
      if (activeCategoryFilter !== 'all') {
        if (p.product_category !== activeCategoryFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, activeFilter, activeCategoryFilter, search]);

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
        ? { ...p, title: editForm.title, price: parseFloat(editForm.price) || p.price, description: editForm.description, category: editForm.category, images: editingProduct.images, variants: editingProduct.variants, totalStock: editingProduct.variants.reduce((s, v) => s + v.inventory_count, 0) }
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
          images: editingProduct.images,
          tags: editingProduct.tags,
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
  async function deleteProduct(p: ProductRow) {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    if (!p.isDemo) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('product_variants').delete().eq('product_id', p.id);
        await supabase.from('products').delete().eq('id', p.id);
      }
    }
    setProducts(prev => prev.filter(pr => pr.id !== p.id));
    if (expandedId === p.id) setExpandedId(null);
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

  async function handleMediaUpload(file: File, type: 'image' | 'video', target: 'add' | 'edit' = 'add') {
    if (type === 'image') { if (target === 'edit') setEditUploadingImage(true); else setUploadingImage(true); }
    else setUploadingVideo(true);
    try {
      const ext = file.name.split('.').pop() || (type === 'image' ? 'jpg' : 'mp4');
      const path = `${type}s/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('product-media').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(path);
      if (type === 'image') {
        if (target === 'edit' && editingProduct) {
          const updatedImages = [...editingProduct.images, publicUrl];
          setEditingProduct({ ...editingProduct, images: updatedImages });
          setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, images: updatedImages } : p));
        } else {
          setAddImages(prev => [...prev, publicUrl]);
        }
      } else {
        setAddVideo(publicUrl);
      }
    } catch (e) {
      console.error(`Upload ${type} failed:`, e);
    } finally {
      if (type === 'image') { if (target === 'edit') setEditUploadingImage(false); else setUploadingImage(false); }
      else setUploadingVideo(false);
    }
  }

  async function handleAddProduct() {
    if (!addForm.title.trim() || !addForm.price) return;
    setAddSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setAddSaving(false); return; }

    const images = addImages.length > 0 ? addImages : [];
    const { data: product, error } = await supabase.from('products').insert({
      merchant_id: session.user.id,
      title: addForm.title.trim(),
      price: parseFloat(addForm.price) || 0,
      description: addForm.description.trim(),
      category: addTags.length > 0 ? addTags[0] : '',
      status: 'active',
      tags: addTags,
      images,
    }).select().single();

    if (!error && product) {
      const validVariants = addVariants.filter(v => v.title.trim());
      if (validVariants.length > 0) {
        await supabase.from('product_variants').insert(
          validVariants.map(v => ({
            product_id: product.id,
            title: v.title.trim(),
            inventory_count: v.inventory_count,
          }))
        );
      }
    }

    setAddSaving(false);
    setShowAddProduct(false);
    setAddForm({ title: '', price: '', description: '' });
    setAddTags([]);
    setAddTagInput('');
    setAddProductCategory('');
    setAddVariants([{ title: 'S', inventory_count: 0 }, { title: 'M', inventory_count: 0 }, { title: 'L', inventory_count: 0 }]);
    setAddImages([]);
    setAddVideo(null);
    fetchInventory();
  }

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Inventory</h1>
        <button onClick={() => setShowAddProduct(true)}
          className="px-4 py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
          <Plus className="w-4 h-4" /> ADD PRODUCT
        </button>
      </div>

      {/* Search + Stats + Category Tags */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2.5 liquid-glass rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <span className="text-xs font-display px-3 py-1.5 bg-secondary rounded-lg text-muted-foreground whitespace-nowrap">
            {totalItems} PRODUCTS
          </span>
          {lowStockProducts > 0 && (
            <span className="text-xs font-display px-3 py-1.5 bg-warning/20 text-warning rounded-lg flex items-center gap-1.5 whitespace-nowrap">
              <AlertTriangle className="w-3 h-3" /> {lowStockProducts} LOW
            </span>
          )}
          {outOfStockProducts > 0 && (
            <span className="text-xs font-display px-3 py-1.5 bg-destructive/20 text-destructive rounded-lg whitespace-nowrap">
              {outOfStockProducts} OUT
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 text-xs font-display tracking-wider rounded-lg border transition-colors ${
              activeFilter === 'all' ? 'bg-foreground/10 text-foreground border-foreground/20' : 'bg-card text-muted-foreground border-border hover:bg-secondary'
            }`}>
            ALL
          </button>
          {allTags.map(tag => (
              <div key={tag} className="flex items-center gap-1">
                <button
                  onClick={() => setActiveFilter(tag === activeFilter ? 'all' : tag)}
                  className={`px-3 py-1.5 text-xs font-display tracking-wider rounded-lg border transition-colors ${getTagColor(tag)} ${
                    activeFilter === tag ? 'ring-1 ring-foreground/30' : 'opacity-50 hover:opacity-80'
                  } ${hiddenTags.includes(tag) ? 'line-through decoration-1' : ''}`}>
                  {tag.toUpperCase().replace('-', ' ')}
                </button>
                {tagEditMode && (
                  <>
                    <button
                      onClick={() => toggleTagVisibility(tag)}
                      className={`w-5 h-5 inline-flex items-center justify-center rounded border transition-colors ${
                        hiddenTags.includes(tag)
                          ? 'border-warning/40 bg-warning/15 text-warning hover:bg-warning/30'
                          : 'border-success/40 bg-success/15 text-success hover:bg-success/30'
                      }`}
                      title={hiddenTags.includes(tag) ? `Show "${tag}" on storefront` : `Hide "${tag}" from storefront`}
                    >
                      {hiddenTags.includes(tag) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`Remove tag "${tag}" from all products?`)) return;
                        setProducts(prev => prev.map(p => ({
                          ...p,
                          tags: p.tags.filter(t => t !== tag),
                          category: p.category === tag ? (p.tags.filter(t => t !== tag)[0] || '') : p.category,
                        })));
                        if (activeFilter === tag) setActiveFilter('all');
                        // Remove from grid layout categoryOrder too
                        const currentCatOrder = gridLayout?.categoryOrder || [];
                        const newCatOrder = currentCatOrder.filter(c => c.toLowerCase() !== tag.toLowerCase());
                        const currentProductOrder = gridLayout?.productOrder || [];
                        saveLayout(currentProductOrder, newCatOrder);
                        // Also remove from hiddenTags if present
                        if (hiddenTags.includes(tag)) {
                          const newHidden = hiddenTags.filter(t => t !== tag);
                          setHiddenTags(newHidden);
                          saveHiddenTags(newHidden);
                        }
                        (async () => {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session) return;
                          const affected = products.filter(p => !p.isDemo && p.tags.includes(tag));
                          for (const p of affected) {
                            const newTags = p.tags.filter(t => t !== tag);
                            const newCategory = p.category === tag ? (newTags[0] || '') : p.category;
                            await supabase.from('products').update({ tags: newTags, category: newCategory }).eq('id', p.id);
                          }
                        })();
                      }}
                      className="w-5 h-5 inline-flex items-center justify-center rounded border border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      title={`Delete tag "${tag}"`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
          ))}
          <button
            onClick={() => setTagEditMode(prev => !prev)}
            className={`ml-1 px-2.5 py-1.5 text-xs font-display tracking-wider rounded-lg border transition-colors ${
              tagEditMode ? 'bg-success/15 text-success border-success/30' : 'bg-card text-muted-foreground border-border hover:bg-secondary'
            }`}
            title={tagEditMode ? 'Done editing tags' : 'Edit tags'}
          >
            {tagEditMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </button>
        </div>
        {/* Secondary category strip */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-3 py-1 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
              activeCategoryFilter === 'all' ? 'bg-foreground/5 text-foreground/70 border-foreground/15' : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
            }`}>
            ALL TYPES
          </button>
          {(allProductCategories.length > 0 ? allProductCategories : PRODUCT_CATEGORIES).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat === activeCategoryFilter ? 'all' : cat)}
              className={`px-3 py-1 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                activeCategoryFilter === cat ? 'bg-foreground/5 text-foreground/70 border-foreground/15' : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
              }`}>
              {cat.toUpperCase()}
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
          {filtered.map((p, filteredIdx) => {
            const avgStock = p.variants.length > 0 ? p.totalStock / p.variants.length : 0;
            const isLow = avgStock > 0 && avgStock <= lowStockThreshold;
            const isOut = p.totalStock === 0;
            const isExpanded = expandedId === p.id;
            // Get the actual index in the full products array for drag reordering
            const realIdx = products.findIndex(pp => pp.id === p.id);
            const isDragging = dragIdx === realIdx;
            const isDragOver = dragOverIdx === realIdx;

            return (
              <div
                key={p.id}
                draggable={activeFilter === 'all' && !isExpanded}
                onDragStart={() => handleDragStart(realIdx)}
                onDragOver={(e) => { e.preventDefault(); handleDragOver(realIdx); }}
                onDragEnd={handleDragEnd}
                className={`liquid-glass rounded-xl overflow-hidden transition-all ${
                  isDragging ? 'opacity-40 scale-[0.98]' : ''
                } ${isDragOver ? 'ring-2 ring-primary/50 translate-y-[-2px]' : ''}`}
              >
                {/* Product row */}
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  {/* Drag handle */}
                  {activeFilter === 'all' && (
                    <div
                      className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors flex-shrink-0"
                      onMouseDown={e => e.stopPropagation()}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                  )}

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
                      {p.product_category && (
                        <span className="text-[10px] font-display px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground/70">
                          {p.product_category.toUpperCase()}
                        </span>
                      )}
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
                        {/* Title + Price inline edit */}
                        <div className="flex items-start justify-between gap-6">
                          <div className="space-y-3 flex-1">
                            {/* Title */}
                            <div>
                              <p className="text-xs text-muted-foreground font-display tracking-widest mb-1">TITLE</p>
                              {inlineEditing[p.id]?.title ? (
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <input
                                    value={inlineValues[p.id]?.title ?? p.title}
                                    onChange={e => setInlineValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], title: e.target.value } }))}
                                    className="flex-1 px-3 py-1.5 bg-background/40 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        const val = inlineValues[p.id]?.title?.trim();
                                        if (val) setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, title: val } : pr));
                                        setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], title: false } }));
                                      }
                                      if (e.key === 'Escape') setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], title: false } }));
                                    }}
                                  />
                                  <button onClick={() => {
                                    const val = inlineValues[p.id]?.title?.trim();
                                    if (val) setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, title: val } : pr));
                                    setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], title: false } }));
                                  }} className="p-1 text-success"><Check className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setInlineValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], title: p.title } })); setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], title: true } })); }}
                                  className="text-sm text-foreground hover:text-foreground/80 hover:underline"
                                >{p.title}</button>
                              )}
                            </div>

                            {/* Price */}
                            <div>
                              <p className="text-xs text-muted-foreground font-display tracking-widest mb-1">PRICE</p>
                              {inlineEditing[p.id]?.price ? (
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <span className="text-sm text-muted-foreground">$</span>
                                  <input
                                    type="number"
                                    value={inlineValues[p.id]?.price ?? String(p.price)}
                                    onChange={e => setInlineValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value } }))}
                                    className="w-28 px-3 py-1.5 bg-background/40 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        const val = parseFloat(inlineValues[p.id]?.price);
                                        if (!isNaN(val) && val >= 0) setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, price: val } : pr));
                                        setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: false } }));
                                      }
                                      if (e.key === 'Escape') setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: false } }));
                                    }}
                                  />
                                  <button onClick={() => {
                                    const val = parseFloat(inlineValues[p.id]?.price);
                                    if (!isNaN(val) && val >= 0) setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, price: val } : pr));
                                    setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: false } }));
                                  }} className="p-1 text-success"><Check className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setInlineValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: String(p.price) } })); setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: true } })); }}
                                  className="text-sm font-display text-foreground hover:underline"
                                >${p.price}{p.compare_at_price ? <span className="ml-2 text-muted-foreground line-through">${p.compare_at_price}</span> : null}</button>
                              )}
                            </div>

                            {/* Description */}
                            <div>
                              <p className="text-xs text-muted-foreground font-display tracking-widest mb-1">DESCRIPTION</p>
                              {inlineEditing[p.id]?.description ? (
                                <div className="flex items-start gap-2" onClick={e => e.stopPropagation()}>
                                  <textarea
                                    value={inlineValues[p.id]?.description ?? p.description}
                                    onChange={e => setInlineValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], description: e.target.value } }))}
                                    rows={3}
                                    className="flex-1 px-3 py-1.5 bg-background/40 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Escape') setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], description: false } }));
                                    }}
                                  />
                                  <button onClick={() => {
                                    const val = inlineValues[p.id]?.description?.trim();
                                    if (val !== undefined) setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, description: val } : pr));
                                    setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], description: false } }));
                                  }} className="p-1 text-success mt-1"><Check className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setInlineValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], description: p.description } })); setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], description: true } })); }}
                                  className="text-sm text-foreground/70 leading-relaxed text-left hover:text-foreground/90"
                                >{p.description || <span className="italic text-muted-foreground">No description</span>}</button>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditPanel(p); }}
                              className="px-4 py-2 text-xs font-display tracking-wider border border-border rounded-lg hover:bg-secondary transition-colors"
                            >
                              EDIT
                            </button>
                            {!p.isDemo && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteProduct(p); }}
                                className="px-3 py-2 text-xs font-display tracking-wider border border-destructive/30 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Category */}
                        <div>
                          <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">CATEGORY</p>
                          <div className="flex flex-wrap gap-2">
                            {PRODUCT_CATEGORIES.map(cat => (
                              <button
                                key={cat}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProducts(prev => prev.map(pr =>
                                    pr.id === p.id ? { ...pr, product_category: (pr.product_category === cat ? '' : cat) as ProductCategory } : pr
                                  ));
                                }}
                                className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                                  p.product_category === cat
                                    ? 'bg-foreground/10 text-foreground border-foreground/20'
                                    : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
                                }`}
                              >
                                {cat.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Thumbnails quick-edit */}
                        <div>
                          <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">IMAGES ({p.images?.length || 0})</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {p.images?.map((img, imgIdx) => (
                              <div key={imgIdx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border/50 bg-secondary/30 flex-shrink-0">
                                <img src={img} alt={`${p.title} ${imgIdx + 1}`} className="w-full h-full object-cover" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProducts(prev => prev.map(pr =>
                                      pr.id === p.id ? { ...pr, images: pr.images.filter((_, i) => i !== imgIdx) } : pr
                                    ));
                                  }}
                                  className="absolute top-0.5 right-0.5 p-0.5 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                            <input
                              ref={expandedId === p.id ? editImageInputRef : undefined}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  // Quick inline upload
                                  const setUploading = (v: boolean) => setEditUploadingImage(v);
                                  setUploading(true);
                                  const ext = f.name.split('.').pop() || 'jpg';
                                  const path = `images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
                                  supabase.storage.from('product-media').upload(path, f).then(({ error }) => {
                                    if (!error) {
                                      const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(path);
                                      setProducts(prev => prev.map(pr =>
                                        pr.id === p.id ? { ...pr, images: [...pr.images, publicUrl] } : pr
                                      ));
                                    }
                                    setUploading(false);
                                  });
                                }
                                e.target.value = '';
                              }}
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); editImageInputRef.current?.click(); }}
                              disabled={editUploadingImage}
                              className="w-16 h-16 rounded-lg border-2 border-dashed border-border/50 bg-background/20 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50 flex-shrink-0"
                            >
                              {editUploadingImage ? (
                                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4 text-muted-foreground/50" />
                              )}
                              <span className="text-[7px] font-display tracking-wider text-muted-foreground">{editUploadingImage ? 'WAIT' : 'ADD'}</span>
                            </button>
                          </div>
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
                            SIZES ({p.variants.length})
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

      {/* Add product modal */}
      <AnimatePresence>
        {showAddProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
            onClick={() => setShowAddProduct(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="liquid-glass rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="font-display text-lg font-bold">Add Product</h2>

              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">TITLE</label>
                <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Product name"
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              {/* Images & Video Upload */}
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground mb-2 block">PRODUCT IMAGES</label>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, 'image', 'add'); e.target.value = ''; }} />
                <DraggableImageGrid
                  images={addImages}
                  onChange={setAddImages}
                  onUpload={() => imageInputRef.current?.click()}
                  uploading={uploadingImage}
                />
              </div>

              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground mb-2 block">PRODUCT VIDEO</label>
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, 'video', 'add'); e.target.value = ''; }} />
                {addVideo ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border/50 bg-background/40">
                    <video src={addVideo} className="w-full h-full object-cover" muted />
                    <button onClick={() => setAddVideo(null)}
                      className="absolute top-1 right-1 p-0.5 bg-background/80 rounded-full hover:bg-destructive/80 transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-border/50 bg-background/20 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50">
                    {uploadingVideo ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /> : <Video className="w-4 h-4 text-muted-foreground/50" />}
                    <span className="text-[8px] font-display tracking-wider text-muted-foreground">{uploadingVideo ? 'UPLOADING' : 'ADD'}</span>
                  </button>
                )}
              </div>

              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">PRICE</label>
                <input type="number" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0" min="0"
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              {/* Category type */}
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground mb-2 block">CATEGORY</label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setAddProductCategory(addProductCategory === cat ? '' : cat)}
                      className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                        addProductCategory === cat
                          ? 'bg-foreground/10 text-foreground border-foreground/20'
                          : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground mb-2 block">TAGS</label>
                {/* Existing tags as toggleable chips */}
                {allTags.filter(t => !addTags.includes(t)).length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {allTags.filter(t => !addTags.includes(t)).map(tag => (
                      <button
                        key={tag}
                        onClick={() => setAddTags(prev => [...prev, tag])}
                        className={`text-[10px] font-display px-2 py-1 rounded border opacity-50 hover:opacity-100 transition-opacity ${getTagColor(tag)}`}
                      >
                        {tag.toUpperCase().replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                )}
                {/* Selected tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  {addTags.map(tag => (
                    <span key={tag} className={`text-[10px] font-display px-2 py-1 rounded border inline-flex items-center gap-1.5 ${getTagColor(tag)}`}>
                      {tag.toUpperCase().replace('-', ' ')}
                      <button onClick={() => setAddTags(prev => prev.filter(t => t !== tag))} className="hover:opacity-70">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      value={addTagInput}
                      onChange={e => setAddTagInput(e.target.value)}
                      placeholder="New tag..."
                      className="w-24 px-2 py-1 bg-background/40 border border-border/50 backdrop-blur-sm rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && addTagInput.trim()) {
                          const tag = addTagInput.trim().toLowerCase();
                          if (!addTags.includes(tag)) setAddTags(prev => [...prev, tag]);
                          setAddTagInput('');
                        }
                      }}
                    />
                    {addTagInput.trim() && (
                      <button onClick={() => {
                        const tag = addTagInput.trim().toLowerCase();
                        if (!addTags.includes(tag)) setAddTags(prev => [...prev, tag]);
                        setAddTagInput('');
                      }} className="p-0.5 text-success hover:bg-success/20 rounded">
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">DESCRIPTION</label>
                <textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  placeholder="Product description..."
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-display tracking-widest text-muted-foreground">SIZES & INVENTORY</label>
                  <button
                    onClick={() => setAddVariants(v => [...v, { title: '', inventory_count: 0 }])}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider border border-border/50 rounded-md hover:bg-secondary/50 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> ADD SIZE
                  </button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {addVariants.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 bg-background/30 border border-border/30 rounded-lg px-3 py-2">
                      <input
                        value={v.title}
                        onChange={e => {
                          const updated = [...addVariants];
                          updated[i] = { ...updated[i], title: e.target.value };
                          setAddVariants(updated);
                        }}
                        placeholder="Size (e.g. S, M, L)"
                        className="flex-1 px-2 py-1.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded text-xs font-display focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">QTY</span>
                        <input
                          type="number" min="0"
                          value={v.inventory_count}
                          onChange={e => {
                            const updated = [...addVariants];
                            updated[i] = { ...updated[i], inventory_count: parseInt(e.target.value) || 0 };
                            setAddVariants(updated);
                          }}
                          className="w-16 px-2 py-1.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded text-xs text-center font-display focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <button onClick={() => setAddVariants(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleAddProduct} disabled={addSaving || !addForm.title.trim() || !addForm.price}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                  {addSaving ? 'SAVING...' : 'ADD PRODUCT'}
                </button>
                <button onClick={() => setShowAddProduct(false)}
                  className="px-6 py-2.5 border border-border rounded-lg text-sm hover:bg-secondary transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="liquid-glass rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="font-display text-lg font-bold">Edit Product</h2>

              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">TITLE</label>
                <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              {/* Images management */}
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground mb-2 block">PRODUCT IMAGES</label>
                <input ref={editImageInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, 'image', 'edit'); e.target.value = ''; }} />
                <DraggableImageGrid
                  images={editingProduct.images}
                  onChange={(newImages) => {
                    setEditingProduct({ ...editingProduct, images: newImages });
                    setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, images: newImages } : p));
                  }}
                  onUpload={() => editImageInputRef.current?.click()}
                  uploading={editUploadingImage}
                  size="sm"
                />
              </div>

              {/* Category type */}
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground mb-2 block">CATEGORY</label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        const newCat = editingProduct.product_category === cat ? '' as ProductCategory : cat;
                        setEditingProduct({ ...editingProduct, product_category: newCat });
                        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, product_category: newCat } : p));
                      }}
                      className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                        editingProduct.product_category === cat
                          ? 'bg-foreground/10 text-foreground border-foreground/20'
                          : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-display tracking-widest text-muted-foreground">PRICE</label>
                  <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-display tracking-widest text-muted-foreground">TAG</label>
                  <input value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">DESCRIPTION</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground mb-2 block">TAGS</label>
                {/* Existing tags as toggleable chips */}
                {allTags.filter(t => !editingProduct.tags.includes(t)).length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {allTags.filter(t => !editingProduct.tags.includes(t)).map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          const updated = [...editingProduct.tags, tag];
                          setEditingProduct({ ...editingProduct, tags: updated });
                          setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, tags: updated } : p));
                        }}
                        className={`text-[10px] font-display px-2 py-1 rounded border opacity-50 hover:opacity-100 transition-opacity ${getTagColor(tag)}`}
                      >
                        {tag.toUpperCase().replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                )}
                {/* Selected tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  {editingProduct.tags.map(tag => (
                    <span key={tag} className={`text-[10px] font-display px-2 py-1 rounded border inline-flex items-center gap-1.5 ${getTagColor(tag)}`}>
                      {tag.toUpperCase().replace('-', ' ')}
                      <button onClick={() => {
                        const updated = editingProduct.tags.filter(t => t !== tag);
                        setEditingProduct({ ...editingProduct, tags: updated });
                        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, tags: updated } : p));
                      }} className="hover:opacity-70">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      value={modalNewTag}
                      onChange={e => setModalNewTag(e.target.value)}
                      placeholder="New tag..."
                      className="w-24 px-2 py-1 bg-background/40 border border-border/50 backdrop-blur-sm rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && modalNewTag.trim()) {
                          const tag = modalNewTag.trim().toLowerCase();
                          if (!editingProduct.tags.includes(tag)) {
                            const updated = [...editingProduct.tags, tag];
                            setEditingProduct({ ...editingProduct, tags: updated });
                            setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, tags: updated } : p));
                          }
                          setModalNewTag('');
                        }
                      }}
                    />
                    {modalNewTag.trim() && (
                      <button onClick={() => {
                        const tag = modalNewTag.trim().toLowerCase();
                        if (!editingProduct.tags.includes(tag)) {
                          const updated = [...editingProduct.tags, tag];
                          setEditingProduct({ ...editingProduct, tags: updated });
                          setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, tags: updated } : p));
                        }
                        setModalNewTag('');
                      }} className="p-0.5 text-success hover:bg-success/20 rounded">
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
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