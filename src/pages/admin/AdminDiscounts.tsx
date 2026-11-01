import { useState, useEffect } from 'react';
import { supabase } from '@/lib/demo/client';
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, Tag, Percent, DollarSign, Truck } from 'lucide-react';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  minimum_spend: number;
  max_uses: number | null;
  times_used: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const DISCOUNT_TYPE_LABELS: Record<string, { label: string; icon: typeof Percent }> = {
  percentage: { label: 'Percentage Off', icon: Percent },
  fixed: { label: 'Fixed Amount Off', icon: DollarSign },
  free_shipping: { label: 'Free Shipping', icon: Truck },
};

export default function AdminDiscounts() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCode, setEditCode] = useState<DiscountCode | null>(null);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('percentage');
  const [formValue, setFormValue] = useState('');
  const [formMinSpend, setFormMinSpend] = useState('');
  const [formMaxUses, setFormMaxUses] = useState('');
  const [formStartsAt, setFormStartsAt] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markDirty, markClean, BlockerDialog } = useUnsavedChanges();

  // Mark dirty when form is open with changes
  useEffect(() => { if (showForm) markDirty(); else markClean(); }, [showForm, markDirty, markClean]);

  useEffect(() => {
    fetchCodes();
  }, []);

  async function fetchCodes() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('merchant_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) setCodes(data as DiscountCode[]);
    setLoading(false);
  }

  function openCreate() {
    setEditCode(null);
    setFormCode('');
    setFormDescription('');
    setFormType('percentage');
    setFormValue('');
    setFormMinSpend('');
    setFormMaxUses('');
    setFormStartsAt('');
    setFormExpiresAt('');
    setFormActive(true);
    setShowForm(true);
  }

  function openEdit(dc: DiscountCode) {
    setEditCode(dc);
    setFormCode(dc.code);
    setFormDescription(dc.description || '');
    setFormType(dc.discount_type);
    setFormValue(String(dc.discount_value));
    setFormMinSpend(dc.minimum_spend ? String(dc.minimum_spend) : '');
    setFormMaxUses(dc.max_uses ? String(dc.max_uses) : '');
    setFormStartsAt(dc.starts_at ? dc.starts_at.slice(0, 16) : '');
    setFormExpiresAt(dc.expires_at ? dc.expires_at.slice(0, 16) : '');
    setFormActive(dc.is_active);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = {
      merchant_id: session.user.id,
      code: formCode.toUpperCase().trim(),
      description: formDescription || null,
      discount_type: formType,
      discount_value: parseFloat(formValue) || 0,
      minimum_spend: parseFloat(formMinSpend) || 0,
      max_uses: formMaxUses ? parseInt(formMaxUses) : null,
      starts_at: formStartsAt || null,
      expires_at: formExpiresAt || null,
      is_active: formActive,
    };

    if (editCode) {
      await supabase.from('discount_codes').update(payload).eq('id', editCode.id);
    } else {
      await supabase.from('discount_codes').insert(payload);
    }

    setSaving(false);
    setShowForm(false);
    fetchCodes();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this discount code? This cannot be undone.')) return;
    await supabase.from('discount_codes').delete().eq('id', id);
    fetchCodes();
  }

  async function handleToggleActive(dc: DiscountCode) {
    await supabase.from('discount_codes').update({ is_active: !dc.is_active }).eq('id', dc.id);
    fetchCodes();
  }

  const filtered = codes.filter(dc => {
    if (search && !dc.code.toLowerCase().includes(search.toLowerCase()) && !(dc.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function formatType(dc: DiscountCode) {
    if (dc.discount_type === 'percentage') return `${dc.discount_value}% off`;
    if (dc.discount_type === 'fixed') return `$${dc.discount_value} off`;
    return 'Free shipping';
  }

  function isExpired(dc: DiscountCode) {
    if (!dc.expires_at) return false;
    return new Date(dc.expires_at) < new Date();
  }

  function isMaxedOut(dc: DiscountCode) {
    if (!dc.max_uses) return false;
    return dc.times_used >= dc.max_uses;
  }

  return (
    <>
    <BlockerDialog />
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Discount Codes</h1>
        <button onClick={openCreate}
          className="px-4 py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
          <Plus className="w-4 h-4" /> CREATE CODE
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search codes..."
            className="w-full pl-10 pr-4 py-2.5 liquid-glass rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-8" onClick={() => setShowForm(false)}>
          <div className="liquid-glass rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-lg font-bold">{editCode ? 'Edit Discount Code' : 'New Discount Code'}</h2>

            <div>
              <label className="text-xs font-display tracking-widest text-muted-foreground">CODE</label>
              <input value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase())} placeholder="e.g. SUMMER20"
                className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-ring uppercase" />
            </div>

            <div>
              <label className="text-xs font-display tracking-widest text-muted-foreground">DESCRIPTION (OPTIONAL)</label>
              <input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Summer sale 20% off"
                className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div>
              <label className="text-xs font-display tracking-widest text-muted-foreground">DISCOUNT TYPE</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {Object.entries(DISCOUNT_TYPE_LABELS).map(([key, { label, icon: Icon }]) => (
                  <button key={key} onClick={() => setFormType(key)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-display tracking-wider transition-colors ${
                      formType === key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {formType !== 'free_shipping' && (
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">
                  {formType === 'percentage' ? 'PERCENTAGE (%)' : 'AMOUNT ($)'}
                </label>
                <input type="number" value={formValue} onChange={e => setFormValue(e.target.value)}
                  placeholder={formType === 'percentage' ? 'e.g. 20' : 'e.g. 15'}
                  min="0" max={formType === 'percentage' ? '100' : undefined}
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">MINIMUM SPEND ($)</label>
                <input type="number" value={formMinSpend} onChange={e => setFormMinSpend(e.target.value)}
                  placeholder="0 = no minimum" min="0"
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">MAX USES</label>
                <input type="number" value={formMaxUses} onChange={e => setFormMaxUses(e.target.value)}
                  placeholder="Unlimited" min="1"
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">STARTS AT</label>
                <input type="datetime-local" value={formStartsAt} onChange={e => setFormStartsAt(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">EXPIRES AT</label>
                <input type="datetime-local" value={formExpiresAt} onChange={e => setFormExpiresAt(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-display tracking-widest text-muted-foreground">ACTIVE</span>
              <button onClick={() => setFormActive(!formActive)}
                className={`p-1 rounded transition-colors ${formActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {formActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving || !formCode || (formType !== 'free_shipping' && !formValue)}
                className="flex-1 py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? 'SAVING...' : editCode ? 'UPDATE' : 'CREATE'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-6 py-2.5 border border-border rounded-lg text-sm hover:bg-secondary transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Codes table */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground font-display tracking-wider animate-pulse">LOADING...</div>
      ) : filtered.length === 0 ? (
        <div className="liquid-glass rounded-xl p-12 text-center">
          <Tag className="w-10 h-10 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground font-display tracking-wider text-sm mb-4">
            {codes.length === 0 ? 'No discount codes yet — create your first one' : 'No codes match your search'}
          </p>
          {codes.length === 0 && (
            <button onClick={openCreate}
              className="px-4 py-2 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-lg hover:opacity-90">
              CREATE FIRST CODE
            </button>
          )}
        </div>
      ) : (
        <div className="liquid-glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">CODE</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">TYPE</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">VALUE</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">MIN SPEND</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">USAGE</th>
                <th className="text-left px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">STATUS</th>
                <th className="text-right px-4 py-3 text-xs font-display tracking-widest text-muted-foreground">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(dc => {
                const expired = isExpired(dc);
                const maxed = isMaxedOut(dc);
                const statusLabel = !dc.is_active ? 'INACTIVE' : expired ? 'EXPIRED' : maxed ? 'MAXED OUT' : 'ACTIVE';
                const statusColor = !dc.is_active ? 'bg-muted text-muted-foreground' : expired || maxed ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success';

                return (
                  <tr key={dc.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => openEdit(dc)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-mono text-sm font-medium tracking-wider">{dc.code}</span>
                      </div>
                      {dc.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 ml-5.5">{dc.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                      {DISCOUNT_TYPE_LABELS[dc.discount_type]?.label || dc.discount_type}
                    </td>
                    <td className="px-4 py-3 font-display text-sm">{formatType(dc)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {dc.minimum_spend > 0 ? `$${dc.minimum_spend}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {dc.times_used}{dc.max_uses ? ` / ${dc.max_uses}` : ' / ∞'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-display px-2 py-1 rounded ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleToggleActive(dc); }}
                          className="p-1.5 hover:bg-secondary rounded transition-colors" title={dc.is_active ? 'Deactivate' : 'Activate'}>
                          {dc.is_active ? <ToggleRight className="w-3.5 h-3.5 text-primary" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openEdit(dc); }} className="p-1.5 hover:bg-secondary rounded transition-colors" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(dc.id); }} className="p-1.5 hover:bg-destructive/20 rounded transition-colors text-destructive" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
  );
}
