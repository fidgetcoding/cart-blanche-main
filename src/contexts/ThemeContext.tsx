import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export type TileBgMode = 'default' | 'transparent';

export type YzExpandTriggerStyle = 'icon' | 'text' | 'icon_text';
export type SlExpandTriggerStyle = 'icon' | 'text' | 'icon_text';

export interface ThemeSettings {
  mode: 'dark' | 'light';
  storeName: string;
  tileHoverGlow: string;
  tileHoverScale: number;
  tileBgMode: TileBgMode;
  displayFont: string;
  bodyFont: string;
  numeralFont: string;
  displayFontSize: number;
  bodyFontSize: number;
  numeralFontSize: number;
  displayFontColor: string;
  bodyFontColor: string;
  numeralFontColor: string;
  storeNameColor: string;
  yzExpandTriggerStyle: YzExpandTriggerStyle;
  slExpandTriggerStyle: SlExpandTriggerStyle;
  yzPeekMode: boolean;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: 'dark',
  storeName: 'CART BLANCHE',
  tileHoverGlow: 'hsla(0,0%,100%,0.08)',
  tileHoverScale: 1.04,
  tileBgMode: 'default',
  displayFont: 'Space Grotesk',
  bodyFont: 'Inter',
  numeralFont: 'Inter',
  displayFontSize: 11,
  bodyFontSize: 10,
  numeralFontSize: 10,
  displayFontColor: '',
  bodyFontColor: '',
  numeralFontColor: '',
  storeNameColor: '',
  yzExpandTriggerStyle: 'icon',
  slExpandTriggerStyle: 'text',
  yzPeekMode: false,
};

const DEFAULT_STORAGE_KEY = 'cb-theme-settings';

function loadSaved(key: string = DEFAULT_STORAGE_KEY): ThemeSettings | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // Storage blocked or saved value corrupt: fall back to the defaults.
  }
  return null;
}

interface ThemeContextType {
  theme: 'dark' | 'light';
  themeSettings: ThemeSettings;
  updateTheme: (partial: Partial<ThemeSettings>) => void;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
  saveTheme: () => void;
  revertTheme: () => void;
  hasUnsavedChanges: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Build a Google Fonts URL for the given families
function buildGoogleFontsUrl(families: string[]): string {
  const unique = [...new Set(families)].filter(f => f && f !== 'system-ui');
  if (unique.length === 0) return '';
  const params = unique
    .map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

export function ThemeProvider({ children, storageKey, defaults }: { children: React.ReactNode; storageKey?: string; defaults?: Partial<ThemeSettings> }) {
  const key = storageKey || DEFAULT_STORAGE_KEY;
  const mergedDefaults = defaults ? { ...DEFAULT_SETTINGS, ...defaults } : DEFAULT_SETTINGS;
  const [settings, setSettings] = useState<ThemeSettings>(() => loadSaved(key) || mergedDefaults);
  const [savedSnapshot, setSavedSnapshot] = useState<ThemeSettings>(() => loadSaved(key) || mergedDefaults);
  const linkRef = useRef<HTMLLinkElement | null>(null);

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSnapshot);

  const updateTheme = useCallback((partial: Partial<ThemeSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const saveTheme = useCallback(() => {
    localStorage.setItem(key, JSON.stringify(settings));
    setSavedSnapshot({ ...settings });
  }, [settings, key]);

  const revertTheme = useCallback(() => {
    setSettings({ ...savedSnapshot });
  }, [savedSnapshot]);

  // Inject/update Google Fonts link
  useEffect(() => {
    const url = buildGoogleFontsUrl([settings.displayFont, settings.bodyFont, settings.numeralFont]);
    if (!url) return;

    if (!linkRef.current) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = 'theme-google-fonts';
      document.head.appendChild(link);
      linkRef.current = link;
    }
    linkRef.current.href = url;
  }, [settings.displayFont, settings.bodyFont, settings.numeralFont]);

  useEffect(() => () => {
    linkRef.current?.remove();
    linkRef.current = null;
  }, []);

  // Update CSS custom properties
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--font-display', `${settings.displayFont}, sans-serif`);
    root.setProperty('--font-body', `${settings.bodyFont}, sans-serif`);
    root.setProperty('--font-numeral', `${settings.numeralFont}, monospace`);
    root.setProperty('--font-size-display', `${settings.displayFontSize}px`);
    root.setProperty('--font-size-body', `${settings.bodyFontSize}px`);
    root.setProperty('--font-size-numeral', `${settings.numeralFontSize}px`);
    root.setProperty('--color-display', settings.displayFontColor || 'inherit');
    root.setProperty('--color-body', settings.bodyFontColor || 'inherit');
    root.setProperty('--color-numeral', settings.numeralFontColor || 'inherit');
    root.setProperty('--color-store-name', settings.storeNameColor || 'inherit');
    // Theme mode is applied via container className on storefront
    // and Lab preview only — not on documentElement. Admin chrome
    // stays dark regardless of storefront theme.
  }, [settings]);

  // Document root always renders in dark mode — Smart Portal /
  // admin chrome are dark by design. Storefront and Lab preview
  // override this via container-scoped classes.
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: settings.mode,
        themeSettings: settings,
        updateTheme,
        setTheme: (t: string) => updateTheme({ mode: t as 'dark' | 'light' }),
        toggleTheme: () => updateTheme({ mode: settings.mode === 'dark' ? 'light' : 'dark' }),
        saveTheme,
        revertTheme,
        hasUnsavedChanges,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'dark' as const,
      themeSettings: { ...DEFAULT_SETTINGS },
      updateTheme: () => {},
      setTheme: () => {},
      toggleTheme: () => {},
      saveTheme: () => {},
      revertTheme: () => {},
      hasUnsavedChanges: false,
    } as ThemeContextType;
  }
  return ctx;
}
