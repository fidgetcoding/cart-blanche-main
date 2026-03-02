import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export interface ThemeSettings {
  mode: 'dark' | 'light';
  tileHoverGlow: string;
  tileHoverScale: number;
  displayFont: string;
  bodyFont: string;
  numeralFont: string;
  displayFontSize: number;
  bodyFontSize: number;
  numeralFontSize: number;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: 'dark',
  tileHoverGlow: 'hsla(0,0%,100%,0.08)',
  tileHoverScale: 1.04,
  displayFont: 'Space Grotesk',
  bodyFont: 'Inter',
  numeralFont: 'Inter',
  displayFontSize: 11,
  bodyFontSize: 10,
  numeralFontSize: 10,
};

interface ThemeContextType {
  theme: 'dark' | 'light';
  themeSettings: ThemeSettings;
  updateTheme: (partial: Partial<ThemeSettings>) => void;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const linkRef = useRef<HTMLLinkElement | null>(null);

  const updateTheme = useCallback((partial: Partial<ThemeSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  // Toggle light class on :root
  useEffect(() => {
    if (settings.mode === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [settings.mode]);

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
    root.setProperty('--font-display', `'${settings.displayFont}', sans-serif`);
    root.setProperty('--font-body', `'${settings.bodyFont}', sans-serif`);
    root.setProperty('--font-numeral', `'${settings.numeralFont}', monospace`);
    root.setProperty('--font-size-display', `${settings.displayFontSize}px`);
    root.setProperty('--font-size-body', `${settings.bodyFontSize}px`);
    root.setProperty('--font-size-numeral', `${settings.numeralFontSize}px`);
  }, [settings.displayFont, settings.bodyFont, settings.numeralFont, settings.displayFontSize, settings.bodyFontSize, settings.numeralFontSize]);

  return (
    <ThemeContext.Provider
      value={{
        theme: settings.mode,
        themeSettings: settings,
        updateTheme,
        setTheme: (t: string) => updateTheme({ mode: t as 'dark' | 'light' }),
        toggleTheme: () => updateTheme({ mode: settings.mode === 'dark' ? 'light' : 'dark' }),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
