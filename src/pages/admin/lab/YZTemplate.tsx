import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Send, ChevronDown, ChevronUp, Sun, Moon, Upload, Pipette, Palette, Settings, MessageSquare, Save, RotateCcw, Lock } from 'lucide-react';
import { useTheme, ThemeProvider, type ThemeSettings } from '@/contexts/ThemeContext';
import { CartProvider } from '@/contexts/CartContext';
import { SmartCartProvider } from '@/contexts/SmartCartContext';
import { StyleKitProvider } from '@/contexts/StyleKitContext';
import { SpatialCanvas } from '@/components/storefront/SpatialCanvas';
import { StyleKitView } from '@/components/storefront/StyleKitView';
import { SubscriberPopup } from '@/components/storefront/SubscriberPopup';
import { toast } from 'sonner';
import { processMessage } from '@/lib/template-agent';

interface ChatMessage {
  role: 'system' | 'user';
  text: string;
}

const GLOW_PRESETS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Soft White', value: 'hsla(0,0%,100%,0.08)' },
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


function ThemeControls() {
  const { themeSettings, updateTheme, saveTheme, revertTheme, hasUnsavedChanges } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [customColor, setCustomColor] = useState('#ffffff');
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="px-4 py-3 space-y-2.5">
          {/* Store Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-display tracking-[0.2em] text-muted-foreground">STORE NAME</label>
            <input
              type="text"
              value={themeSettings.storeName}
              onChange={e => updateTheme({ storeName: e.target.value })}
              placeholder="YOUR STORE"
              className="w-full bg-muted/50 border border-border/50 rounded-md px-2.5 py-1.5 text-[11px] text-foreground font-display tracking-wider focus:outline-none focus:ring-1 focus:ring-ring uppercase"
            />
          </div>

          {/* Add-to-Cart Trigger Style */}
          <div className="space-y-1">
            <label className="text-[10px] font-display tracking-[0.2em] text-muted-foreground">EXPAND TRIGGER</label>
            <div className="flex gap-1">
              {([
                { value: 'icon' as const, label: '+' },
                { value: 'text' as const, label: 'ADD TO CART' },
                { value: 'icon_text' as const, label: 'ADD TO CART +' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateTheme({ yzExpandTriggerStyle: opt.value })}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-display tracking-wider transition-colors ${
                    themeSettings.yzExpandTriggerStyle === opt.value
                      ? 'bg-foreground/15 text-foreground border border-foreground/30'
                      : 'bg-muted/50 text-muted-foreground border border-border/50 hover:border-foreground/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Peek Mode — toggles adjacent item peeks + chrome tuck in YZ detail view */}
          <div className="space-y-1">
            <label className="text-[10px] font-display tracking-[0.2em] text-muted-foreground">PEEK MODE</label>
            <div className="flex gap-1">
              {([
                { value: true,  label: 'ON' },
                { value: false, label: 'OFF' },
              ]).map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => updateTheme({ yzPeekMode: opt.value })}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-display tracking-wider transition-colors ${
                    themeSettings.yzPeekMode === opt.value
                      ? 'bg-foreground/15 text-foreground border border-foreground/30'
                      : 'bg-muted/50 text-muted-foreground border border-border/50 hover:border-foreground/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="space-y-1">
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

          {/* Thumbnail Background */}
          <div className="space-y-1">
            <label className="text-[10px] font-display tracking-[0.2em] text-muted-foreground">THUMBNAIL BACKGROUND</label>
            <div className="flex gap-1.5">
              {(['default', 'transparent'] as const).map(mode => {
                const isActive = themeSettings.tileBgMode === mode;
                const label = mode === 'default'
                  ? (themeSettings.mode === 'light' ? '#ECECEC' : '#151515')
                  : 'TRANSPARENT';
                return (
                  <button
                    key={mode}
                    onClick={() => updateTheme({ tileBgMode: mode })}
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-display tracking-wider transition-colors ${
                      isActive
                        ? 'bg-foreground/15 text-foreground border border-foreground/30'
                        : 'bg-muted/50 text-muted-foreground border border-border/50 hover:border-foreground/30'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tile Hover Glow */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-display tracking-[0.2em] text-muted-foreground">TILE HOVER GLOW</label>
            <div className="flex gap-1.5 items-center">
              {GLOW_PRESETS.map(g => (
                <button
                  key={g.label}
                  onClick={() => { updateTheme({ tileHoverGlow: g.value }); setCustomColor(g.value); }}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    themeSettings.tileHoverGlow === g.value ? 'border-foreground scale-110' : 'border-border/50 hover:border-foreground/40'
                  }`}
                  style={{ background: g.value }}
                  title={g.label}
                />
              ))}
              <button
                onClick={async () => {
                  if ('EyeDropper' in window) {
                    try {
                      const { EyeDropper } = window as unknown as { EyeDropper: new () => { open(): Promise<{ sRGBHex: string }> } };
                      const dropper = new EyeDropper();
                      const result = await dropper.open();
                      setCustomColor(result.sRGBHex);
                      updateTheme({ tileHoverGlow: result.sRGBHex });
                    } catch { /* user cancelled */ }
                  } else {
                    toast.error('EyeDropper not supported in this browser');
                  }
                }}
                className="w-6 h-6 rounded-full border-2 border-border/50 hover:border-foreground/40 transition-all flex items-center justify-center bg-muted/50"
                title="Pick color from screen"
              >
                <Pipette className="w-3 h-3 text-foreground/70" />
              </button>
              <input
                ref={colorInputRef}
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(customColor) ? customColor : '#ffffff'}
                onChange={e => {
                  setCustomColor(e.target.value);
                  updateTheme({ tileHoverGlow: e.target.value });
                }}
                className="sr-only"
              />
              <button
                onClick={() => colorInputRef.current?.click()}
                className="w-6 h-6 rounded-full border-2 border-border/50 hover:border-foreground/40 transition-all flex items-center justify-center cursor-pointer"
                title="Open color picker"
              >
                <Palette className="w-3 h-3 text-foreground/70" />
              </button>
              <div className="w-px h-5 bg-border/40 mx-0.5" />
              <div
                className="w-6 h-6 rounded-md border border-border/50 flex-shrink-0"
                style={{ background: customColor }}
              />
              <input
                type="text"
                value={customColor}
                onChange={e => {
                  const val = e.target.value;
                  setCustomColor(val);
                  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                    updateTheme({ tileHoverGlow: val });
                  }
                }}
                onBlur={() => {
                  if (/^#[0-9a-fA-F]{6}$/.test(customColor)) {
                    updateTheme({ tileHoverGlow: customColor });
                  }
                }}
                placeholder="#000000"
                className="w-20 bg-muted/50 border border-border/50 rounded-md px-2 py-1 text-[11px] font-mono text-foreground tracking-wider focus:outline-none focus:ring-1 focus:ring-ring uppercase"
                maxLength={7}
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
            options={[...DISPLAY_FONTS, ...BODY_FONTS.filter(f => !DISPLAY_FONTS.includes(f))]}
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
              <SizeSlider label="Display Font" value={themeSettings.displayFontSize} min={8} max={18} onChange={v => updateTheme({ displayFontSize: v })} />
              <SizeSlider label="Navigator" value={themeSettings.bodyFontSize} min={8} max={16} onChange={v => updateTheme({ bodyFontSize: v })} />
              <SizeSlider label="Numeral" value={themeSettings.numeralFontSize} min={8} max={16} onChange={v => updateTheme({ numeralFontSize: v })} />
            </div>
          </div>

          {/* Font Colors */}
          <div className="space-y-2">
            <label className="text-[10px] font-display tracking-[0.2em] text-muted-foreground">FONT COLORS</label>
            <div className="space-y-2">
              <ColorInput label="Store Name" value={themeSettings.storeNameColor} onChange={v => updateTheme({ storeNameColor: v })} />
              <ColorInput label="Display" value={themeSettings.displayFontColor} onChange={v => updateTheme({ displayFontColor: v })} />
              <ColorInput label="Navigator" value={themeSettings.bodyFontColor} onChange={v => updateTheme({ bodyFontColor: v })} />
              <ColorInput label="Numeral" value={themeSettings.numeralFontColor} onChange={v => updateTheme({ numeralFontColor: v })} />
            </div>
          </div>

          {/* Save / Revert */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={revertTheme}
              disabled={!hasUnsavedChanges}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[10px] font-display tracking-wider border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3 h-3" />
              REVERT
            </button>
            <button
              onClick={() => { saveTheme(); toast.success('Theme saved'); }}
              disabled={!hasUnsavedChanges}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[10px] font-display tracking-wider bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Save className="w-3 h-3" />
              SAVE
            </button>
          </div>
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
      <span className="text-[10px] text-muted-foreground w-20 flex-shrink-0 whitespace-nowrap">{label}</span>
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

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { themeSettings } = useTheme();
  const defaultColor = themeSettings.mode === 'light' ? '#262626' : '#ffffff';
  const displayValue = value || defaultColor;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-muted-foreground w-20 flex-shrink-0 whitespace-nowrap">{label}</span>
      <button
        onClick={() => ref.current?.click()}
        className="w-6 h-6 rounded-md border border-border/50 flex-shrink-0 cursor-pointer"
        style={{ background: displayValue }}
      />
      <input ref={ref} type="color" value={displayValue} onChange={e => onChange(e.target.value)} className="sr-only" />
      <input
        type="text"
        value={displayValue.toUpperCase()}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-muted/50 border border-border/50 rounded-md px-2 py-1 text-[10px] font-mono text-foreground tracking-wider focus:outline-none focus:ring-1 focus:ring-ring uppercase"
        maxLength={7}
      />
      {value && (
        <button onClick={() => onChange('')} className="text-[9px] text-muted-foreground hover:text-foreground transition-colors" title="Reset to default">✕</button>
      )}
    </div>
  );
}

function YzTemplateInner() {
  const navigate = useNavigate();
  const { themeSettings, updateTheme } = useTheme();
  const [chatInput, setChatInput] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'ai' | 'settings'>('settings');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', text: "Hey — I'm your Template Builder AI. Tell me how you want your storefront to look and I'll make it happen. I can change fonts, colors, hover effects, sizes, and background mode." },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([
    'Switch to light mode with a serif heading font',
    'Make the hover glow gold for a luxury feel',
    'Use monospaced numerals for cleaner prices',
    'Make everything bigger and more readable',
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback((text?: string) => {
    const userMsg = (text || chatInput).trim();
    if (!userMsg) return;
    setChatInput('');

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);

    // Process with agent after short delay
    setTimeout(() => {
      const response = processMessage(userMsg, themeSettings);
      if (response.themeUpdate) {
        updateTheme(response.themeUpdate);
      }
      setMessages(prev => [...prev, { role: 'system', text: response.message }]);
      if (response.suggestions) {
        setSuggestions(response.suggestions);
      }
    }, 300);
  }, [chatInput, themeSettings, updateTheme]);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* LEFT: Chat Sidebar */}
      <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-border/50 bg-card">
        {/* Header */}
        <div className="h-12 flex items-center px-4 border-b border-border/50 flex-shrink-0">
          <button
            onClick={() => navigate('/admin/lab')}
            className="flex items-center gap-1.5 text-[11px] font-display tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO SMART PORTAL</span>
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-border/50 flex-shrink-0">
          <button
            onClick={() => setSidebarTab('settings')}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-display tracking-[0.15em] transition-colors ${
              sidebarTab === 'settings'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/70'
            }`}
          >
            <Settings className="w-3 h-3" />
            SETTINGS
            {sidebarTab === 'settings' && (
              <motion.div layoutId="yz-tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
            )}
          </button>
          <button
            onClick={() => setSidebarTab('ai')}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-display tracking-[0.15em] transition-colors ${
              sidebarTab === 'ai'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/70'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            AI TEMPLATE BUILDER
            {sidebarTab === 'ai' && (
              <motion.div layoutId="yz-tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        {sidebarTab === 'settings' ? (
          <div className="flex-1 overflow-y-auto">
            <ThemeControls />
          </div>
        ) : (
          <div className="relative flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden pointer-events-none select-none opacity-80">
              <div className="flex-1 overflow-hidden p-3 space-y-3">
                {suggestions.length > 0 && (
                  <div className="space-y-4 pt-6">
                    <div className="text-center space-y-2">
                      <Sparkles className="w-7 h-7 text-accent mx-auto" />
                      <p className="text-[11px] text-muted-foreground">Tell me how you want your storefront to look.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-2">
                      {suggestions.map((s, i) => (
                        <div key={i} className="flex flex-col items-start gap-1 p-2.5 rounded-lg liquid-glass text-left">
                          <Sparkles className="w-3.5 h-3.5 text-accent" />
                          <span className="text-[10px] font-medium">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="liquid-glass border-t border-border/50 p-3 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-[11px] text-muted-foreground">Describe a change...</div>
                  <div className="h-9 w-9 rounded-lg bg-accent flex-shrink-0 flex items-center justify-center">
                    <Send className="w-3.5 h-3.5 text-accent-foreground" />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-foreground/5 border border-border flex items-center justify-center">
                <Lock className="w-6 h-6 text-foreground" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-display tracking-[0.2em] text-foreground">COMING SOON</p>
                <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
                  The AI Template Builder is in development. Use the Settings tab to customize your storefront in the meantime.
                </p>
              </div>
            </div>
          </div>
        )}
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
        <div data-storefront-root className={`${themeSettings.mode} flex-1 rounded-b-xl border border-border/30 overflow-hidden relative bg-background text-foreground`} style={{ contain: 'paint layout' }}>
          <div className="absolute inset-0" style={{ transform: 'translateZ(0)' }}>
            <CartProvider>
              <SmartCartProvider>
                <StyleKitProvider>
                  <SpatialCanvas />
                  <StyleKitView />
                  <SubscriberPopup variant="yz" />
                </StyleKitProvider>
              </SmartCartProvider>
            </CartProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function YzTemplate() {
  return (
    <ThemeProvider storageKey="cb-theme-yz" defaults={{ mode: 'dark' }}>
      <YzTemplateInner />
    </ThemeProvider>
  );
}
