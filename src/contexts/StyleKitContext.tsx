import { createContext, useContext } from 'react';
import type { DemoProduct } from '@/data/demo-data';

export type StyleKitMode = 'counterparts' | 'extras';

export interface StyleKitState {
  isOpen: boolean;
  anchorProduct: DemoProduct | null;
  mode: StyleKitMode;
  lookItems: DemoProduct[];
  initialAnchorSize: string | null;
  activeGenders: string[];
}

interface StyleKitContextType extends StyleKitState {
  openStyleKit: (product: DemoProduct, mode?: StyleKitMode, initialSize?: string | null, activeGenders?: string[]) => void;
  closeStyleKit: () => void;
  setMode: (mode: StyleKitMode) => void;
  addToLook: (product: DemoProduct) => void;
  removeFromLook: (productId: string) => void;
  changeAnchor: (product: DemoProduct) => void;
  replaceInLook: (product: DemoProduct) => void;
}

export const StyleKitContext = createContext<StyleKitContextType | undefined>(undefined);

export function useStyleKit() {
  const ctx = useContext(StyleKitContext);
  if (!ctx) throw new Error('useStyleKit must be used within StyleKitProvider');
  return ctx;
}
