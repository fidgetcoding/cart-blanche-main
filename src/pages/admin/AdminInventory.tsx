import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Check } from 'lucide-react';
import { DEMO_PRODUCTS } from '@/data/demo-data';

interface VariantRow {
  id: string;
  product_title: string;
  variant_title: string;
  sku: string | null;
  inventory_count: number;
  product_id: string;
  isDemo?: boolean;
}

function buildDemoRows(): VariantRow[] {
  return DEMO_PRODUCTS.flatMap(p =>
    p.variants.map(v => ({
      id: v.id,
      product_title: p.title,
      variant_title: v.title,
      sku: null,
      inventory_count: v.inventory_count,
      product_id: p.id,
      isDemo: true,
    }))
  );
}

export default function AdminInventory() {
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [lowStockThreshold] = useState(5);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    const { data: { session } } = await supabase.auth.getSession();

    // Try DB first if logged in
    if (session) {
      const { data: products } = await supabase.from('products').select('id, title')
        .eq('merchant_id', session.user.id);

      if (products && products.length > 0) {
        const productMap = new Map(products.map(p => [p.id, p.title]));
        const productIds = products.map(p => p.id);

        const { data: variants } = await supabase.from('product_variants').select('*')
          .in('product_id', productIds).order('created_at');

        if (variants && variants.length > 0) {
          setRows(variants.map(v => ({
            id: v.id,
            product_title: productMap.get(v.product_id) || 'Unknown',
            variant_title: v.title,
            sku: v.sku,
            inventory_count: v.inventory_count ?? 0,
            product_id: v.product_id,
          })));
          setLoading(false);
          return;
        }
      }
    }

    // Fall back to demo data
    setRows(buildDemoRows());
    setLoading(false);
  }

  async function saveStock(id: string) {
    const count = parseInt(editValue);
    if (isNaN(count) || count < 0) return;
    await supabase.from('product_variants').update({ inventory_count: count }).eq('id', id);
    setEditingId(null);
    fetchInventory();
  }

  const lowStockCount = rows.filter(r => r.inventory_count > 0 && r.inventory_count <= lowStockThreshold).length;
  const outOfStockCount = rows.filter(r => r.inventory_count === 0).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Inventory</h1>
        <div className="flex gap-3">
          {lowStockCount > 0 && (
            <span className="text-xs font-display px-3 py-1.5 bg-warning/20 text-warning rounded-lg flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> {lowStockCount} LOW STOCK
            </span>
          )}
          {outOfStockCount > 0 && (
            <span className="text-xs font-display px-3 py-1.5 bg-destructive/20 text-destructive rounded-lg">
              {outOfStockCount} OUT OF STOCK
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground font-display tracking-wider animate-pulse">LOADING...</div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground font-display tracking-wider text-sm">
            No variants found — add products with variants to manage inventory
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">PRODUCT</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">VARIANT</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">STOCK</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isLow = r.inventory_count > 0 && r.inventory_count <= lowStockThreshold;
                const isOut = r.inventory_count === 0;
                return (
                  <tr key={r.id} className={`border-b border-border/50 transition-colors ${isOut ? 'bg-destructive/5' : isLow ? 'bg-warning/5' : 'hover:bg-secondary/30'}`}>
                    <td className="px-4 py-3 font-display text-sm">{r.product_title}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.variant_title}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{r.sku || '—'}</td>
                    <td className="px-4 py-3">
                      {editingId === r.id ? (
                        <div className="flex items-center gap-2">
                          <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                            className="w-20 px-2 py-1 bg-secondary border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            onKeyDown={e => { if (e.key === 'Enter') saveStock(r.id); if (e.key === 'Escape') setEditingId(null); }}
                            autoFocus />
                          <button onClick={() => saveStock(r.id)} className="p-1 text-success hover:bg-success/20 rounded">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(r.id); setEditValue(String(r.inventory_count)); }}
                          className="font-display text-sm hover:bg-secondary px-2 py-1 rounded transition-colors">
                          {r.inventory_count}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isOut ? (
                        <span className="text-xs font-display px-2 py-1 rounded bg-destructive/20 text-destructive">OUT OF STOCK</span>
                      ) : isLow ? (
                        <span className="text-xs font-display px-2 py-1 rounded bg-warning/20 text-warning flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> LOW
                        </span>
                      ) : (
                        <span className="text-xs font-display px-2 py-1 rounded bg-success/20 text-success">IN STOCK</span>
                      )}
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
