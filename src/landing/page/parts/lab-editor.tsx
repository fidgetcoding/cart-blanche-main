// The SL editor (pages/admin/lab/SlTemplate.tsx) for the Template Lab chapter: its sidebar, with the real
// ThemeControls and the AI Template Builder chat, and the live MaisonCanvas it styles. lab.tsx loads this file
// only as the chapter comes close, so none of it (the store, the editor, the template agent) weighs on the page's
// first load. The store takes its theme from a ThemeContext value, never a ThemeProvider: a provider writes the
// page's font variables (it would restyle the whole landing) and saves to storage the demo shares.
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, Send, Settings, Sparkles, type LucideIcon } from 'lucide-react';
import { ThemeContext, type ThemeSettings } from '@/contexts/ThemeContext';
import { MaisonCanvas } from '@/components/storefront/MaisonCanvas';
import { ThemeControls } from '@/pages/admin/lab/SlTemplate';
import { googleFontsUrl } from '@/lib/theme-fonts';
import { DARK_VARS, EASE_CSS } from '../lib/core';
import { LAB_FONTS, LAB_SUGGESTIONS, labFrame, type LabFrame, type LabLine } from '../lib/lab';
import { Layer, PortalDark } from './core';

const noop = () => {};

/** A ThemeContext value that shows `s` and changes nothing. */
function useThemeValue(s: ThemeSettings) {
  return useMemo(() => ({
    theme: s.mode, themeSettings: s, updateTheme: noop, setTheme: noop, toggleTheme: noop, saveTheme: noop, revertTheme: noop, hasUnsavedChanges: false,
  }), [s]);
}

const family = (f: string, generic: string) => `${f}, ${/serif/i.test(f) && !/sans/i.test(f) ? 'serif' : generic}`;

/** The variables ThemeProvider sets on the page, set on the store alone. */
const themeVars = (s: ThemeSettings) => ({
  '--font-display': family(s.displayFont, 'sans-serif'),
  '--font-body': family(s.bodyFont, 'sans-serif'),
  '--font-numeral': family(s.numeralFont, 'monospace'),
  '--font-size-display': `${s.displayFontSize}px`,
  '--font-size-body': `${s.bodyFontSize}px`,
  '--font-size-numeral': `${s.numeralFontSize}px`,
  '--color-display': s.displayFontColor || 'inherit',
  '--color-body': s.bodyFontColor || 'inherit',
  '--color-numeral': s.numeralFontColor || 'inherit',
  '--color-store-name': s.storeNameColor || 'inherit',
}) as CSSProperties;

/** The live SL storefront, in the theme `settings` describe. Light, or the dark tokens when the mode is dark.
 *  Memoised: the chapter's settings only change when a control does, and the store redraws only then. */
const StorePreview = memo(function StorePreview({ settings }: { settings: ThemeSettings }) {
  const value = useThemeValue(settings);
  const dark = settings.mode === 'dark';
  return (
    <ThemeContext.Provider value={value}>
      <div data-storefront-root data-lab-store className={`${dark ? 'cb-dark' : 'light'} absolute inset-0 overflow-hidden bg-background text-foreground pointer-events-none`}
        style={{ ...(dark ? DARK_VARS : {}), ...themeVars(settings), contain: 'paint layout' }}>
        <MaisonCanvas />
      </div>
    </ThemeContext.Provider>
  );
});

function Tab({ on, icon: Icon, label }: { on: boolean; icon: LucideIcon; label: string }) {
  return (
    <span className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-display tracking-[0.15em] transition-colors duration-300 ${on ? 'text-foreground' : 'text-muted-foreground'}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  );
}

/** The Settings tab: the real ThemeControls, with a ring on the control that just changed. Memoised, so the
 *  controls redraw only when a setting (through the context) or the ring moves. */
const SettingsBody = memo(function SettingsBody({ focus }: { focus: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ring, setRing] = useState<{ top: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const label = focus ? [...(ref.current?.querySelectorAll('label') ?? [])].find(l => l.textContent?.trim() === focus) : null;
    const block = label?.parentElement;
    if (block) setRing({ top: block.offsetTop, h: block.offsetHeight });
    else setRing(r => (r ? { ...r, h: 0 } : r));
  }, [focus]);
  return (
    <div ref={ref} className="relative h-full overflow-hidden">
      <ThemeControls />
      <div aria-hidden data-lab-ring className="absolute left-2 right-2 rounded-lg ring-1 ring-foreground/40 bg-foreground/[0.04] pointer-events-none"
        style={{ top: (ring?.top ?? 0) - 6, height: (ring?.h ?? 0) + 12, opacity: ring && ring.h > 0 ? 1 : 0, transition: `top 400ms ${EASE_CSS}, height 400ms ${EASE_CSS}, opacity 300ms ${EASE_CSS}` }} />
    </div>
  );
});

/** SmartChatPanel.tsx message bubble. */
function Bubble({ line }: { line: LabLine }) {
  return (
    <div className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animation: `cbe-in 400ms ${EASE_CSS} both` }}>
      <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${line.role === 'user' ? 'bg-accent text-accent-foreground' : 'bg-card border border-border'}`}>
        {line.text}
      </div>
    </div>
  );
}
const IN_CSS = '@keyframes cbe-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){[style*="cbe-in"]{animation:none!important}}';

/** The AI Template Builder tab, unlocked: its suggestions, then the chat. The demo still locks it, so it says so. */
function AiBody({ chat, draft }: { chat: LabLine[]; draft: string }) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <style>{IN_CSS}</style>
      <div className="flex-1 overflow-hidden p-3">
        <div className="space-y-4 pt-6">
          <div className="text-center space-y-2">
            <Sparkles className="w-7 h-7 text-accent mx-auto" />
            <p className="text-[11px] text-muted-foreground">Tell me how you want your storefront to look.</p>
            <p className="text-[9px] font-display tracking-[0.2em] text-muted-foreground">COMING SOON</p>
          </div>
          {/* As in SmartChatPanel, the suggestions give way to the conversation once the first message goes. */}
          {chat.length === 0 ? (
            <div className="grid grid-cols-2 gap-1.5 pt-2">
              {LAB_SUGGESTIONS.map(s => (
                <div key={s} className={`flex flex-col items-start gap-1 p-2.5 rounded-lg liquid-glass text-left transition-shadow duration-300 ${s === draft ? 'ring-1 ring-foreground/40' : ''}`}>
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[10px] font-medium">{s}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 pt-2">{chat.map((l, i) => <Bubble key={i} line={l} />)}</div>
          )}
        </div>
      </div>
      <div className="liquid-glass border-t border-border/50 p-3 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className={`flex-1 min-w-0 truncate bg-card border border-border rounded-lg px-3 py-2 text-[11px] ${draft ? 'text-foreground' : 'text-muted-foreground'}`}>{draft || 'Describe a change...'}</div>
          <div className="h-9 w-9 rounded-lg bg-accent flex-shrink-0 flex items-center justify-center">
            <Send className="w-3.5 h-3.5 text-accent-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** SlTemplate.tsx's left column: back link, the two tabs, and the tab on show. Its controls show `frame.settings`. */
function EditorSidebar({ frame, thumb }: { frame: LabFrame; thumb: boolean }) {
  const value = useThemeValue(frame.settings);
  const ai = frame.tab === 'ai';
  return (
    <ThemeContext.Provider value={value}>
      <PortalDark className="w-[380px] h-full flex flex-col border-r border-border/50 bg-card">
        <div className="h-12 flex items-center px-4 border-b border-border/50 flex-shrink-0">
          <span className="flex items-center gap-1.5 text-[11px] font-display tracking-wider text-muted-foreground">
            <ArrowLeft className="w-3.5 h-3.5" /><span>BACK TO SMARTPORTAL</span>
          </span>
        </div>
        <div className="relative flex border-b border-border/50 flex-shrink-0">
          <Tab on={!ai} icon={Settings} label="SETTINGS" />
          <Tab on={ai} icon={Sparkles} label="AI TEMPLATE BUILDER" />
          <div className="absolute bottom-0 left-0 w-1/2 h-[2px] bg-foreground"
            style={{ transform: ai ? 'translateX(100%)' : 'none', transition: thumb ? 'none' : `transform 400ms ${EASE_CSS}` }} />
        </div>
        <div className="relative flex-1 min-h-0">
          <Layer on={!ai} thumb={thumb}><SettingsBody focus={frame.focus} /></Layer>
          <Layer on={ai} thumb={thumb}><AiBody chat={frame.chat} draft={frame.draft} /></Layer>
        </div>
      </PortalDark>
    </ThemeContext.Provider>
  );
}

/** The editor's controls for a phone: the real ThemeControls from Card Trigger down, a little smaller. */
function CompactControls({ settings }: { settings: ThemeSettings }) {
  const value = useThemeValue(settings);
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);
  useLayoutEffect(() => {
    const label = [...(ref.current?.querySelectorAll('label') ?? [])].find(l => l.textContent?.trim() === 'CARD TRIGGER');
    setY(label?.parentElement?.offsetTop ?? 0);
  }, []);
  return (
    <ThemeContext.Provider value={value}>
      <div className="h-full overflow-hidden">
        <div ref={ref} className="relative origin-top-left" style={{ transform: `scale(0.8) translateY(${-y + 4}px)`, width: `${100 / 0.8}%` }}>
          <ThemeControls />
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

// The fonts the AI Template Builder switches the store to come from Google, as the theme's own do.
let fontsLinked = false;
function useLabFonts() {
  useEffect(() => {
    if (fontsLinked || LAB_FONTS.length === 0) return;
    fontsLinked = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = googleFontsUrl(LAB_FONTS);
    link.dataset.labFonts = '';
    document.head.appendChild(link);
  }, []);
}

/** What lab.tsx draws, each at a beat (`step`) of the chapter and a point `t` through it. */
export interface LabAt { step: number; t: number }
const useFrame = ({ step, t }: LabAt) => useMemo(() => labFrame(step, t), [step, t]);

/** The SL store, styled as the chapter has it at this point. */
export function LabStore(at: LabAt) {
  useLabFonts();
  return <StorePreview settings={useFrame(at).settings} />;
}

/** The editor's sidebar at this point. */
export function LabSidebar({ thumb, ...at }: LabAt & { thumb: boolean }) {
  return <EditorSidebar frame={useFrame(at)} thumb={thumb} />;
}

/** A phone's panel: the controls at this point. */
export function LabControls(at: LabAt) {
  return <CompactControls settings={useFrame(at).settings} />;
}

/** A phone's panel: the last two lines of the chat at this point. */
export function LabChat(at: LabAt) {
  const { chat } = useFrame(at);
  return (
    <>
      <style>{IN_CSS}</style>
      {chat.slice(-2).map((l, i) => <Bubble key={`${chat.length}-${i}`} line={l} />)}
    </>
  );
}
