import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Save, LogOut } from 'lucide-react';

export default function AdminSettings() {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeTagline, setStoreTagline] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;

      const { data: merchant } = await supabase.from('merchants').select('*').eq('id', uid).single();
      if (merchant) {
        setStoreName(merchant.store_name || '');
        setStoreSlug(merchant.store_slug || '');
        setStoreDescription(merchant.store_description || '');
        setStoreTagline(merchant.store_tagline || '');
        setStoreCategory(merchant.store_category || '');
        setContactEmail(merchant.email || '');
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;

    const { error: merchantErr } = await supabase.from('merchants').update({
      store_name: storeName,
      store_slug: storeSlug,
      store_description: storeDescription,
      store_tagline: storeTagline,
      store_category: storeCategory || null,
    }).eq('id', uid);

    if (merchantErr) {
      setMessage('Error saving settings');
    } else {
      setMessage('Settings saved!');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground font-display tracking-wider animate-pulse">LOADING...</div>;
  }

  return (
    <div className="p-5 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl font-bold">Settings</h1>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground font-display text-xs tracking-wider rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
          <Save className="w-3.5 h-3.5" /> {saving ? 'SAVING...' : 'SAVE'}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-2.5 rounded-lg text-xs font-display ${message.includes('Error') ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'}`}>
          {message}
        </div>
      )}

      {/* Store Info */}
      <section className="mb-5">
        <h2 className="font-display text-[11px] font-semibold tracking-wider mb-2.5">STORE INFO</h2>
        <div className="space-y-3 liquid-glass rounded-xl p-4">
          <div>
            <label className="text-[10px] font-display tracking-widest text-muted-foreground">STORE NAME</label>
            <input value={storeName} onChange={e => setStoreName(e.target.value)}
              className="w-full mt-0.5 px-3 py-2 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-[10px] font-display tracking-widest text-muted-foreground">STORE SLUG</label>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">/store/</span>
              <input value={storeSlug} onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 px-3 py-2 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-display tracking-widest text-muted-foreground">TAGLINE</label>
              <input value={storeTagline} onChange={e => setStoreTagline(e.target.value)}
                className="w-full mt-0.5 px-3 py-2 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-[10px] font-display tracking-widest text-muted-foreground">CATEGORY</label>
              <select value={storeCategory} onChange={e => setStoreCategory(e.target.value)}
                className="w-full mt-0.5 px-3 py-2 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none">
                <option value="">Select...</option>
                <option value="fashion">Fashion</option>
                <option value="beauty">Beauty</option>
                <option value="supplements">Supplements</option>
                <option value="home">Home Goods</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-display tracking-widest text-muted-foreground">DESCRIPTION</label>
            <textarea value={storeDescription} onChange={e => setStoreDescription(e.target.value)} rows={2}
              className="w-full mt-0.5 px-3 py-2 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>
      </section>



      {/* Payments & Account side by side */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <section>
          <h2 className="font-display text-[11px] font-semibold tracking-wider mb-2.5">PAYMENTS</h2>
          <div className="liquid-glass rounded-xl p-4">
            <p className="font-display text-xs font-medium">Stripe Connect</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 mb-2.5">Accept payments via Stripe</p>
            <button className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-display tracking-wider hover:bg-muted transition-colors">
              CONNECT STRIPE
            </button>
          </div>
        </section>

        <section>
          <h2 className="font-display text-[11px] font-semibold tracking-wider mb-2.5">ACCOUNT</h2>
          <div className="liquid-glass rounded-xl p-4">
            <p className="font-display text-xs font-medium">Sign Out</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 mb-2.5">Sign out of merchant account</p>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-display tracking-wider hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" /> SIGN OUT
            </button>
          </div>
        </section>
      </div>

      <p className="text-center text-[10px] text-muted-foreground/50 font-display tracking-widest pb-4"><p className="text-center text-[10px] text-muted-foreground/50 font-display tracking-widest pb-4">Version 1.31</p></p>
    </div>
  );
}
