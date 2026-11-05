import { useState, useCallback, useEffect, useRef } from 'react';
import { ThemeContext, DEFAULT_SETTINGS, DEFAULT_STORAGE_KEY, type ThemeSettings } from './ThemeContext';
import { googleFontsUrl, PAGE_FONT_FAMILIES } from '@/lib/theme-fonts';

function loadSaved(key: string = DEFAULT_STORAGE_KEY): ThemeSettings | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // Storage blocked or saved value corrupt: fall back to the defaults.
  }
  return null;
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

  // The default fonts are served from our own origin (index.css) and preloaded in the page's head.
  // A font the theme changes to (in the Template Lab, say) loads here from Google, at runtime.
  useEffect(() => {
    const url = googleFontsUrl([settings.displayFont, settings.bodyFont, settings.numeralFont]
      .filter(f => !PAGE_FONT_FAMILIES.includes(f)));
    if (!url) {
      linkRef.current?.remove();
      linkRef.current = null;
      return;
    }

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

  // Document root always renders in dark mode — SmartPortal /
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
