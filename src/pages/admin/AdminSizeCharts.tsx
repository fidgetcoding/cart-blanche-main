import { useEffect, useState } from 'react';
import { supabase } from '@/lib/demo/client';
import { Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import {
  CHART_CATEGORIES,
  CATEGORY_LABEL,
  DEFAULT_CHARTS,
  fetchAllSizeCharts,
  upsertSizeChart,
  type SizeChart,
} from '@/lib/size-charts';
import { toast } from 'sonner';

export default function AdminSizeCharts() {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [charts, setCharts] = useState<Record<string, SizeChart>>({});
  const [activeCat, setActiveCat] = useState<string>('shirt');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setMerchantId(session.user.id);
      const all = await fetchAllSizeCharts(session.user.id);
      setCharts(all);
      setLoading(false);
    })();
  }, []);

  const chart = charts[activeCat];

  const update = (next: Partial<SizeChart>) => {
    setCharts(c => ({ ...c, [activeCat]: { ...c[activeCat], ...next } }));
  };

  const updateHeader = (i: number, value: string) => {
    const headers = [...chart.headers];
    headers[i] = value;
    update({ headers });
  };

  const updateCell = (r: number, c: number, value: string) => {
    const rows = chart.rows.map(row => [...row]);
    rows[r][c] = value;
    update({ rows });
  };

  const addRow = () => {
    const rows = [...chart.rows, chart.headers.map(() => '')];
    update({ rows });
  };

  const removeRow = (i: number) => {
    update({ rows: chart.rows.filter((_, idx) => idx !== i) });
  };

  const addColumn = () => {
    update({
      headers: [...chart.headers, 'New'],
      rows: chart.rows.map(r => [...r, '']),
    });
  };

  const removeColumn = (i: number) => {
    if (chart.headers.length <= 2) return;
    update({
      headers: chart.headers.filter((_, idx) => idx !== i),
      rows: chart.rows.map(r => r.filter((_, idx) => idx !== i)),
    });
  };

  const resetToDefault = () => {
    update({ ...DEFAULT_CHARTS[activeCat] });
  };

  const save = async () => {
    if (!merchantId || !chart) return;
    setSaving(true);
    try {
      await upsertSizeChart(chart, merchantId);
      toast.success(`Saved ${CATEGORY_LABEL[activeCat]} chart`);
    } catch (e) {
      toast.error('Failed to save chart');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !chart) {
    // Keyed so the page replaces it rather than reusing its element, which the browser would
    // count as this line narrowing and moving when the charts arrive.
    return (
      <div key="loading" className="p-6 text-xs font-display tracking-widest text-muted-foreground animate-pulse">
        LOADING SIZE CHARTS...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-foreground">SIZE CHARTS</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wider">
            Manage per-category size charts shown on product pages.
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-3">
        {CHART_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`px-3 py-1.5 text-[11px] font-display tracking-wider rounded-md border transition-colors ${
              activeCat === cat
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-foreground/70 hover:text-foreground hover:border-foreground/60'
            }`}
          >
            {CATEGORY_LABEL[cat].toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart name + unit */}
      <div className="flex items-end gap-4 mb-4">
        <div className="flex-1">
          <label className="text-[10px] font-display tracking-widest text-muted-foreground">CHART NAME</label>
          <input
            value={chart.name}
            onChange={e => update({ name: e.target.value })}
            className="w-full mt-1 px-3 py-2 bg-secondary/40 border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-foreground/60"
          />
        </div>
        <div className="w-32">
          <label className="text-[10px] font-display tracking-widest text-muted-foreground">UNIT</label>
          <select
            value={chart.unit}
            onChange={e => update({ unit: e.target.value as 'in' | 'cm' })}
            className="w-full mt-1 px-3 py-2 bg-secondary/40 border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-foreground/60"
          >
            <option value="in">Inches</option>
            <option value="cm">Centimeters</option>
          </select>
        </div>
      </div>

      {/* Editable table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr>
                {chart.headers.map((h, i) => (
                  <th key={i} className="p-2 border-r border-border last:border-r-0">
                    <div className="flex items-center gap-1">
                      <input
                        value={h}
                        onChange={e => updateHeader(i, e.target.value)}
                        className="w-full px-2 py-1 bg-background border border-border rounded text-[11px] font-display tracking-wider uppercase text-foreground focus:outline-none focus:border-foreground/60"
                      />
                      {chart.headers.length > 2 && (
                        <button
                          onClick={() => removeColumn(i)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove column"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row, r) => (
                <tr key={r} className="border-t border-border">
                  {row.map((cell, c) => (
                    <td key={c} className="p-2 border-r border-border last:border-r-0">
                      <input
                        value={cell}
                        onChange={e => updateCell(r, c, e.target.value)}
                        className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground/60"
                      />
                    </td>
                  ))}
                  <td className="p-2">
                    <button
                      onClick={() => removeRow(r)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 p-2 border-t border-border bg-secondary/20">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-display tracking-wider rounded-md border border-border hover:border-foreground/60 text-foreground transition-colors"
          >
            <Plus className="w-3 h-3" />
            ROW
          </button>
          <button
            onClick={addColumn}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-display tracking-wider rounded-md border border-border hover:border-foreground/60 text-foreground transition-colors"
          >
            <Plus className="w-3 h-3" />
            COLUMN
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={resetToDefault}
          className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-display tracking-wider rounded-md border border-border hover:border-foreground/60 text-foreground transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          RESET TO DEFAULT
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2 text-[11px] font-display tracking-wider rounded-md bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'SAVING...' : 'SAVE CHART'}
        </button>
      </div>
    </div>
  );
}
