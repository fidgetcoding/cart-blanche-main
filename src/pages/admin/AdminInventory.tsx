import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { isDemoSession, supabase } from '@/lib/demo/client';
import { mergeInventoryRows } from '@/lib/inventory-rows';
import type { Json } from '@/integrations/supabase/types';
import { AlertTriangle, Check, X, Plus, Search, ChevronDown, ChevronRight, ChevronLeft, ChevronUp, Tag, ImageIcon, Video, Loader2, Pencil, Eye, EyeOff, GripVertical, Globe, Home, Save, Archive, Trash2, CheckSquare, Square } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useGridLayout } from '@/hooks/use-grid-layout';
import { DraggableImageGrid } from '@/components/admin/DraggableImageGrid';
import { HsCodePicker } from '@/components/admin/HsCodePicker';
import { type DemoProduct, PRODUCT_TYPES, type ProductType, type Colorway, type ProductImage, getImageUrl } from '@/data/demo-data';
import { getSwatchStyle } from '@/lib/swatch-style';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useProductWaitlist } from '@/hooks/use-product-waitlist';
import { WaitlistTable } from '@/components/admin/WaitlistTable';
import { ColorwayManager } from '@/components/admin/ColorwayManager';

interface ProductRow {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number;
  category: string;
  product_type: ProductType;
  gender: string;
  colorways: Colorway[];
  images: string[];
  imagesFull: ProductImage[]; // full ProductImage objects with thumb/medium/full URLs and optional colorway_id tag. Used by inline 3-slot UI; flat `images` stays for row preview thumbnails and Edit Product modal.
  description: string;
  tags: string[];
  variants: {
    id: string;
    title: string;
    inventory_count: number;
    sku: string | null;
    colorway_id?: string;
  }[];
  totalStock: number;
  isDemo: boolean;
  weight_oz: number;
  shipping_type: 'domestic' | 'international';
  hs_code: string;
  status: 'active' | 'draft' | 'archived';
}

function sortImagesByColorwayOrder(
  images: ProductImage[],
  colorways: Colorway[]
): ProductImage[] {
  if (images.length === 0) return images;
  const colorwayIdOrder = new Map<string, number>();
  colorways.forEach((c, i) => colorwayIdOrder.set(c.id, i));
  const indexed = images.map((img, idx) => ({
    img,
    idx,
    groupKey: img.colorway_id && colorwayIdOrder.has(img.colorway_id)
      ? colorwayIdOrder.get(img.colorway_id)!
      : Number.MAX_SAFE_INTEGER,
  }));
  indexed.sort((a, b) => {
    if (a.groupKey !== b.groupKey) return a.groupKey - b.groupKey;
    // Within a group, featured image floats to top.
    const aFeat = a.img.featured ? 0 : 1;
    const bFeat = b.img.featured ? 0 : 1;
    if (aFeat !== bFeat) return aFeat - bFeat;
    return a.idx - b.idx;
  });
  return indexed.map(x => x.img);
}

function buildProductRows(orderedProducts: DemoProduct[]): ProductRow[] {
  return orderedProducts.map(p => {
    const fullImages: ProductImage[] = p.images.map(img => typeof img === 'string'
      ? { thumb: img, medium: img, full: img }
      : img);
    const sortedImagesRaw = sortImagesByColorwayOrder(fullImages, p.colorways || []);
    // Only ONE image across the whole product can be featured (the one shown
    // on the store grid). If no image is explicitly featured, backfill the
    // very first image. If multiple are marked featured (legacy data), keep
    // only the first one.
    let featuredAssigned = false;
    const sortedImages: ProductImage[] = sortedImagesRaw.map((img, i) => {
      if (img.featured && !featuredAssigned) {
        featuredAssigned = true;
        return img;
      }
      if (img.featured) {
        const { featured: _drop, ...rest } = img;
        return rest;
      }
      return img;
    });
    if (!featuredAssigned && sortedImages.length > 0) {
      sortedImages[0] = { ...sortedImages[0], featured: true };
    }
    return {
      id: p.id,
      title: p.title,
      price: p.price,
      compare_at_price: p.compare_at_price,
      category: p.category,
      product_type: p.product_type || '',
      gender: p.gender || 'unisex',
      colorways: p.colorways || [],
      images: sortedImages.map(img => img.thumb),
      imagesFull: sortedImages,
      description: p.description,
      tags: [p.category],
      variants: p.variants.map(v => ({
        id: v.id,
        title: v.title,
        inventory_count: v.inventory_count,
        sku: null,
        colorway_id: v.colorway_id,
      })),
      totalStock: p.variants.reduce((sum, v) => sum + v.inventory_count, 0),
      isDemo: true,
      weight_oz: p.weight_oz ?? 0,
      shipping_type: p.shipping_type ?? 'domestic',
      hs_code: p.hs_code ?? '',
      status: (p.status as 'active' | 'draft' | 'archived') ?? 'active',
    };
  });
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
  const { layout: gridLayout, saveHiddenTags, saveHiddenProductIds, saveHiddenGenders, saveDemoProductOverride, saveLayout, getAllProductsUnfiltered } = useGridLayout();
  const { forProduct: getWaitlistForProduct, countFor: countWaitlistFor, markFulfilled: markWaitlistFulfilled, deleteSignup: deleteWaitlistSignup } = useProductWaitlist();
  const editProductWaitlistRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const [activeGenderFilter, setActiveGenderFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [editForm, setEditForm] = useState({ title: '', price: '', comparePrice: '', description: '', category: '' });
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Pending demo product overrides. Inline edits to demo products
  // accumulate here until SAVE is clicked. Each entry is a Partial
  // patch keyed by productId; on save we merge and flush via
  // saveDemoProductOverride.
  const [pendingDemoOverrides, setPendingDemoOverrides] = useState<Record<string, Record<string, unknown>>>({});
  const [showArchives, setShowArchives] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'archive'; product: ProductRow } | null>(null);
  const [addForm, setAddForm] = useState({ title: '', price: '', comparePrice: '', description: '' });
  const [addTags, setAddTags] = useState<string[]>([]);
  const [addTagInput, setAddTagInput] = useState('');
  const [addProductType, setAddProductType] = useState<ProductType>('');
  const [addGender, setAddGender] = useState<string>('unisex');
  const [addVariants, setAddVariants] = useState<{ title: string; inventory_count: number; colorway_id?: string }[]>([{ title: 'S', inventory_count: 0 }, { title: 'M', inventory_count: 0 }, { title: 'L', inventory_count: 0 }]);
  const [addSaving, setAddSaving] = useState(false);
  const [addImages, setAddImages] = useState<string[]>([]);
  const [addColorways, setAddColorways] = useState<Colorway[]>([]);
  const [addVideo, setAddVideo] = useState<string | null>(null);
  const [addWeight, setAddWeight] = useState('');
  const [addShippingType, setAddShippingType] = useState<'domestic' | 'international'>('domestic');
  const [addHsCode, setAddHsCode] = useState('');
  const [addPublishToStorefront, setAddPublishToStorefront] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedId = useRef<string | null>(null);
  const [batchConfirm, setBatchConfirm] = useState<'delete' | 'archive' | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { markDirty, markClean, BlockerDialog } = useUnsavedChanges();

  // Mark dirty when any unsaved state exists
  useEffect(() => { if (hasUnsavedChanges || editingProduct || showAddProduct || pendingDeletes.size > 0) markDirty(); else markClean(); }, [hasUnsavedChanges, editingProduct, showAddProduct, pendingDeletes, markDirty, markClean]);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  // When the "Use one file for all 3 sizes" link is clicked, this holds the imagesFull index of the entry to fill. -1 means append a new entry.
  const fillAllSizesTargetRef = useRef<number | null>(null);
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  // Per-slot upload tracking for the inline IMAGES section. Format: `${productId}-${imgIdx}-${size}` for slot replacements, or `${productId}-new` for the + ADD button.
  const [imageUploadingSlot, setImageUploadingSlot] = useState<string | null>(null);
  // Tag popover state — which image is showing its tag dropdown. Format: `${productId}-${imgIdx}` or null when none open.
  const [tagPopoverOpenFor, setTagPopoverOpenFor] = useState<string | null>(null);
  // Image row drag state for reorder.
  const [imgDrag, setImgDrag] = useState<{ productId: string; idx: number } | null>(null);
  const [imgDragOverIdx, setImgDragOverIdx] = useState<number | null>(null);

  // Inline new-colorway form — when set, the tag popover for that key shows the create-new-color form instead of the existing-colorway list.
  const [inlineColorFormFor, setInlineColorFormFor] = useState<string | null>(null);
  const [inlineColorName, setInlineColorName] = useState('');
  const [inlineColorHex, setInlineColorHex] = useState('#000000');
  const [hiddenTags, setHiddenTags] = useState<string[]>([]);
  const [customProductTypes, setCustomProductTypes] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('cb_custom_product_types');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [addingTypeForId, setAddingTypeForId] = useState<string | null>(null);
  const [newTypeInput, setNewTypeInput] = useState('');
  const allCategoryOptions = useMemo(() => {
    const set = new Set<string>([...PRODUCT_TYPES, ...customProductTypes]);
    products.forEach(p => { if (p.product_type) set.add(p.product_type as string); });
    return Array.from(set);
  }, [customProductTypes, products]);
  const addCustomProductType = (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!v) return '';
    setCustomProductTypes(prev => {
      if (prev.includes(v) || (PRODUCT_TYPES as readonly string[]).includes(v)) return prev;
      const next = [...prev, v];
      try {
        localStorage.setItem('cb_custom_product_types', JSON.stringify(next));
      } catch {
        // Storage blocked: the type still works for this visit.
      }
      return next;
    });
    return v;
  };

  // Sync hiddenTags from gridLayout once loaded
  useEffect(() => {
    if (gridLayout?.hiddenTags) {
      setHiddenTags(gridLayout.hiddenTags);
    }
  }, [gridLayout]);

  // Gender management — persisted to grid_layouts.hidden_genders (Phase 2C).
  const DEFAULT_GENDERS = ['men', 'women', 'unisex'];
  const [hiddenGenders, setHiddenGenders] = useState<string[]>([]);
  const [genderEditMode, setGenderEditMode] = useState(false);

  // Sync hiddenGenders from gridLayout once loaded (Phase 2C)
  useEffect(() => {
    if (gridLayout?.hiddenGenders) {
      setHiddenGenders(gridLayout.hiddenGenders);
    }
  }, [gridLayout]);

  const toggleGenderVisibility = async (g: string) => {
    const newHidden = hiddenGenders.includes(g)
      ? hiddenGenders.filter(x => x !== g)
      : [...hiddenGenders, g];
    setHiddenGenders(newHidden);
    await saveHiddenGenders(newHidden);
  };

  const toggleTagVisibility = async (tag: string) => {
    const newHidden = hiddenTags.includes(tag)
      ? hiddenTags.filter(t => t !== tag)
      : [...hiddenTags, tag];
    setHiddenTags(newHidden);
    await saveHiddenTags(newHidden);
  };

  // Pointer-based drag-and-drop state for product reordering
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [liveProducts, setLiveProducts] = useState<typeof products>([]);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRow = dragIdx !== null;

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

  // Keep liveProducts synced when not dragging
  useEffect(() => {
    if (!isDraggingRow) setLiveProducts(products);
  }, [products, isDraggingRow]);

  const handleGripPointerDown = useCallback((e: React.PointerEvent, realIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragIdx(realIdx);
    setDragStartY(e.clientY);
    setDragCurrentY(e.clientY);
    setLiveProducts([...products]);
  }, [products]);

  const handleListPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragIdx === null || !listContainerRef.current) return;
    e.preventDefault();
    setDragCurrentY(e.clientY);

    const rows = listContainerRef.current.querySelectorAll('[data-drag-row]');
    let hoverIdx: number | null = null;
    rows.forEach((row, i) => {
      const rect = row.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY < rect.bottom) {
        hoverIdx = i;
      }
    });

    if (hoverIdx !== null && hoverIdx !== dragIdx) {
      setLiveProducts(prev => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(hoverIdx!, 0, moved);
        return next;
      });
      setDragIdx(hoverIdx);
      setDragStartY(e.clientY);
    }
  }, [dragIdx]);

  const handleListPointerUp = useCallback(() => {
    if (dragIdx === null) return;
    setProducts(liveProducts);
    const productOrder = liveProducts.map(p => p.id);
    const categoryOrder = gridLayout?.categoryOrder || [];
    saveLayout(productOrder, categoryOrder);
    setDragIdx(null);
    setHasUnsavedChanges(true);
  }, [dragIdx, liveProducts, gridLayout?.categoryOrder, saveLayout]);

  async function fetchInventory() {
    const ordered = getAllProductsUnfiltered();
    const hiddenIds = new Set(gridLayout?.hiddenProductIds || []);
    const demoRows = buildProductRows(ordered).map(p =>
      hiddenIds.has(p.id) ? { ...p, status: 'draft' as const } : p
    );
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
            product_type: '' as ProductType,
            gender: 'unisex',
            colorways: (p.colorways as unknown as Colorway[]) || [],
            images: p.images || [],
            imagesFull: ((p.images as string[]) || []).map(url => ({ thumb: url, medium: url, full: url })),
            description: p.description || '',
            tags: p.tags || [p.category || ''].filter(Boolean),
            variants: pvs.map(v => ({
              id: v.id,
              title: v.title,
              inventory_count: v.inventory_count ?? 0,
              sku: v.sku,
              colorway_id: v.colorway_id ?? undefined,
            })),
            totalStock: pvs.reduce((sum, v) => sum + (v.inventory_count ?? 0), 0),
            isDemo: false,
            weight_oz: 0,
            shipping_type: 'domestic' as const,
            hs_code: '',
            status: (p.status as 'active' | 'draft' | 'archived') ?? 'draft',
          };
        });

        // Merge: use saved order — DB products slot in where grid layout places them, demo products fill the rest
        const allRows = mergeInventoryRows(dbRows, demoRows, isDemoSession(session));
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

  const allProductTypes = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => { if (p.product_type) cats.add(p.product_type); });
    return Array.from(cats).sort();
  }, [products]);

  // Genders derived from products + defaults — defaults always present so
  // merchants see them even if no product uses them yet.
  const allGenders = useMemo(() => {
    const set = new Set<string>(DEFAULT_GENDERS);
    products.forEach(p => { if (p.gender) set.add(p.gender.toLowerCase()); });
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      // Hide archived products from main inventory
      if (p.status === 'archived') return false;
      if (activeFilter !== 'all') {
        if (p.category !== activeFilter && !p.tags?.includes(activeFilter)) return false;
      }
      if (activeTypeFilter !== 'all') {
        if (p.product_type !== activeTypeFilter) return false;
      }
      if (activeGenderFilter !== 'all') {
        if ((p.gender || 'unisex').toLowerCase() !== activeGenderFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, activeFilter, activeTypeFilter, activeGenderFilter, search]);

  const archivedProducts = useMemo(() => {
    return products.filter(p => p.status === 'archived');
  }, [products]);

  const totalItems = filtered.length;
  const lowStockProducts = filtered.filter(p => {
    const avgPerVariant = p.variants.length > 0 ? p.totalStock / p.variants.length : 0;
    return avgPerVariant > 0 && avgPerVariant <= lowStockThreshold;
  }).length;
  const outOfStockProducts = filtered.filter(p => p.totalStock === 0).length;

  function openEditPanel(p: ProductRow) {
    setEditingProduct(p);
    setEditForm({ title: p.title, price: String(p.price), comparePrice: p.compare_at_price ? String(p.compare_at_price) : '', description: p.description, category: p.category });
  }

  async function saveProductEdit() {
    if (!editingProduct) return;

    const newPrice = parseFloat(editForm.price) || editingProduct.price;
    setProducts(prev => prev.map(p =>
      p.id === editingProduct.id
        ? { ...p, title: editForm.title, price: newPrice, description: editForm.description, category: editForm.category, images: editingProduct.images, variants: editingProduct.variants, totalStock: editingProduct.variants.reduce((s, v) => s + v.inventory_count, 0), status: editingProduct.status }
        : p
    ));

    if (editingProduct.isDemo) {
      await saveDemoProductOverride(editingProduct.id, {
        title: editForm.title,
        price: newPrice,
        description: editForm.description,
        category: editForm.category,
        images: editingProduct.images.map(url => ({ thumb: url, medium: url, full: url })),
        tags: editingProduct.tags,
        status: editingProduct.status,
        variants: editingProduct.variants,
        colorways: editingProduct.colorways || [],
      });
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await (supabase.from('products').update({
          title: editForm.title,
          price: newPrice,
          description: editForm.description,
          category: editForm.category,
          images: editingProduct.images,
          tags: editingProduct.tags,
          status: editingProduct.status,
          colorways: (editingProduct.colorways || []) as unknown as Json,
        }).eq('id', editingProduct.id));

        for (const v of editingProduct.variants) {
          if (v.id.startsWith('new-')) {
            await supabase.from('product_variants').insert({
              product_id: editingProduct.id,
              title: v.title,
              inventory_count: v.inventory_count,
              colorway_id: v.colorway_id ?? null,
            });
          } else {
            await supabase.from('product_variants').update({
              title: v.title,
              inventory_count: v.inventory_count,
              colorway_id: v.colorway_id ?? null,
            }).eq('id', v.id);
          }
        }
      }
    }

    setEditingProduct(null);
  }
  async function performDelete(p: ProductRow) {
    if (!p.isDemo) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('product_variants').delete().eq('product_id', p.id);
        await supabase.from('products').delete().eq('id', p.id);
      }
    }
    setProducts(prev => prev.filter(pr => pr.id !== p.id));
    if (expandedId === p.id) setExpandedId(null);
    // Update grid layout
    const remaining = products.filter(pr => pr.id !== p.id).map(pr => pr.id);
    const categoryOrder = gridLayout?.categoryOrder || [];
    saveLayout(remaining, categoryOrder);
    // Remove from hiddenProductIds if applicable
    const currentHidden = gridLayout?.hiddenProductIds || [];
    const newHidden = currentHidden.filter(id => id !== p.id);
    if (newHidden.length !== currentHidden.length) {
      await saveHiddenProductIds(newHidden);
    }
  }

  async function performArchive(p: ProductRow) {
    setProducts(prev => prev.map(pr => 
      pr.id === p.id ? { ...pr, status: 'archived' as const } : pr
    ));
    if (!p.isDemo) {
      await supabase.from('products').update({ status: 'archived' }).eq('id', p.id);
    }
    if (expandedId === p.id) setExpandedId(null);
    setHasUnsavedChanges(true);
  }

  async function restoreProduct(p: ProductRow) {
    setProducts(prev => prev.map(pr => 
      pr.id === p.id ? { ...pr, status: 'active' as const } : pr
    ));
    if (!p.isDemo) {
      await supabase.from('products').update({ status: 'active' }).eq('id', p.id);
    }
    setHasUnsavedChanges(true);
  }
  // Batch selection logic
  const handleRowSelect = useCallback((productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (e.shiftKey && lastClickedId.current) {
        // Range select between lastClicked and current
        const ids = filtered.map(p => p.id);
        const startIdx = ids.indexOf(lastClickedId.current);
        const endIdx = ids.indexOf(productId);
        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          for (let i = from; i <= to; i++) next.add(ids[i]);
        }
      } else {
        if (next.has(productId)) next.delete(productId); else next.add(productId);
      }
      lastClickedId.current = productId;
      return next;
    });
  }, [filtered]);

  const selectAll = useCallback(() => {
    const allIds = filtered.map(p => p.id);
    setSelectedIds(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
  }, [filtered]);

  async function batchArchive() {
    setProducts(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, status: 'archived' as const } : p));
    for (const id of selectedIds) {
      const p = products.find(pr => pr.id === id);
      if (p && !p.isDemo) {
        await supabase.from('products').update({ status: 'archived' }).eq('id', id);
      }
    }
    setSelectedIds(new Set());
    setBatchConfirm(null);
    setHasUnsavedChanges(true);
  }

  async function batchDelete() {
    for (const id of selectedIds) {
      const p = products.find(pr => pr.id === id);
      if (p) await performDelete(p);
    }
    setSelectedIds(new Set());
    setBatchConfirm(null);
    setHasUnsavedChanges(true);
  }


  // Queue an override patch for a demo product. Merges with any
  // existing pending patch for that product. Marks the page dirty
  // so SAVE activates. Replaces direct saveDemoProductOverride
  // calls for inline edits.
  const queueDemoOverride = useCallback((productId: string, patch: Record<string, unknown>) => {
    setPendingDemoOverrides(prev => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), ...patch },
    }));
    setHasUnsavedChanges(true);
  }, []);

  async function saveAllChanges() {
    if (!hasUnsavedChanges) return;

    // === Compute the complete desired state of grid_layouts locally ===
    const productOrder = products.map(p => p.id);
    const categoryOrder = gridLayout?.categoryOrder || [];
    const hiddenIds = products.filter(p => p.isDemo && p.status === 'draft').map(p => p.id);

    // Merge pending demo overrides into current overrides (per-product shallow merge).
    const currentOverrides = gridLayout?.demoProductOverrides || {};
    const finalOverrides: Record<string, Record<string, unknown>> = {};
    for (const [pid, ov] of Object.entries(currentOverrides)) {
      finalOverrides[pid] = { ...(ov as Record<string, unknown>) };
    }
    for (const [productId, patch] of Object.entries(pendingDemoOverrides)) {
      finalOverrides[productId] = { ...(finalOverrides[productId] || {}), ...(patch as Record<string, unknown>) };
    }

    // === Single atomic upsert to grid_layouts ===
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: layoutError } = await supabase
        .from('grid_layouts')
        .upsert({
          merchant_id: user.id,
          layout_type: 'default',
          product_order: productOrder,
          category_order: categoryOrder,
          hidden_tags: gridLayout?.hiddenTags || [],
          hidden_product_types: gridLayout?.hiddenProductTypes || [],
          hidden_product_ids: hiddenIds,
          hidden_genders: gridLayout?.hiddenGenders || [],
          demo_product_overrides: finalOverrides as unknown as Json,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'merchant_id,layout_type' });
      if (layoutError) {
        console.error('grid_layouts atomic save failed:', layoutError);
        return;
      }
    }

    // === Persist non-demo product changes (separate table, no race with grid_layouts) ===
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      for (const p of products) {
        if (!p.isDemo) {
          await (supabase.from('products').update({
            title: p.title,
            price: p.price,
            compare_at_price: p.compare_at_price ?? null,
            description: p.description,
            category: p.category,
            tags: p.tags,
            gender: p.gender || 'unisex',
            status: p.status,
            colorways: (p.colorways || []) as unknown as Json,
          }).eq('id', p.id));
          for (const v of p.variants) {
            if (!v.id.startsWith('new-')) {
              await supabase.from('product_variants').update({
                title: v.title,
                inventory_count: v.inventory_count,
                colorway_id: v.colorway_id ?? null,
              }).eq('id', v.id);
            }
          }
        }
      }
    }

    setPendingDemoOverrides({});
    setHasUnsavedChanges(false);
  }

  function togglePendingDelete(productId: string) {
    setPendingDeletes(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function commitPendingDeletes() {
    if (pendingDeletes.size === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    for (const id of pendingDeletes) {
      const p = products.find(pr => pr.id === id);
      if (p && !p.isDemo && session) {
        await supabase.from('product_variants').delete().eq('product_id', id);
        await supabase.from('products').delete().eq('id', id);
      }
    }
    // Remove from local state
    setProducts(prev => prev.filter(p => !pendingDeletes.has(p.id)));
    // Update grid layout order
    const remaining = products.filter(p => !pendingDeletes.has(p.id)).map(p => p.id);
    const categoryOrder = gridLayout?.categoryOrder || [];
    saveLayout(remaining, categoryOrder);
    // Also remove from hiddenProductIds if applicable
    const currentHidden = gridLayout?.hiddenProductIds || [];
    const newHidden = currentHidden.filter(id => !pendingDeletes.has(id));
    if (newHidden.length !== currentHidden.length) {
      await saveHiddenProductIds(newHidden);
    }
    if (expandedId && pendingDeletes.has(expandedId)) setExpandedId(null);
    setPendingDeletes(new Set());
  }

  async function toggleProductVisibility(productId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, status: newStatus as 'active' | 'draft' | 'archived' } : p
    ));

    // For demo products, persist via hiddenProductIds in grid_layouts
    const product = products.find(p => p.id === productId);
    if (product?.isDemo) {
      const currentHidden = gridLayout?.hiddenProductIds || [];
      const updatedHidden = newStatus === 'draft'
        ? [...currentHidden, productId]
        : currentHidden.filter(id => id !== productId);
      await saveHiddenProductIds(updatedHidden);
    } else if (product) {
      await supabase.from('products').update({ status: newStatus }).eq('id', productId);
    }
    setHasUnsavedChanges(true);
  }

  function saveVariantStock(productId: string, variantId: string) {
    const count = parseInt(editVariantValue);
    if (isNaN(count) || count < 0) return;
    const targetProduct = products.find(p => p.id === productId);
    if (!targetProduct) return;
    const newVariants = targetProduct.variants.map(v =>
      v.id === variantId ? { ...v, inventory_count: count } : v
    );
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      return { ...p, variants: newVariants, totalStock: newVariants.reduce((s, v) => s + v.inventory_count, 0) };
    }));
    setEditingVariantId(null);
    if (targetProduct.isDemo) {
      queueDemoOverride(productId, { variants: newVariants });
    } else {
      setHasUnsavedChanges(true);
    }
  }

  function addTagToProduct(productId: string, tag: string) {
    if (!tag.trim()) return;
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const cleanTag = tag.trim().toLowerCase();
    if (target.tags.includes(cleanTag)) return;
    const newTags = [...target.tags, cleanTag];
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, tags: newTags } : p
    ));
    setNewTag('');
    setAddingTagForId(null);
    if (target.isDemo) {
      queueDemoOverride(productId, { tags: newTags });
    } else {
      setHasUnsavedChanges(true);
    }
  }

  function setProductColorways(productId: string, next: Colorway[]) {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const sortedImages = sortImagesByColorwayOrder(target.imagesFull, next);
    const flat = sortedImages.map(img => img.thumb);
    setProducts(prev => prev.map(p =>
      p.id === productId
        ? { ...p, colorways: next, imagesFull: sortedImages, images: flat }
        : p
    ));
    if (target.isDemo) {
      queueDemoOverride(productId, { colorways: next, images: sortedImages });
    } else {
      setHasUnsavedChanges(true);
    }
  }

  // ─── Unified IMAGES library handlers (Phase 5.2) ──────────────
  const setProductImagesFull = useCallback((productId: string, newImages: ProductImage[]) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const flat = newImages.map(img => img.thumb);
      return { ...p, images: flat, imagesFull: newImages };
    }));
    const target = products.find(p => p.id === productId);
    if (target?.isDemo) {
      queueDemoOverride(productId, { images: newImages });
    } else {
      setHasUnsavedChanges(true);
    }
  }, [products, saveDemoProductOverride]);

  const replaceImageSize = useCallback(async (
    productId: string,
    imgIdx: number,
    size: 'thumb' | 'medium' | 'full',
    file: File
  ) => {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('product-media').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(path);
      const target = products.find(p => p.id === productId);
      if (!target) return;
      const next = target.imagesFull.map((img, i) =>
        i === imgIdx ? { ...img, [size]: publicUrl } : img
      );
      setProductImagesFull(productId, next);
    } catch (e) {
      console.error('Image size replace failed:', e);
    }
  }, [products, setProductImagesFull]);

  const tagImage = useCallback((
    productId: string,
    imgIdx: number,
    colorwayId: string | undefined
  ) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const tagged = target.imagesFull.map((img, i) => {
      if (i !== imgIdx) return img;
      const { colorway_id: _omit, ...rest } = img;
      return colorwayId ? { ...rest, colorway_id: colorwayId } : rest;
    });
    const sorted = sortImagesByColorwayOrder(tagged, target.colorways || []);
    setProductImagesFull(productId, sorted);
  }, [products, setProductImagesFull]);

  // Mark a single image as THE featured image for the whole product. Only one
  // image across the entire product can be featured (it's what appears on the
  // store grid). Clears featured on every other image.
  const toggleFeatured = useCallback((productId: string, imgIdx: number) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const targetImg = target.imagesFull[imgIdx];
    if (!targetImg) return;
    const wasFeatured = !!targetImg.featured;
    const next: ProductImage[] = target.imagesFull.map((img, i) => {
      if (i === imgIdx) {
        return { ...img, featured: !wasFeatured };
      }
      if (img.featured) {
        const { featured: _drop, ...rest } = img;
        return rest;
      }
      return img;
    });
    const sorted = sortImagesByColorwayOrder(next, target.colorways || []);
    setProductImagesFull(productId, sorted);
  }, [products, setProductImagesFull]);

  // Reorder images within a product. Does NOT re-sort by colorway, so the
  // merchant's manual order is preserved exactly. The featured flag travels
  // with its image, so reordering can change which image is the grid hero
  // only if the user explicitly toggles SHOW ON GRID afterwards.
  const moveImage = useCallback((productId: string, fromIdx: number, toIdx: number) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    if (toIdx < 0 || toIdx >= target.imagesFull.length || fromIdx === toIdx) return;
    const next = [...target.imagesFull];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setProductImagesFull(productId, next);
  }, [products, setProductImagesFull]);



  // Upload one file and fill all 3 sizes on a target entry.
  // If targetIdx is provided, fills that existing entry; otherwise appends a new one.
  const addImage = useCallback(async (productId: string, file: File, targetIdx?: number) => {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('product-media').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(path);
      const target = products.find(p => p.id === productId);
      if (!target) return;
      const filledEntry: ProductImage = { thumb: publicUrl, medium: publicUrl, full: publicUrl };
      const next = typeof targetIdx === 'number' && targetIdx >= 0 && targetIdx < target.imagesFull.length
        ? target.imagesFull.map((img, i) => i === targetIdx ? { ...img, thumb: publicUrl, medium: publicUrl, full: publicUrl } : img)
        : [...target.imagesFull, filledEntry];
      setProductImagesFull(productId, next);
    } catch (e) {
      console.error('Image add failed:', e);
    }
  }, [products, setProductImagesFull]);

  // Append an empty image entry. All 3 size URLs are empty strings, shown to the merchant
  // as MISSING slots ready to be filled by clicking each slot individually.
  const addEmptyImageEntry = useCallback((productId: string) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const newEntry: ProductImage = { thumb: '', medium: '', full: '' };
    const next = [...target.imagesFull, newEntry];
    setProductImagesFull(productId, next);
  }, [products, setProductImagesFull]);

  const removeImageAt = useCallback((productId: string, imgIdx: number) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const next = target.imagesFull.filter((_, i) => i !== imgIdx);
    setProductImagesFull(productId, next);
  }, [products, setProductImagesFull]);

  // Create a new colorway from the inline form and tag the current image with it.
  const createColorwayAndTagImage = useCallback((
    productId: string,
    imgIdx: number,
    name: string,
    hex: string
  ) => {
    if (!name.trim()) return;
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newColorwayId = `${productId}-col-${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const newColorway: Colorway = { id: newColorwayId, name: name.trim(), hex };
    const nextColorways = [...(target.colorways || []), newColorway];
    const nextImages = target.imagesFull.map((img, i) => {
      if (i !== imgIdx) return img;
      const { colorway_id: _, ...rest } = img;
      return { ...rest, colorway_id: newColorwayId };
    });
    const flat = nextImages.map(img => img.thumb);
    setProducts(prev => prev.map(p =>
      p.id === productId
        ? { ...p, colorways: nextColorways, images: flat, imagesFull: nextImages }
        : p
    ));
    if (target.isDemo) {
      queueDemoOverride(productId, { colorways: nextColorways, images: nextImages });
    } else {
      setHasUnsavedChanges(true);
    }
    setInlineColorFormFor(null);
    setInlineColorName('');
    setInlineColorHex('#000000');
    setTagPopoverOpenFor(null);
  }, [products, saveDemoProductOverride]);

  // Reset inline new-color form whenever the tag popover closes.
  useEffect(() => {
    if (tagPopoverOpenFor === null && inlineColorFormFor !== null) {
      setInlineColorFormFor(null);
      setInlineColorName('');
      setInlineColorHex('#000000');
    }
  }, [tagPopoverOpenFor, inlineColorFormFor]);


  function removeTagFromProduct(productId: string, tag: string) {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const newTags = target.tags.filter(t => t !== tag);
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, tags: newTags } : p
    ));
    if (target.isDemo) {
      queueDemoOverride(productId, { tags: newTags });
    } else {
      setHasUnsavedChanges(true);
    }
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
    const { data: product, error } = await (supabase.from('products').insert({
      merchant_id: session.user.id,
      title: addForm.title.trim(),
      price: parseFloat(addForm.price) || 0,
      compare_at_price: addForm.comparePrice ? parseFloat(addForm.comparePrice) : null,
      description: addForm.description.trim(),
      category: addTags.length > 0 ? addTags[0] : '',
      status: addPublishToStorefront ? 'active' : 'draft',
      tags: addTags,
      gender: addGender || 'unisex',
      images,
      colorways: addColorways as unknown as Json,
    }).select().single());

    if (!error && product) {
      const validVariants = addVariants.filter(v => v.title.trim());
      if (validVariants.length > 0) {
        await supabase.from('product_variants').insert(
          validVariants.map(v => ({
            product_id: product.id,
            title: v.title.trim(),
            inventory_count: v.inventory_count,
            colorway_id: v.colorway_id ?? null,
          }))
        );
      }
    }

    setAddSaving(false);
    setShowAddProduct(false);
    setAddForm({ title: '', price: '', comparePrice: '', description: '' });
    setAddTags([]);
    setAddTagInput('');
    setAddProductType('');
    setAddGender('unisex');
    setAddVariants([{ title: 'S', inventory_count: 0 }, { title: 'M', inventory_count: 0 }, { title: 'L', inventory_count: 0 }]);
    setAddImages([]);
    setAddColorways([]);
    setAddVideo(null);
    setAddWeight('');
    setAddShippingType('domestic');
    setAddHsCode('');
    setAddPublishToStorefront(true);
    fetchInventory();
  }

  return (
    <>
    <BlockerDialog />
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Inventory</h1>
        <button 
          onClick={saveAllChanges} 
          disabled={!hasUnsavedChanges}
          className={`px-4 py-2.5 font-display text-sm tracking-wider rounded-lg transition-all flex items-center gap-2 ${
            hasUnsavedChanges 
              ? 'bg-foreground text-background hover:opacity-90' 
              : 'bg-foreground/10 text-muted-foreground/50 cursor-not-allowed'
          }`}>
          <Save className="w-4 h-4" /> SAVE
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
          <button onClick={() => setShowAddProduct(true)}
            className="px-3 py-1.5 text-xs font-display tracking-wider bg-foreground/10 text-foreground border border-foreground/20 rounded-lg hover:bg-foreground/20 transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <Plus className="w-3 h-3" /> ADD PRODUCT
          </button>
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
            onClick={() => { setTagEditMode(prev => !prev); if (tagEditMode) setPendingDeletes(new Set()); }}
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
            onClick={() => setActiveTypeFilter('all')}
            className={`px-3 py-1 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
              activeTypeFilter === 'all' ? 'bg-foreground/5 text-foreground/70 border-foreground/15' : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
            }`}>
            ALL TYPES
          </button>
          {allCategoryOptions.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTypeFilter(cat === activeTypeFilter ? 'all' : cat)}
              className={`px-3 py-1 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                activeTypeFilter === cat ? 'bg-foreground/5 text-foreground/70 border-foreground/15' : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
              }`}>
              {cat.toUpperCase()}
            </button>
          ))}
          {addingTypeForId === '__filter__' ? (
            <input
              autoFocus
              value={newTypeInput}
              onChange={(e) => setNewTypeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = addCustomProductType(newTypeInput);
                  if (v) setActiveTypeFilter(v);
                  setNewTypeInput('');
                  setAddingTypeForId(null);
                } else if (e.key === 'Escape') {
                  setNewTypeInput('');
                  setAddingTypeForId(null);
                }
              }}
              onBlur={() => { setNewTypeInput(''); setAddingTypeForId(null); }}
              placeholder="new category"
              className="px-3 py-1 text-[10px] font-display tracking-wider rounded-md border border-foreground/30 bg-transparent text-foreground outline-none w-32"
            />
          ) : (
            <button
              onClick={() => setAddingTypeForId('__filter__')}
              className="px-3 py-1 text-[10px] font-display tracking-wider rounded-md border border-dashed border-border/60 text-muted-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              + ADD
            </button>
          )}
        </div>
        {/* Gender filter strip — same pattern as types, with edit-mode
            for hide-toggle + delete-everywhere */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setActiveGenderFilter('all')}
            className={`px-3 py-1 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
              activeGenderFilter === 'all' ? 'bg-foreground/5 text-foreground/70 border-foreground/15' : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
            }`}>
            ALL GENDERS
          </button>
          {allGenders.map(g => (
            <div key={g} className="flex items-center gap-1">
              <button
                onClick={() => setActiveGenderFilter(g === activeGenderFilter ? 'all' : g)}
                className={`px-3 py-1 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                  activeGenderFilter === g ? 'bg-foreground/5 text-foreground/70 border-foreground/15' : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
                } ${hiddenGenders.includes(g) ? 'line-through decoration-1' : ''}`}>
                {g.toUpperCase()}
              </button>
              {genderEditMode && (
                <>
                  <button
                    onClick={() => toggleGenderVisibility(g)}
                    className={`w-5 h-5 inline-flex items-center justify-center rounded border transition-colors ${
                      hiddenGenders.includes(g)
                        ? 'border-warning/40 bg-warning/15 text-warning hover:bg-warning/30'
                        : 'border-success/40 bg-success/15 text-success hover:bg-success/30'
                    }`}
                    title={hiddenGenders.includes(g) ? `Show "${g}" on storefront` : `Hide "${g}" from storefront`}
                  >
                    {hiddenGenders.includes(g) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(`Remove gender "${g}" from all products? Products with this gender will reset to 'unisex'.`)) return;
                      setProducts(prev => prev.map(p => p.gender?.toLowerCase() === g ? { ...p, gender: 'unisex' } : p));
                      if (activeGenderFilter === g) setActiveGenderFilter('all');
                      if (hiddenGenders.includes(g)) {
                        const newHidden = hiddenGenders.filter(x => x !== g);
                        setHiddenGenders(newHidden);
                        saveHiddenGenders(newHidden);
                      }
                      // Persist gender reset for affected non-demo products
                      (async () => {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;
                        const affected = products.filter(p => !p.isDemo && p.gender?.toLowerCase() === g);
                        for (const ap of affected) {
                          await supabase.from('products').update({ gender: 'unisex' }).eq('id', ap.id);
                        }
                      })();
                    }}
                    className="w-5 h-5 inline-flex items-center justify-center rounded border border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    title={`Delete gender "${g}"`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          ))}
          <button
            onClick={() => setGenderEditMode(prev => !prev)}
            className={`ml-1 px-2.5 py-1 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
              genderEditMode ? 'bg-success/15 text-success border-success/30' : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
            }`}
            title={genderEditMode ? 'Done editing genders' : 'Edit genders'}
          >
            {genderEditMode ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {showArchives ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowArchives(false)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-display text-lg tracking-wider text-muted-foreground">ARCHIVES</h2>
              <span className="text-xs font-display px-2 py-1 bg-secondary rounded-lg text-muted-foreground">{archivedProducts.length}</span>
            </div>
          </div>
          
          {archivedProducts.length === 0 ? (
            <div className="liquid-glass rounded-xl p-12 text-center">
              <p className="text-muted-foreground font-display tracking-wider text-sm">No archived products</p>
            </div>
          ) : (
            <div className="space-y-2">
              {archivedProducts.map(p => (
                <div key={p.id} className="liquid-glass rounded-xl flex items-center gap-4 px-4 py-3">
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden" style={{ backgroundColor: '#e0e0e0' }}>
                    {p.images.length > 0 ? (
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-contain opacity-50" />
                    ) : (
                      <div className="w-full h-full bg-muted/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm truncate text-muted-foreground">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground/50">${p.price}</p>
                  </div>
                  <button
                    onClick={() => restoreProduct(p)}
                    className="px-3 py-1.5 text-[10px] font-display tracking-wider border border-foreground/10 rounded-lg text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors"
                  >
                    RESTORE
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: 'delete', product: p })}
                    className="p-1.5 text-muted-foreground/30 hover:text-destructive transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="liquid-glass rounded-xl px-4 py-3 mb-3 flex items-center justify-between border border-foreground/10">
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-[10px] font-display tracking-wider text-muted-foreground hover:text-foreground transition-colors">
              {selectedIds.size === filtered.length ? 'DESELECT ALL' : 'SELECT ALL'}
            </button>
            <span className="text-[10px] font-display tracking-wider text-foreground/60">{selectedIds.size} SELECTED</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBatchConfirm('archive')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border border-amber-500/20 text-amber-400 hover:bg-amber-400/10 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" /> ARCHIVE ({selectedIds.size})
            </button>
            <button
              onClick={() => setBatchConfirm('delete')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> DELETE ({selectedIds.size})
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Batch confirm dialog */}
      <AnimatePresence>
        {batchConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="liquid-glass rounded-xl p-6 max-w-sm w-full mx-4 space-y-4 border border-foreground/10">
              <h3 className="font-display text-sm tracking-wider font-bold">
                {batchConfirm === 'delete' ? 'DELETE' : 'ARCHIVE'} {selectedIds.size} PRODUCTS?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {batchConfirm === 'delete'
                  ? 'This will permanently remove these products from your catalog.'
                  : 'These products will be moved to the archive and hidden from the storefront.'}
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setBatchConfirm(null)} className="px-4 py-2 text-[10px] font-display tracking-wider border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors">
                  CANCEL
                </button>
                <button
                  onClick={batchConfirm === 'delete' ? batchDelete : batchArchive}
                  className={`px-4 py-2 text-[10px] font-display tracking-wider rounded-md transition-opacity hover:opacity-90 ${
                    batchConfirm === 'delete' ? 'bg-destructive text-destructive-foreground' : 'bg-amber-500 text-black'
                  }`}
                >
                  {batchConfirm === 'delete' ? 'DELETE ALL' : 'ARCHIVE ALL'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product list */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground font-display tracking-wider animate-pulse">LOADING...</div>
      ) : filtered.length === 0 ? (
        <div className="liquid-glass rounded-xl p-12 text-center">
          <p className="text-muted-foreground font-display tracking-wider text-sm">No products match your criteria</p>
        </div>
      ) : (
        <div
          ref={listContainerRef}
          className="space-y-2"
          onPointerMove={handleListPointerMove}
          onPointerUp={handleListPointerUp}
        >
          {(isDraggingRow ? liveProducts : filtered).map((p, filteredIdx) => {
            const avgStock = p.variants.length > 0 ? p.totalStock / p.variants.length : 0;
            const isLow = avgStock > 0 && avgStock <= lowStockThreshold;
            const isOut = p.totalStock === 0;
            const isExpanded = expandedId === p.id;
            // Get the actual index in the full products array for drag reordering
            const realIdx = products.findIndex(pp => pp.id === p.id);

            return (
              <div
                key={p.id}
                data-drag-row
                className={`liquid-glass rounded-xl overflow-hidden transition-all ${
                  isDraggingRow && dragIdx === filteredIdx ? 'opacity-60 scale-[1.02] shadow-2xl ring-2 ring-primary/40 z-10 relative' : ''
                } ${selectedIds.has(p.id) ? 'ring-1 ring-foreground/30' : ''}`}
                style={isDraggingRow && dragIdx === filteredIdx ? { transform: `translateY(${dragCurrentY - dragStartY}px) scale(1.02)`, transition: 'none' } : undefined}
              >
                {/* Product row */}
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  {/* Selection checkbox */}
                  <button
                    className="flex-shrink-0 text-muted-foreground/40 hover:text-foreground transition-colors"
                    onClick={(e) => handleRowSelect(p.id, e)}
                  >
                    {selectedIds.has(p.id) ? (
                      <CheckSquare className="w-4 h-4 text-foreground" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  {/* Drag handle */}
                  {activeFilter === 'all' && !isExpanded && !tagEditMode && (
                    <div
                      className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors flex-shrink-0 touch-none"
                      onPointerDown={(e) => handleGripPointerDown(e, realIdx)}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                  )}

                  {/* Expand chevron */}
                  <div className="text-muted-foreground">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>

                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#e0e0e0' }}>
                    {p.images.length > 0 ? (
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-8 h-8 bg-muted/60 rounded-md" />
                    )}
                  </div>

                  {/* Title + tags */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-medium truncate">{p.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {p.product_type && (
                        <span className="text-[10px] font-display px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground/70">
                          {p.product_type.toUpperCase()}
                        </span>
                      )}
                      {p.gender && (
                        <span className="text-[10px] font-display px-1.5 py-0.5 rounded border border-border/30 text-muted-foreground/50">
                          {p.gender.toUpperCase()}
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

                  {/* Visibility toggle */}
                  <div className="flex-shrink-0 w-16 flex justify-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => toggleProductVisibility(p.id, p.status)}
                      className={`p-1.5 rounded transition-colors ${
                        p.status === 'active'
                          ? 'text-success hover:bg-success/10'
                          : 'text-muted-foreground/40 hover:bg-muted/50'
                      }`}
                      title={p.status === 'active' ? 'Visible on storefront' : 'Hidden from storefront'}
                    >
                      {p.status === 'active' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
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

                  {/* Action buttons — right side */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setConfirmAction({ type: 'archive', product: p })}
                      className="p-1.5 rounded text-muted-foreground/30 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                      title="Archive product"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: 'delete', product: p })}
                      className="p-1.5 rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete product"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
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

                            {/* Price & Compare At Price */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground font-display tracking-widest mb-1">PRICE</p>
                                {inlineEditing[p.id]?.price ? (
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <span className="text-sm text-muted-foreground">$</span>
                                    <input
                                      type="number"
                                      value={inlineValues[p.id]?.price ?? String(p.price)}
                                      onChange={e => setInlineValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value } }))}
                                      className="w-24 px-3 py-1.5 bg-background/40 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
                                  >${p.price}</button>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-display tracking-widest mb-1">COMPARE AT PRICE</p>
                                {inlineEditing[p.id]?.comparePrice ? (
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <span className="text-sm text-muted-foreground">$</span>
                                    <input
                                      type="number"
                                      value={inlineValues[p.id]?.comparePrice ?? String(p.compare_at_price || '')}
                                      onChange={e => setInlineValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], comparePrice: e.target.value } }))}
                                      placeholder="Optional"
                                      className="w-24 px-3 py-1.5 bg-background/40 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          const val = e.currentTarget.value ? parseFloat(e.currentTarget.value) : undefined;
                                          setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, compare_at_price: val } : pr));
                                          setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], comparePrice: false } }));
                                        }
                                        if (e.key === 'Escape') setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], comparePrice: false } }));
                                      }}
                                    />
                                    <button onClick={() => {
                                      const raw = inlineValues[p.id]?.comparePrice;
                                      const val = raw ? parseFloat(raw) : undefined;
                                      setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, compare_at_price: val } : pr));
                                      setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], comparePrice: false } }));
                                    }} className="p-1 text-success"><Check className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setInlineValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], comparePrice: String(p.compare_at_price || '') } })); setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], comparePrice: true } })); }}
                                    className="text-sm font-display text-foreground hover:underline"
                                  >{p.compare_at_price ? <span className="line-through text-muted-foreground">${p.compare_at_price}</span> : <span className="text-muted-foreground italic text-xs">Set compare price</span>}</button>
                                )}
                              </div>
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
                          <div className="flex flex-col gap-3 flex-shrink-0 items-end">
                            {/* Storefront visibility toggle */}
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <span className={`text-[10px] font-display tracking-wider ${p.status === 'active' ? 'text-success' : 'text-muted-foreground/60'}`}>
                                {p.status === 'active' ? 'VISIBLE' : 'HIDDEN'}
                              </span>
                              <Switch
                                checked={p.status === 'active'}
                                onCheckedChange={() => toggleProductVisibility(p.id, p.status)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Category */}
                        <div>
                          <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">CATEGORY</p>
                          <div className="flex flex-wrap gap-2">
                            {allCategoryOptions.map(cat => (
                              <button
                                key={cat}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProducts(prev => prev.map(pr =>
                                    pr.id === p.id ? { ...pr, product_type: (pr.product_type === cat ? '' : cat) as ProductType } : pr
                                  ));
                                  if (p.isDemo) {
                                    queueDemoOverride(p.id, { product_type: (p.product_type === cat ? '' : cat) as ProductType });
                                  } else {
                                    setHasUnsavedChanges(true);
                                  }
                                }}
                                className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                                  p.product_type === cat
                                    ? 'bg-foreground/10 text-foreground border-foreground/20'
                                    : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
                                }`}
                              >
                                {cat.toUpperCase()}
                              </button>
                            ))}
                            {addingTypeForId === p.id ? (
                              <input
                                autoFocus
                                value={newTypeInput}
                                onChange={(e) => setNewTypeInput(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') {
                                    const v = addCustomProductType(newTypeInput);
                                    if (v) {
                                      setProducts(prev => prev.map(pr =>
                                        pr.id === p.id ? { ...pr, product_type: v as ProductType } : pr
                                      ));
                                      if (p.isDemo) queueDemoOverride(p.id, { product_type: v as ProductType });
                                      else setHasUnsavedChanges(true);
                                    }
                                    setNewTypeInput('');
                                    setAddingTypeForId(null);
                                  } else if (e.key === 'Escape') {
                                    setNewTypeInput('');
                                    setAddingTypeForId(null);
                                  }
                                }}
                                onBlur={() => { setNewTypeInput(''); setAddingTypeForId(null); }}
                                placeholder="new category"
                                className="px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border border-foreground/30 bg-transparent text-foreground outline-none w-32"
                              />
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setAddingTypeForId(p.id); }}
                                className="px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border border-dashed border-border/60 text-muted-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors"
                              >
                                + ADD
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Gender */}
                        <div>
                          <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">GENDER</p>
                          <div className="flex flex-wrap gap-2">
                            {allGenders.filter(g => !hiddenGenders.includes(g)).map(g => (
                              <button
                                key={g}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProducts(prev => prev.map(pr =>
                                    pr.id === p.id ? { ...pr, gender: g } : pr
                                  ));
                                  if (p.isDemo) {
                                    queueDemoOverride(p.id, { gender: g });
                                  } else {
                                    setHasUnsavedChanges(true);
                                  }
                                }}
                                className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                                  (p.gender || 'unisex').toLowerCase() === g
                                    ? 'bg-foreground/10 text-foreground border-foreground/20'
                                    : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
                                }`}
                              >
                                {g.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Unified IMAGES library — 3-slot UI per image with color tag indicators (Phase 5.2) */}
                        <div>
                          <p className="text-xs text-muted-foreground font-display tracking-widest mb-1">
                            IMAGES ({p.imagesFull?.length || 0})
                          </p>
                          <p className="text-[10px] italic text-muted-foreground/70 mb-3 leading-relaxed">
                            All photos for this product. Tag each with a colorway to scope it (or leave untagged to show for all colors). Each image has three sizes — click any slot to upload a different file.
                          </p>

                          <input
                            ref={expandedId === p.id ? editImageInputRef : undefined}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                setImageUploadingSlot(`${p.id}-new`);
                               const targetIdx = fillAllSizesTargetRef.current;
                               fillAllSizesTargetRef.current = null;
                               addImage(p.id, f, targetIdx ?? undefined).finally(() => setImageUploadingSlot(null));
                              }
                              e.target.value = '';
                            }}
                          />

                          <div className="space-y-2">
                            {p.imagesFull?.map((img, imgIdx) => {
                              const tagged = img.colorway_id
                                ? p.colorways?.find(c => c.id === img.colorway_id)
                                : null;
                              const popoverKey = `${p.id}-${imgIdx}`;
                              return (
                                <div
                                  key={`${p.id}-img-${imgIdx}-${img.thumb}-${img.medium}-${img.full}`}
                                  draggable
                                  onDragStart={(e) => {
                                    setImgDrag({ productId: p.id, idx: imgIdx });
                                    e.dataTransfer.effectAllowed = 'move';
                                  }}
                                  onDragOver={(e) => {
                                    if (imgDrag?.productId !== p.id) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (imgDragOverIdx !== imgIdx) setImgDragOverIdx(imgIdx);
                                  }}
                                  onDragLeave={() => {
                                    if (imgDragOverIdx === imgIdx) setImgDragOverIdx(null);
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (imgDrag && imgDrag.productId === p.id && imgDrag.idx !== imgIdx) {
                                      moveImage(p.id, imgDrag.idx, imgIdx);
                                    }
                                    setImgDrag(null);
                                    setImgDragOverIdx(null);
                                  }}
                                  onDragEnd={() => {
                                    setImgDrag(null);
                                    setImgDragOverIdx(null);
                                  }}
                                  className={`relative border rounded-lg p-2 transition-colors ${
                                    img.featured
                                      ? 'border-primary/70 bg-primary/10 ring-1 ring-primary/40'
                                      : 'border-border/40 bg-background/40'
                                  } ${
                                    imgDrag?.productId === p.id && imgDrag.idx === imgIdx ? 'opacity-50' : ''
                                  } ${
                                    imgDragOverIdx === imgIdx && imgDrag?.productId === p.id && imgDrag.idx !== imgIdx ? 'ring-2 ring-primary/60' : ''
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-start gap-2">

                                    {/* Drag handle + reorder chevrons */}
                                    <div className="flex flex-col items-center gap-0.5 pt-1 -ml-1 mr-0.5 select-none">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); moveImage(p.id, imgIdx, imgIdx - 1); }}
                                        disabled={imgIdx === 0}
                                        className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
                                        title="Move up"
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                      <div
                                        className="p-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground"
                                        title="Drag to reorder"
                                      >
                                        <GripVertical className="w-3 h-3" />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); moveImage(p.id, imgIdx, imgIdx + 1); }}
                                        disabled={imgIdx === (p.imagesFull?.length || 0) - 1}
                                        className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
                                        title="Move down"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                    </div>

                                    {/* Color tag swatch indicator */}
                                    <div className="relative pt-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTagPopoverOpenFor(prev => prev === popoverKey ? null : popoverKey);
                                        }}
                                        className="w-4 h-4 rounded-full border border-border/60 hover:border-border flex-shrink-0"
                                        style={
                                          tagged
                                            ? getSwatchStyle(tagged)
                                            : { backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 2px, transparent 2px, transparent 4px)' }
                                        }
                                        title={tagged ? `Tagged: ${tagged.name}` : 'Untagged (shows for all colors)'}
                                      />
                                      {tagPopoverOpenFor === popoverKey && (
                                        <div
                                          className="absolute left-0 top-6 z-30 min-w-[180px] p-1 rounded-lg border border-border bg-card shadow-xl"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {inlineColorFormFor === popoverKey ? (
                                            <div className="p-2 space-y-2">
                                              <p className="text-[9px] font-display tracking-widest text-muted-foreground">NEW COLOR</p>
                                              <input
                                                type="text"
                                                value={inlineColorName}
                                                onChange={(e) => setInlineColorName(e.target.value)}
                                                placeholder="Color name"
                                                autoFocus
                                                className="w-full px-2 py-1.5 bg-background/40 border border-border/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    createColorwayAndTagImage(p.id, imgIdx, inlineColorName, inlineColorHex);
                                                  }
                                                  if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    setInlineColorFormFor(null);
                                                    setInlineColorName('');
                                                    setInlineColorHex('#000000');
                                                  }
                                                }}
                                              />
                                              <div className="flex items-center gap-1.5">
                                                <input
                                                  type="color"
                                                  value={inlineColorHex}
                                                  onChange={(e) => setInlineColorHex(e.target.value)}
                                                  className="w-9 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                                                />
                                                <input
                                                  type="text"
                                                  value={inlineColorHex}
                                                  onChange={(e) => setInlineColorHex(e.target.value)}
                                                  className="flex-1 px-2 py-1 bg-background/40 border border-border/50 rounded text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                                                />
                                              </div>
                                              <div className="flex items-center gap-1 pt-1">
                                                <button
                                                  type="button"
                                                  onClick={() => createColorwayAndTagImage(p.id, imgIdx, inlineColorName, inlineColorHex)}
                                                  disabled={!inlineColorName.trim()}
                                                  className="flex-1 px-2 py-1.5 bg-primary text-primary-foreground rounded text-[10px] font-display tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50"
                                                >
                                                  SAVE
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setInlineColorFormFor(null);
                                                    setInlineColorName('');
                                                    setInlineColorHex('#000000');
                                                  }}
                                                  className="px-2 py-1.5 border border-border rounded text-[10px] text-muted-foreground hover:bg-secondary transition-colors"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  tagImage(p.id, imgIdx, undefined);
                                                  setTagPopoverOpenFor(null);
                                                }}
                                                className="w-full text-left px-2 py-1.5 rounded text-[10px] font-display tracking-wider hover:bg-secondary flex items-center gap-2"
                                              >
                                                <span
                                                  className="w-3 h-3 rounded-full border border-border/60 flex-shrink-0"
                                                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.1) 2px, transparent 2px, transparent 4px)' }}
                                                />
                                                UNTAGGED
                                              </button>
                                              {p.colorways?.map(c => (
                                                <button
                                                  key={c.id}
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    tagImage(p.id, imgIdx, c.id);
                                                    setTagPopoverOpenFor(null);
                                                  }}
                                                  className="w-full text-left px-2 py-1.5 rounded text-[10px] font-display tracking-wider hover:bg-secondary flex items-center gap-2"
                                                >
                                                  <span
                                                    className="w-3 h-3 rounded-full border border-border/60 flex-shrink-0"
                                                    style={getSwatchStyle(c)}
                                                  />
                                                  {c.name.toUpperCase()}
                                                </button>
                                              ))}
                                              <div className="border-t border-border/40 my-1" />
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setInlineColorFormFor(popoverKey);
                                                  setInlineColorName('');
                                                  setInlineColorHex('#000000');
                                                }}
                                                className="w-full text-left px-2 py-1.5 rounded text-[10px] font-display tracking-wider hover:bg-secondary flex items-center gap-2 text-muted-foreground"
                                              >
                                                <Plus className="w-3 h-3 flex-shrink-0" />
                                                NEW COLOR
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* 3 size slots */}
                                    <div className="flex-1 grid grid-cols-3 gap-1.5">
                                      {(['thumb', 'medium', 'full'] as const).map((size) => {
                                        const slotKey = `${p.id}-${imgIdx}-${size}`;
                                        const isUploadingThis = imageUploadingSlot === slotKey;
                                        const url = img[size];
                                        const label = size === 'thumb' ? 'GRID + CART' : size === 'medium' ? 'DETAIL VIEW' : 'ZOOM';
                                        const recommendedSize = size === 'thumb' ? '~400 PX' : size === 'medium' ? '~1200 PX' : '~2400 PX';
                                        const inputId = `slot-input-${slotKey}`;
                                        return (
                                          <div key={size} className="space-y-1">
                                            <input
                                              id={inputId}
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) {
                                                  setImageUploadingSlot(slotKey);
                                                  replaceImageSize(p.id, imgIdx, size, f).finally(() => setImageUploadingSlot(null));
                                                }
                                                e.target.value = '';
                                              }}
                                            />
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                document.getElementById(inputId)?.click();
                                              }}
                                              disabled={!!imageUploadingSlot}
                                              className={`relative w-full aspect-square rounded border bg-cover bg-center transition-colors disabled:opacity-50 overflow-hidden ${
                                                url
                                                  ? 'border-border/60 hover:border-border'
                                                  : 'border-warning/50 hover:border-warning bg-warning/5'
                                              }`}
                                              style={url ? { backgroundImage: `url(${url})` } : undefined}
                                              title={url
                                                ? `Replace ${size} (${label}, recommended ${recommendedSize} wide)`
                                                : `MISSING — click to upload ${label} (${recommendedSize} wide). This surface won't show this image until filled.`}
                                            >
                                              {isUploadingThis && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                                </div>
                                              )}
                                              {!url && !isUploadingThis && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                                                  <Plus className="w-3 h-3 text-warning/70" />
                                                  <span className="text-[7px] font-display tracking-wider text-warning/70">MISSING</span>
                                                </div>
                                              )}
                                            </button>
                                            <p className="text-[8px] font-display tracking-wider text-muted-foreground/70 text-center leading-tight">
                                              {label}
                                            </p>
                                            <p className="text-[7px] font-mono tracking-tight text-muted-foreground/50 text-center leading-tight">
                                              {recommendedSize}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFeatured(p.id, imgIdx);
                                      }}
                                      className={`rounded-md border px-2 py-1 text-[9px] font-display tracking-[0.14em] transition-colors ${
                                        img.featured
                                          ? 'border-primary/40 bg-primary/15 text-primary'
                                          : 'border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-secondary'
                                      }`}
                                      title={img.featured ? 'This image is currently showing on the store grid' : 'Use this image on the store grid'}
                                    >
                                      {img.featured ? 'ON GRID' : 'SHOW ON GRID'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeImageAt(p.id, imgIdx);
                                      }}
                                      className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                                      title="Remove image"
                                    >
                                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Use one file for all 3 sizes — fast path link.
                                Only shown when relevant: no images yet, or at least one entry doesn't have 3 unique URLs. */}
                            {(() => {
                              const showFastPath = p.imagesFull.length === 0 || p.imagesFull.some(img => {
                                const urls = [img.thumb, img.medium, img.full].filter(Boolean);
                                return new Set(urls).size < 3;
                              });
                              if (!showFastPath) return null;
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Target the first incomplete entry (any URL missing or duplicates).
                                    // If none exist, fall through to append a new entry.
                                    const idx = p.imagesFull.findIndex(img => {
                                      const urls = [img.thumb, img.medium, img.full].filter(Boolean);
                                      return new Set(urls).size < 3;
                                    });
                                    fillAllSizesTargetRef.current = idx;
                                    editImageInputRef.current?.click();
                                  }}
                                  disabled={imageUploadingSlot === `${p.id}-new`}
                                  className="w-full px-3 py-2 text-[10px] font-display tracking-wider text-muted-foreground/70 hover:text-foreground/80 transition-colors text-center disabled:opacity-50"
                                >
                                  {imageUploadingSlot === `${p.id}-new` ? (
                                    <span className="inline-flex items-center gap-1.5">
                                      <Loader2 className="w-3 h-3 animate-spin" /> UPLOADING
                                    </span>
                                  ) : (
                                    <>
                                      Use one file for all 3 sizes →
                                      <p className="text-[9px] text-warning/70 mt-0.5 normal-case tracking-normal">
                                        ⚠ Storefront will load slower — large files served to small surfaces
                                      </p>
                                    </>
                                  )}
                                </button>
                              );
                            })()}

                            {/* + ADD IMAGE — appends an empty row that the merchant fills slot-by-slot */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addEmptyImageEntry(p.id);
                              }}
                              className="w-full px-3 py-2.5 border border-dashed border-border/60 rounded-lg text-xs text-muted-foreground hover:bg-secondary hover:border-border transition-colors inline-flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-3 h-3" /> ADD IMAGE
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
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeTagFromProduct(p.id, tag); }}
                                  className="hover:opacity-70"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                            {addingTagForId === p.id ? (() => {
                              const allTags = Array.from(new Set(products.flatMap(pr => pr.tags || []))).sort();
                              const query = newTag.trim().toLowerCase();
                              const suggestions = allTags
                                .filter(t => !p.tags.includes(t))
                                .filter(t => !query || t.toLowerCase().includes(query));
                              const queryExists = query && allTags.some(t => t.toLowerCase() === query);
                              return (
                                <div className="relative" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center gap-1">
                                    <input
                                      value={newTag}
                                      onChange={e => setNewTag(e.target.value)}
                                      placeholder="search or create…"
                                      className="w-32 px-2 py-1 bg-secondary border border-border rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
                                      onKeyDown={e => { if (e.key === 'Enter') addTagToProduct(p.id, newTag); if (e.key === 'Escape') setAddingTagForId(null); }}
                                      autoFocus
                                    />
                                    <button onClick={() => addTagToProduct(p.id, newTag)} disabled={!query} className="p-0.5 text-success hover:bg-success/20 rounded disabled:opacity-30">
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => { setAddingTagForId(null); setNewTag(''); }} className="p-0.5 text-muted-foreground hover:bg-secondary rounded">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-card border border-border rounded-lg shadow-xl p-1.5 max-h-60 overflow-y-auto">
                                    {suggestions.length > 0 && (
                                      <>
                                        <p className="px-2 py-1 text-[9px] font-display tracking-widest text-muted-foreground/70">EXISTING TAGS</p>
                                        {suggestions.slice(0, 20).map(t => (
                                          <button
                                            key={t}
                                            type="button"
                                            onClick={() => addTagToProduct(p.id, t)}
                                            className="w-full text-left px-2 py-1 text-[10px] font-display rounded hover:bg-secondary text-foreground/90"
                                          >
                                            {t.toUpperCase().replace('-', ' ')}
                                          </button>
                                        ))}
                                      </>
                                    )}
                                    {query && !queryExists && (
                                      <>
                                        {suggestions.length > 0 && <div className="border-t border-border/40 my-1" />}
                                        <button
                                          type="button"
                                          onClick={() => addTagToProduct(p.id, newTag)}
                                          className="w-full text-left px-2 py-1 text-[10px] font-display rounded hover:bg-secondary text-foreground/90 inline-flex items-center gap-1.5"
                                        >
                                          <Plus className="w-2.5 h-2.5" /> CREATE "{newTag.trim().toUpperCase()}"
                                        </button>
                                      </>
                                    )}
                                    {!query && suggestions.length === 0 && (
                                      <p className="px-2 py-2 text-[10px] text-muted-foreground/70">No existing tags. Type to create one.</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })() : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setAddingTagForId(p.id); setNewTag(''); }}
                                className="text-[10px] font-display px-2 py-1 rounded border border-dashed border-border text-muted-foreground transition-colors inline-flex items-center gap-1 hover:bg-secondary"
                              >
                                <Plus className="w-2.5 h-2.5" /> ADD TAG
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Colorways management */}
                        <div>
                          <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">COLORS</p>
                          <ColorwayManager
                            colorways={p.colorways || []}
                            onChange={(next) => setProductColorways(p.id, next)}
                          />
                        </div>

                        {/* Variants / sizes */}
                        <div>
                          {(() => {
                            const hasTaggedVariants = p.variants.some(v => v.colorway_id);
                            const showMatrix = p.colorways && p.colorways.length >= 2 && hasTaggedVariants;
                            const uniqueSizes = Array.from(new Set(p.variants.map(v => v.title)));
                            const renderCell = (v: typeof p.variants[number]) => {
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
                                      title="Edit inventory"
                                      className={`text-sm font-display hover:underline ${vIsOut ? 'text-destructive' : vIsLow ? 'text-warning' : 'text-foreground/70'}`}
                                    >
                                      {v.inventory_count}
                                    </button>
                                  )}
                                </div>
                              );
                            };
                            if (showMatrix) {
                              return (
                                <>
                                  <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">
                                    SIZES × COLORS ({p.variants.length})
                                  </p>
                                  <div className="space-y-3">
                                    {p.colorways!.map(cw => (
                                      <div key={cw.id} className="rounded-lg border border-border/40 bg-background/20 p-2.5">
                                        {/* Colorway swatch + name */}
                                        <div className="flex items-center gap-2 mb-2 pl-0.5">
                                          <span
                                            className="w-4 h-4 rounded-full border border-border shrink-0"
                                            style={getSwatchStyle(cw)}
                                          />
                                          <span className="text-[11px] font-display tracking-widest text-foreground uppercase">
                                            {cw.name}
                                          </span>
                                        </div>
                                        {/* Size cells for this colorway */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                          {uniqueSizes.map(size => {
                                            const v = p.variants.find(x => x.title === size && x.colorway_id === cw.id);
                                            if (!v) return <div key={size}></div>;
                                            return renderCell(v);
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              );
                            }
                            // Existing single-row UI for 0-1 colorway products or legacy untagged data
                            return (
                              <>
                                <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">
                                  SIZES ({p.variants.length})
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                  {p.variants.map(renderCell)}
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Weight & Shipping */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">WEIGHT (oz)</p>
                            {inlineEditing[p.id]?.weight ? (
                              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <input
                                  type="number"
                                  value={inlineValues[p.id]?.weight ?? String(p.weight_oz)}
                                  onChange={e => setInlineValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], weight: e.target.value } }))}
                                  className="w-24 px-3 py-1.5 bg-background/40 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      const val = parseFloat(inlineValues[p.id]?.weight);
                                      if (!isNaN(val) && val >= 0) {
                                        setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, weight_oz: val } : pr));
                                        if (p.isDemo) {
                                          queueDemoOverride(p.id, { weight_oz: val });
                                        } else {
                                          setHasUnsavedChanges(true);
                                        }
                                      }
                                      setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], weight: false } }));
                                    }
                                    if (e.key === 'Escape') setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], weight: false } }));
                                  }}
                                />
                                <button onClick={() => {
                                  const val = parseFloat(inlineValues[p.id]?.weight);
                                  if (!isNaN(val) && val >= 0) {
                                    setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, weight_oz: val } : pr));
                                    if (p.isDemo) {
                                      queueDemoOverride(p.id, { weight_oz: val });
                                    } else {
                                      setHasUnsavedChanges(true);
                                    }
                                  }
                                  setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], weight: false } }));
                                }} className="p-1 text-success"><Check className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setInlineValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], weight: String(p.weight_oz) } })); setInlineEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], weight: true } })); }}
                                className="text-sm font-display text-foreground hover:underline"
                              >{p.weight_oz > 0 ? `${p.weight_oz} oz` : <span className="text-muted-foreground italic">Set weight</span>}</button>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">SHIPPING</p>
                            <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-0.5 w-fit" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, shipping_type: 'domestic' } : pr));
                                  if (p.isDemo) {
                                    queueDemoOverride(p.id, { shipping_type: 'domestic' });
                                  } else {
                                    setHasUnsavedChanges(true);
                                  }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md transition-colors ${
                                  p.shipping_type === 'domestic' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground/60 hover:text-foreground/80'
                                }`}
                              >
                                <Home className="w-3 h-3" /> DOMESTIC
                              </button>
                              <button
                                onClick={() => {
                                  setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, shipping_type: 'international' } : pr));
                                  if (p.isDemo) {
                                    queueDemoOverride(p.id, { shipping_type: 'international' });
                                  } else {
                                    setHasUnsavedChanges(true);
                                  }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md transition-colors ${
                                  p.shipping_type === 'international' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground/60 hover:text-foreground/80'
                                }`}
                              >
                                <Globe className="w-3 h-3" /> INTL
                              </button>
                            </div>
                            {p.shipping_type === 'international' && (
                              <div className="mt-2" onClick={e => e.stopPropagation()}>
                                <p className="text-[10px] text-muted-foreground font-display tracking-widest mb-1">HS CODE</p>
                                <HsCodePicker
                                  value={p.hs_code}
                                  onChange={(code) => {
                                    setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, hs_code: code } : pr));
                                    if (p.isDemo) {
                                      queueDemoOverride(p.id, { hs_code: code });
                                    } else {
                                      setHasUnsavedChanges(true);
                                    }
                                  }}
                                  compact
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Waitlist summary — small block linking to full management in the Edit Product modal */}
                        <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                          <div>
                            <p className="text-xs text-muted-foreground font-display tracking-widest mb-1">WAITLIST</p>
                            <p className="text-sm font-display text-foreground">
                              {countWaitlistFor(p.id)} {countWaitlistFor(p.id) === 1 ? 'signup' : 'signups'}
                            </p>
                          </div>
                          {countWaitlistFor(p.id) > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditPanel(p);
                                setTimeout(() => {
                                  editProductWaitlistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 100);
                              }}
                              className="text-[10px] font-display tracking-widest text-foreground/70 hover:text-foreground border border-border/50 hover:border-foreground/40 px-3 py-1.5 rounded transition-colors"
                            >
                              VIEW ALL →
                            </button>
                          )}
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

      {/* Archives link at bottom */}
      {!showArchives && archivedProducts.length > 0 && (
        <div className="mt-12 mb-8 text-center">
          <button
            onClick={() => setShowArchives(true)}
            className="px-6 py-3 text-xs font-display tracking-[0.2em] text-muted-foreground/50 hover:text-muted-foreground border border-foreground/5 hover:border-foreground/15 rounded-xl transition-all"
          >
            ARCHIVES ({archivedProducts.length})
          </button>
        </div>
      )}
      </>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-display tracking-widest text-muted-foreground">PRICE</label>
                  <input type="number" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0" min="0"
                    className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-display tracking-widest text-muted-foreground">COMPARE AT PRICE</label>
                  <input type="number" value={addForm.comparePrice} onChange={e => setAddForm(f => ({ ...f, comparePrice: e.target.value }))}
                    placeholder="Optional" min="0"
                    className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              {/* Category type */}
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground mb-2 block">CATEGORY</label>
                <div className="flex flex-wrap gap-2">
                  {allCategoryOptions.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setAddProductType((addProductType === cat ? '' : cat) as ProductType)}
                      className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                        addProductType === cat
                          ? 'bg-foreground/10 text-foreground border-foreground/20'
                          : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground mb-2 block">GENDER</label>
                <div className="flex flex-wrap gap-2">
                  {allGenders.filter(g => !hiddenGenders.includes(g)).map(g => (
                    <button
                      key={g}
                      onClick={() => setAddGender(g)}
                      className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                        addGender === g
                          ? 'bg-foreground/10 text-foreground border-foreground/20'
                          : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
                      }`}
                    >
                      {g.toUpperCase()}
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

              {/* Colorways management */}
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground mb-2 block">COLORS</label>
                <ColorwayManager
                  colorways={addColorways}
                  onChange={setAddColorways}
                />
              </div>

              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">DESCRIPTION</label>
                <textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  placeholder="Product description..."
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>

              {/* Weight & Shipping */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-display tracking-widest text-muted-foreground">WEIGHT (oz)</label>
                  <input type="number" value={addWeight} onChange={e => setAddWeight(e.target.value)}
                    placeholder="0" min="0"
                    className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-display tracking-widest text-muted-foreground mb-1 block">SHIPPING</label>
                  <div className="flex items-center gap-1 bg-background/30 border border-border/50 rounded-lg p-0.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setAddShippingType('domestic')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-display tracking-wider rounded-md transition-colors flex-1 justify-center ${
                        addShippingType === 'domestic' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground/60 hover:text-foreground/80'
                      }`}
                    >
                      <Home className="w-3 h-3" /> DOMESTIC
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddShippingType('international')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-display tracking-wider rounded-md transition-colors flex-1 justify-center ${
                        addShippingType === 'international' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground/60 hover:text-foreground/80'
                      }`}
                    >
                      <Globe className="w-3 h-3" /> INTL
                    </button>
                  </div>
                </div>
              </div>
              {addShippingType === 'international' && (
                <div>
                  <label className="text-xs font-display tracking-widest text-muted-foreground">HS CODE</label>
                  <HsCodePicker value={addHsCode} onChange={setAddHsCode} />
                </div>
              )}

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

              {/* Storefront visibility */}
              <div className="flex items-center justify-between py-2 px-1">
                <div>
                  <p className="text-xs font-display tracking-widest text-muted-foreground">PUBLISH TO STOREFRONT</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Make this product visible to customers</p>
                </div>
                <Switch checked={addPublishToStorefront} onCheckedChange={setAddPublishToStorefront} />
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
                  {allCategoryOptions.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        const newCat = (editingProduct.product_type === cat ? '' : cat) as ProductType;
                        setEditingProduct({ ...editingProduct, product_type: newCat });
                        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, product_type: newCat } : p));
                      }}
                      className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                        editingProduct.product_type === cat
                          ? 'bg-foreground/10 text-foreground border-foreground/20'
                          : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground mb-2 block">GENDER</label>
                <div className="flex flex-wrap gap-2">
                  {allGenders.filter(g => !hiddenGenders.includes(g)).map(g => (
                    <button
                      key={g}
                      onClick={() => {
                        setEditingProduct({ ...editingProduct, gender: g });
                        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, gender: g } : p));
                        setHasUnsavedChanges(true);
                      }}
                      className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                        editingProduct.gender === g
                          ? 'bg-foreground/10 text-foreground border-foreground/20'
                          : 'bg-transparent text-muted-foreground/60 border-border/50 hover:bg-secondary/50'
                      }`}
                    >
                      {g.toUpperCase()}
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
                  <label className="text-xs font-display tracking-widest text-muted-foreground">COMPARE AT PRICE</label>
                  <input type="number" value={editForm.comparePrice || ''} onChange={e => setEditForm(f => ({ ...f, comparePrice: e.target.value }))}
                    placeholder="Optional" min="0"
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

              {/* Weight & Shipping */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-display tracking-widest text-muted-foreground">WEIGHT (oz)</label>
                  <input type="number" value={editingProduct.weight_oz} onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setEditingProduct({ ...editingProduct, weight_oz: val });
                    setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, weight_oz: val } : p));
                  }}
                    placeholder="0" min="0"
                    className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-display tracking-widest text-muted-foreground mb-1 block">SHIPPING</label>
                  <div className="flex items-center gap-1 bg-background/30 border border-border/50 rounded-lg p-0.5 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct({ ...editingProduct, shipping_type: 'domestic' });
                        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, shipping_type: 'domestic' as const } : p));
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-display tracking-wider rounded-md transition-colors flex-1 justify-center ${
                        editingProduct.shipping_type === 'domestic' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground/60 hover:text-foreground/80'
                      }`}
                    >
                      <Home className="w-3 h-3" /> DOMESTIC
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct({ ...editingProduct, shipping_type: 'international' });
                        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, shipping_type: 'international' as const } : p));
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-display tracking-wider rounded-md transition-colors flex-1 justify-center ${
                        editingProduct.shipping_type === 'international' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground/60 hover:text-foreground/80'
                      }`}
                    >
                      <Globe className="w-3 h-3" /> INTL
                    </button>
                  </div>
                </div>
              </div>
              {editingProduct.shipping_type === 'international' && (
                <div>
                  <label className="text-xs font-display tracking-widest text-muted-foreground">HS CODE</label>
                  <HsCodePicker
                    value={editingProduct.hs_code}
                    onChange={(code) => {
                      setEditingProduct({ ...editingProduct, hs_code: code });
                      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, hs_code: code } : p));
                    }}
                  />
                </div>
              )}

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

              {/* Colorways management */}
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground mb-2 block">COLORS</label>
                <ColorwayManager
                  colorways={editingProduct.colorways || []}
                  onChange={(next) => {
                    setEditingProduct({ ...editingProduct, colorways: next });
                    setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, colorways: next } : p));
                  }}
                />
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

              {/* Waitlist — full management table */}
              <div ref={editProductWaitlistRef} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-display tracking-widest text-muted-foreground">WAITLIST</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {getWaitlistForProduct(editingProduct.id).length} {getWaitlistForProduct(editingProduct.id).length === 1 ? 'signup' : 'signups'}
                  </p>
                </div>
                <WaitlistTable
                  signups={getWaitlistForProduct(editingProduct.id)}
                  onMarkFulfilled={markWaitlistFulfilled}
                  onDelete={deleteWaitlistSignup}
                />
              </div>

              {/* Storefront visibility */}
              <div className="flex items-center justify-between py-2 px-1">
                <div>
                  <p className="text-xs font-display tracking-widest text-muted-foreground">PUBLISH TO STOREFRONT</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Make this product visible to customers</p>
                </div>
                <Switch
                  checked={editingProduct.status === 'active'}
                  onCheckedChange={(checked) => {
                    const newStatus = checked ? 'active' : 'draft';
                    setEditingProduct({ ...editingProduct, status: newStatus as 'active' | 'draft' | 'archived' });
                    setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, status: newStatus as 'active' | 'draft' | 'archived' } : p));
                  }}
                />
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

      {/* Confirmation dialog for delete/archive */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="liquid-glass rounded-xl w-full max-w-sm p-6 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-display text-lg font-bold">
                {confirmAction.type === 'delete' ? 'Delete Product?' : 'Archive Product?'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {confirmAction.type === 'delete' 
                  ? `Are you sure you want to delete "${confirmAction.product.title}"? This cannot be undone.`
                  : `Are you sure you want to archive "${confirmAction.product.title}"? You can restore it later from the Archives.`
                }
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    if (confirmAction.type === 'delete') {
                      performDelete(confirmAction.product);
                    } else {
                      performArchive(confirmAction.product);
                    }
                    setConfirmAction(null);
                  }}
                  className={`flex-1 py-2.5 font-display text-sm tracking-wider rounded-lg transition-opacity ${
                    confirmAction.type === 'delete'
                      ? 'bg-destructive text-destructive-foreground hover:opacity-90'
                      : 'bg-amber-500 text-white hover:opacity-90'
                  }`}
                >
                  {confirmAction.type === 'delete' ? 'YES, DELETE' : 'YES, ARCHIVE'}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-6 py-2.5 border border-border rounded-lg text-sm hover:bg-secondary transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}