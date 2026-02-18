import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Save, Layers } from 'lucide-react';

interface StylingRule {
  anchor_category: string;
  suggested_categories: string[];
  orientation: 'horizontal' | 'vertical';
}

interface StylingGuide {
  id: string;
  name: string;
  rules: StylingRule[];
}

const AVAILABLE_CATEGORIES = ['outerwear', 'streetwear', 'essentials', 'new-arrivals'];

export default function AdminStylingGuide() {
  const [guide, setGuide] = useState<StylingGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guideName, setGuideName] = useState('Default Guide');
  const [rules, setRules] = useState<StylingRule[]>([
    { anchor_category: 'outerwear', suggested_categories: ['streetwear', 'essentials'], orientation: 'horizontal' },
    { anchor_category: 'streetwear', suggested_categories: ['outerwear', 'essentials', 'new-arrivals'], orientation: 'horizontal' },
    { anchor_category: 'essentials', suggested_categories: ['outerwear', 'streetwear'], orientation: 'horizontal' },
    { anchor_category: 'new-arrivals', suggested_categories: ['outerwear', 'streetwear', 'essentials'], orientation: 'horizontal' },
  ]);

  useEffect(() => {
    loadGuide();
  }, []);

  const loadGuide = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('styling_guides')
      .select('*')
      .eq('merchant_id', user.id)
      .limit(1)
      .maybeSingle();

    if (data) {
      const g = data as unknown as StylingGuide;
      setGuide(g);
      setGuideName(g.name);
      setRules(g.rules);
    }
    setLoading(false);
  };

  const saveGuide = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (guide) {
      await supabase
        .from('styling_guides')
        .update({ name: guideName, rules: rules as unknown as any })
        .eq('id', guide.id);
    } else {
      await supabase
        .from('styling_guides')
        .insert({ merchant_id: user.id, name: guideName, rules: rules as unknown as any });
    }

    await loadGuide();
    setSaving(false);
  };

  const addRule = () => {
    setRules([...rules, { anchor_category: '', suggested_categories: [], orientation: 'horizontal' }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof StylingRule, value: any) => {
    setRules(rules.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const toggleSuggestedCategory = (ruleIndex: number, category: string) => {
    const rule = rules[ruleIndex];
    const current = rule.suggested_categories;
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    updateRule(ruleIndex, 'suggested_categories', updated);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <span className="font-display text-muted-foreground tracking-widest animate-pulse text-sm">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-muted-foreground" />
          <h1 className="font-display text-lg font-bold tracking-wide">STYLING GUIDE</h1>
        </div>
        <button
          onClick={saveGuide}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-display text-xs tracking-wider rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'SAVING...' : 'SAVE GUIDE'}
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Configure how Style Kit suggests pairings for your customers. Define which categories complement each other and how the split-screen should orient.
      </p>

      {/* Guide name */}
      <div className="mb-6">
        <label className="text-[10px] font-display tracking-widest text-muted-foreground mb-1 block">
          GUIDE NAME
        </label>
        <input
          type="text"
          value={guideName}
          onChange={(e) => setGuideName(e.target.value)}
          className="w-full max-w-sm bg-secondary border border-border rounded-md px-3 py-2 text-sm font-display focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Rules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xs tracking-widest text-muted-foreground">PAIRING RULES</h2>
          <button
            onClick={addRule}
            className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-md text-[10px] font-display tracking-wider hover:bg-secondary transition-colors"
          >
            <Plus className="w-3 h-3" />
            ADD RULE
          </button>
        </div>

        {rules.map((rule, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                {/* Anchor category */}
                <div>
                  <label className="text-[10px] font-display tracking-widest text-muted-foreground mb-1 block">
                    WHEN CUSTOMER SELECTS
                  </label>
                  <select
                    value={rule.anchor_category}
                    onChange={(e) => updateRule(i, 'anchor_category', e.target.value)}
                    className="bg-secondary border border-border rounded-md px-3 py-2 text-sm font-display focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select category...</option>
                    {AVAILABLE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Suggested categories */}
                <div>
                  <label className="text-[10px] font-display tracking-widest text-muted-foreground mb-1 block">
                    SUGGEST FROM
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_CATEGORIES.filter(c => c !== rule.anchor_category).map(cat => (
                      <button
                        key={cat}
                        onClick={() => toggleSuggestedCategory(i, cat)}
                        className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                          rule.suggested_categories.includes(cat)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:bg-secondary'
                        }`}
                      >
                        {cat.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orientation */}
                <div>
                  <label className="text-[10px] font-display tracking-widest text-muted-foreground mb-1 block">
                    SPLIT ORIENTATION
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateRule(i, 'orientation', 'horizontal')}
                      className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                        rule.orientation === 'horizontal'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-secondary'
                      }`}
                    >
                      HORIZONTAL
                    </button>
                    <button
                      onClick={() => updateRule(i, 'orientation', 'vertical')}
                      className={`px-3 py-1.5 text-[10px] font-display tracking-wider rounded-md border transition-colors ${
                        rule.orientation === 'vertical'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-secondary'
                      }`}
                    >
                      VERTICAL
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => removeRule(i)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
