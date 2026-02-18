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
  const [aleEnabled, setAleEnabled] = useState(true);
  const [aleIntensity, setAleIntensity] = useState('medium');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
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

      const { data: config } = await supabase.from('store_config').select('*').eq('merchant_id', uid).single();
      if (config) {
        setAleEnabled(config.ale_enabled);
        setAleIntensity(config.ale_intensity);
        setLowStockThreshold(config.low_stock_threshold);
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

    // Upsert store config
    const { error: configErr } = await supabase.from('store_config').upsert({
      merchant_id: uid,
      ale_enabled: aleEnabled,
      ale_intensity: aleIntensity,
      low_stock_threshold: lowStockThreshold,
    }, { onConflict: 'merchant_id' });

    if (merchantErr || configErr) {
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
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-wider rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
          <Save className="w-4 h-4" /> {saving ? 'SAVING...' : 'SAVE'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-3 rounded-lg text-sm font-display ${message.includes('Error') ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'}`}>
          {message}
        </div>
      )}

      {/* Store Info */}
      <section className="mb-8">
        <h2 className="font-display text-sm font-semibold tracking-wider mb-4">STORE INFO</h2>
        <div className="space-y-4 liquid-glass rounded-xl p-6">
          <div>
            <label className="text-xs font-display tracking-widest text-muted-foreground">STORE NAME</label>
            <input value={storeName} onChange={e => setStoreName(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-display tracking-widest text-muted-foreground">STORE SLUG</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">/store/</span>
              <input value={storeSlug} onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="text-xs font-display tracking-widest text-muted-foreground">TAGLINE</label>
            <input value={storeTagline} onChange={e => setStoreTagline(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-display tracking-widest text-muted-foreground">DESCRIPTION</label>
            <textarea value={storeDescription} onChange={e => setStoreDescription(e.target.value)} rows={3}
              className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div>
            <label className="text-xs font-display tracking-widest text-muted-foreground">CATEGORY</label>
            <select value={storeCategory} onChange={e => setStoreCategory(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none">
              <option value="">Select...</option>
              <option value="fashion">Fashion</option>
              <option value="beauty">Beauty</option>
              <option value="supplements">Supplements</option>
              <option value="home">Home Goods</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
      </section>


      {/* ALE Settings */}
      <section className="mb-8">
        <h2 className="font-display text-sm font-semibold tracking-wider mb-4">ADAPTIVE LAYOUT ENGINE</h2>
        <div className="space-y-4 liquid-glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-sm font-medium">Enable ALE</p>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically adjust grid based on shopper behavior</p>
            </div>
            <button onClick={() => setAleEnabled(!aleEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative ${aleEnabled ? 'bg-success' : 'bg-muted'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-foreground rounded-full transition-transform ${aleEnabled ? 'left-[26px]' : 'left-0.5'}`} />
            </button>
          </div>
          {aleEnabled && (
            <div>
              <label className="text-xs font-display tracking-widest text-muted-foreground">INTENSITY</label>
              <div className="flex gap-2 mt-2">
                {['low', 'medium', 'high'].map(level => (
                  <button key={level} onClick={() => setAleIntensity(level)}
                    className={`flex-1 py-2 text-sm font-display rounded-lg border transition-all ${
                      aleIntensity === level ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-muted-foreground'
                    }`}>
                    {level.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-display tracking-widest text-muted-foreground">LOW STOCK THRESHOLD</label>
            <input type="number" value={lowStockThreshold} onChange={e => setLowStockThreshold(parseInt(e.target.value) || 5)}
              className="w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </section>

      {/* Payments */}
      <section>
        <h2 className="font-display text-sm font-semibold tracking-wider mb-4">PAYMENTS</h2>
        <div className="liquid-glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-sm font-medium">Stripe Connect</p>
              <p className="text-xs text-muted-foreground mt-0.5">Connect your Stripe account to accept payments</p>
            </div>
            <button className="px-4 py-2 bg-secondary border border-border rounded-lg text-sm font-display tracking-wider hover:bg-muted transition-colors">
              CONNECT STRIPE
            </button>
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="mt-8">
        <h2 className="font-display text-sm font-semibold tracking-wider mb-4">ACCOUNT</h2>
        <div className="liquid-glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-sm font-medium">Sign Out</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sign out of your merchant account</p>
            </div>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }}
              className="px-4 py-2 bg-secondary border border-border rounded-lg text-sm font-display tracking-wider hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              SIGN OUT
            </button>
          </div>
        </div>
      </section>

      <p className="text-center text-[10px] text-muted-foreground/50 font-display tracking-widest py-6">Version 1.01</p>
    </div>
  );
}
