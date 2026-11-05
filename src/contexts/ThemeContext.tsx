import { createContext, useContext } from 'react';

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

export const DEFAULT_SETTINGS: ThemeSettings = {
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

export const DEFAULT_STORAGE_KEY = 'cb-theme-settings';

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

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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
