import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export type TileBgMode = 'default' | 'transparent';

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
};

export const MAISON_DEFAULTS: ThemeSettings = {
  mode: 'light',
  storeName: 'CART BLANCHE',
  tileHoverGlow: '#e8e4de',
  tileHoverScale: 1.02,
  tileBgMode: 'default',
  displayFont: 'Cormorant Garamond',
  bodyFont: 'Cormorant Garamond',
  numeralFont: 'Inter',
  displayFontSize: 12,
  bodyFontSize: 11,
  numeralFontSize: 11,
  displayFontColor: '',
  bodyFontColor: '',
  numeralFontColor: '',
  storeNameColor: '',
};

const DEFAULT_STORAGE_KEY = 'cb-theme-settings';

function loadSaved(storageKey: string, defaults: ThemeSettings): ThemeSettings | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
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

export function ThemeProvider({ children, storageKey, defaults }: { children: React.ReactNode; storageKey?: string; defaults?: ThemeSettings }) {
  const key = storageKey || DEFAULT_STORAGE_KEY;
  const defs = defaults || DEFAULT_SETTINGS;
  const [settings, setSettings] = useState<ThemeSettings>(() => loadSaved(key, defs) || defs);
  const [savedSnapshot, setSavedSnapshot] = useState<ThemeSettings>(() => loadSaved(key, defs) || defs);
  const linkRef = useRef<HTMLLinkElement | null>(null);

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSnapshot);

  const updateTheme = useCallback((partial: Partial<ThemeSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const saveTheme = useCallback(() => {
    localStorage.setItem(key, JSON.stringify(settings));
    setSavedSnapshot({ ...settings });
  }, [key, settings]);

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
  }, [settings]);

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
