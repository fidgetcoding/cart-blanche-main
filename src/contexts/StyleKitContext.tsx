import React, { createContext, useContext, useState, useCallback } from 'react';
import type { DemoProduct } from '@/data/demo-data';

export type StyleKitMode = 'counterparts' | 'extras';

interface StyleKitState {
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

const StyleKitContext = createContext<StyleKitContextType | undefined>(undefined);

export function StyleKitProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StyleKitState>({
    isOpen: false,
    anchorProduct: null,
    mode: 'counterparts',
    lookItems: [],
    initialAnchorSize: null,
    activeGenders: [],
  });

  const openStyleKit = useCallback((product: DemoProduct, mode: StyleKitMode = 'counterparts', initialSize?: string | null, activeGenders: string[] = []) => {
    setState({
      isOpen: true,
      anchorProduct: product,
      mode,
      lookItems: [product],
      initialAnchorSize: initialSize ?? null,
      activeGenders,
    });
  }, []);

  const closeStyleKit = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, anchorProduct: null, lookItems: [], initialAnchorSize: null, activeGenders: [] }));
  }, []);

  const setMode = useCallback((mode: StyleKitMode) => {
    setState(prev => ({ ...prev, mode }));
  }, []);

  const addToLook = useCallback((product: DemoProduct) => {
    setState(prev => {
      if (prev.lookItems.some(p => p.id === product.id)) return prev;
      return { ...prev, lookItems: [...prev.lookItems, product] };
    });
  }, []);

  const removeFromLook = useCallback((productId: string) => {
    setState(prev => ({
      ...prev,
      lookItems: prev.lookItems.filter(p => p.id !== productId),
    }));
  }, []);

  const changeAnchor = useCallback((product: DemoProduct) => {
    setState(prev => ({
      ...prev,
      anchorProduct: product,
      lookItems: prev.lookItems.some(p => p.id === product.id)
        ? prev.lookItems
        : [product, ...prev.lookItems],
    }));
  }, []);

  const replaceInLook = useCallback((product: DemoProduct) => {
    setState(prev => {
      const anchor = prev.anchorProduct;
      const newItems = anchor
        ? [anchor, ...(product.id === anchor.id ? [] : [product])]
        : [product];
      return { ...prev, lookItems: newItems };
    });
  }, []);

  return (
    <StyleKitContext.Provider value={{ ...state, openStyleKit, closeStyleKit, setMode, addToLook, removeFromLook, changeAnchor, replaceInLook }}>
      {children}
    </StyleKitContext.Provider>
  );
}

export function useStyleKit() {
  const ctx = useContext(StyleKitContext);
  if (!ctx) throw new Error('useStyleKit must be used within StyleKitProvider');
  return ctx;
}
