import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Send, ChevronDown, ChevronUp, Sun, Moon, Upload } from 'lucide-react';
import { useTheme, type ThemeSettings } from '@/contexts/ThemeContext';
import { CartProvider } from '@/contexts/CartContext';
import { SmartCartProvider } from '@/contexts/SmartCartContext';
import { StyleKitProvider } from '@/contexts/StyleKitContext';
import { SpatialCanvas } from '@/components/storefront/SpatialCanvas';
import { StyleKitView } from '@/components/storefront/StyleKitView';
import { toast } from 'sonner';

const GLOW_PRESETS = [
  { label: 'White', value: 'hsla(0,0%,100%,0.08)' },
  { label: 'Gold', value: '#e8c547' },
  { label: 'Blue', value: 'hsla(210,80%,60%,0.25)' },
  { label: 'Rose', value: 'hsla(340,70%,55%,0.25)' },
  { label: 'Emerald', value: 'hsla(155,70%,45%,0.25)' },
];

const DISPLAY_FONTS = [
  'Space Grotesk', 'Playfair Display', 'Instrument Serif', 'DM Sans',
  'Bebas Neue', 'Oswald', 'Cormorant Garamond', 'JetBrains Mono',
  'Abril Fatface', 'Archivo Black', 'Cinzel', 'Dela Gothic One',
  'Fraunces', 'Libre Baskerville', 'Lora', 'Merriweather',
  'Montserrat', 'Poppins', 'Raleway', 'Syne',
];
const BODY_FONTS = [
  'Inter', 'DM Sans', 'Nunito Sans', 'Work Sans', 'Lato', 'Source Sans 3',
  'Karla', 'Libre Franklin', 'Manrope', 'Outfit',
  'Plus Jakarta Sans', 'Public Sans', 'Roboto', 'Rubik',
  'Sora', 'Urbanist', 'Barlow', 'Figtree',
  'Geist', 'Noto Sans',
];
const NUMERAL_FONTS = [
  'Inter', 'JetBrains Mono', 'Space Mono', 'DM Mono', 'IBM Plex Mono',
  'Fira Code', 'Source Code Pro', 'Roboto Mono', 'Ubuntu Mono',
  'Inconsolata', 'Overpass Mono', 'Red Hat Mono', 'Azeret Mono',
  'Cousine', 'Martian Mono', 'Noto Sans Mono', 'Oxygen Mono',
  'PT Mono', 'Share Tech Mono', 'Victor Mono',
];

// Track injected custom font-face rules to avoid duplicates
const injectedCustomFonts = new Set<string>();

function injectCustomFont(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const name = file.name.replace(/\.(woff2?|ttf|otf)$/i, '').replace(/[-_]/g, ' ');
      const familyName = `Custom: ${name}`;
      if (!injectedCustomFonts.has(familyName)) {
        const style = document.createElement('style');
        style.textContent = `@font-face { font-family: '${familyName}'; src: url('${url}'); font-display: swap; }`;
        document.head.appendChild(style);
        injectedCustomFonts.add(familyName);
      }
      resolve(familyName);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const DEMO_MESSAGES = [
  { role: 'system', text: 'Welcome to your storefront builder. Describe changes and I\'ll update your store in real-time.' },
  { role: 'user', text: 'Make the hover glow gold and use a more editorial font' },
  { role: 'system', text: 'Done — I\'ve updated the tile glow to gold (#e8c547) and switched headings to Playfair Display. Check the preview →' },
];

function ThemeControls() {
  const { themeSettings, updateTheme } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [customColor, setCustomColor] = useState('#ffffff');

  return (
    <div className="border-t border-border/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-display tracking-[0.15em] text-foreground/70 hover:text-foreground transition-colors"
      >
        THEME SETTINGS
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {/* Mode */}
          <div className="space-y-2">
            <label className="text-[10px] font-display tracking-[0.2em] text-muted-foreground">BACKGROUND MODE</label>
            <div className="flex gap-1">
              {(['dark', 'light'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => updateTheme({ mode: m })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-display tracking-wider transition-colors ${
                    themeSettings.mode === m
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {m === 'dark' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tile Hover Glow */}
          <div className="space-y-2">
            <label className="text-[10px] font-display tracking-[0.2em] text-muted-foreground">TILE HOVER GLOW</label>
            <div className="flex gap-1.5 items-center flex-wrap">
              {GLOW_PRESETS.map(g => (
                <button
                  key={g.label}
                  onClick={() => updateTheme({ tileHoverGlow: g.value })}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    themeSettings.tileHoverGlow === g.value ? 'border-foreground scale-110' : 'border-border/50 hover:border-foreground/40'
                  }`}
                  style={{ background: g.value }}
                  title={g.label}
                />
              ))}
              <input
                type="color"
                value={customColor}
                onChange={e => {
                  setCustomColor(e.target.value);
                  updateTheme({ tileHoverGlow: e.target.value });
                }}
                className="w-6 h-6 rounded-full cursor-pointer border border-border/50 bg-transparent"
                title="Custom"
              />
            </div>
          </div>

          {/* Display Font */}
          <FontSelect
            label="DISPLAY FONT"
            value={themeSettings.displayFont}
            options={DISPLAY_FONTS}
            onChange={v => updateTheme({ displayFont: v })}
          />

          {/* Navigator Font */}
          <FontSelect
            label="NAVIGATOR FONT"
            value={themeSettings.bodyFont}
            options={BODY_FONTS}
            onChange={v => updateTheme({ bodyFont: v })}
          />

          {/* Numeral Font */}
          <FontSelect
            label="NUMERAL FONT"
            value={themeSettings.numeralFont}
            options={NUMERAL_FONTS}
            onChange={v => updateTheme({ numeralFont: v })}
          />

          {/* Font Sizes */}
          <div className="space-y-2">
            <label className="text-[10px] font-display tracking-[0.2em] text-muted-foreground">ASSET SIZES</label>
            <div className="space-y-2">
              <SizeSlider label="Display" value={themeSettings.displayFontSize} min={8} max={18} onChange={v => updateTheme({ displayFontSize: v })} />
              <SizeSlider label="Navigator" value={themeSettings.bodyFontSize} min={8} max={16} onChange={v => updateTheme({ bodyFontSize: v })} />
              <SizeSlider label="Numeral" value={themeSettings.numeralFontSize} min={8} max={16} onChange={v => updateTheme({ numeralFontSize: v })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FontSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [customFonts, setCustomFonts] = useState<string[]>([]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = /\.(woff2?|ttf|otf)$/i.test(file.name);
    if (!valid) {
      toast.error('Unsupported format. Use .woff2, .woff, .ttf, or .otf');
      return;
    }
    try {
      const familyName = await injectCustomFont(file);
      setCustomFonts(prev => prev.includes(familyName) ? prev : [...prev, familyName]);
      onChange(familyName);
      toast.success(`Loaded "${familyName}"`);
    } catch {
      toast.error('Failed to load font');
    }
    if (fileRef.current) fileRef.current.value = '';
  }, [onChange]);

  const allOptions = [...options, ...customFonts];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-display tracking-[0.2em] text-muted-foreground">{label}</label>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 text-[9px] font-display tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          title="Upload custom font (.woff2, .ttf, .otf)"
        >
          <Upload className="w-3 h-3" />
          UPLOAD
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".woff,.woff2,.ttf,.otf"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-muted/50 border border-border/50 rounded-md px-2.5 py-1.5 text-[11px] text-foreground font-display tracking-wider focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
        style={{ fontFamily: value }}
      >
        {allOptions.map(f => (
          <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
        ))}
      </select>
    </div>
  );
}

function SizeSlider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1 accent-foreground cursor-pointer"
      />
      <span className="text-[10px] text-foreground/60 w-6 text-right font-mono">{value}</span>
    </div>
  );
}

export default function YzyTemplate() {
  const navigate = useNavigate();
  const [chatInput, setChatInput] = useState('');

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* LEFT: Chat Sidebar */}
      <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-border/50 bg-card">
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border/50 flex-shrink-0">
          <button
            onClick={() => navigate('/admin/lab')}
            className="flex items-center gap-1.5 text-[11px] font-display tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO LAB</span>
          </button>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-foreground/50" />
            <span className="font-display text-[11px] tracking-[0.15em] text-foreground/70">CARTE BLANCHE AI</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {DEMO_MESSAGES.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-foreground/80'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 bg-muted/40 border border-border/50 rounded-lg px-3 py-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Describe a change..."
              className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none font-display tracking-wider"
            />
            <button
              onClick={() => toast.info('AI builder coming soon')}
              className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Theme Controls */}
        <ThemeControls />
      </div>

      {/* RIGHT: Live Preview */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background p-4">
        {/* Fake browser chrome */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-t-xl border border-b-0 border-border/30 flex-shrink-0">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
          </div>
          <div className="flex-1 bg-muted/40 rounded-md px-3 py-1 text-[10px] font-mono text-muted-foreground tracking-wider text-center">
            yourstore.cartblanche.com
          </div>
        </div>

        {/* Live storefront */}
        <div className="flex-1 rounded-b-xl border border-border/30 overflow-hidden relative" style={{ contain: 'paint layout' }}>
          <div className="absolute inset-0" style={{ transform: 'translateZ(0)' }}>
            <CartProvider>
              <SmartCartProvider>
                <StyleKitProvider>
                  <SpatialCanvas />
                  <StyleKitView />
                </StyleKitProvider>
              </SmartCartProvider>
            </CartProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
