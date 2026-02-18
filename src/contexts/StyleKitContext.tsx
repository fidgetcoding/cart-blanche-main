import React, { createContext, useContext, useState, useCallback } from 'react';
import type { DemoProduct } from '@/data/demo-data';

export type StyleKitMode = 'counterparts' | 'extras';

interface StyleKitState {
  isOpen: boolean;
  anchorProduct: DemoProduct | null;
  mode: StyleKitMode;
  lookItems: DemoProduct[];
  initialAnchorSize: string | null;
}

interface StyleKitContextType extends StyleKitState {
  openStyleKit: (product: DemoProduct, mode?: StyleKitMode, initialSize?: string | null) => void;
  closeStyleKit: () => void;
  setMode: (mode: StyleKitMode) => void;
  addToLook: (product: DemoProduct) => void;
  removeFromLook: (productId: string) => void;
  changeAnchor: (product: DemoProduct) => void;
}

const StyleKitContext = createContext<StyleKitContextType | undefined>(undefined);

export function StyleKitProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StyleKitState>({
    isOpen: false,
    anchorProduct: null,
    mode: 'counterparts',
    lookItems: [],
    initialAnchorSize: null,
  });

  const openStyleKit = useCallback((product: DemoProduct, mode: StyleKitMode = 'counterparts', initialSize?: string | null) => {
    setState({
      isOpen: true,
      anchorProduct: product,
      mode,
      lookItems: [product],
      initialAnchorSize: initialSize ?? null,
    });
  }, []);

  const closeStyleKit = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, anchorProduct: null, lookItems: [], initialAnchorSize: null }));
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

  return (
    <StyleKitContext.Provider value={{ ...state, openStyleKit, closeStyleKit, setMode, addToLook, removeFromLook, changeAnchor }}>
      {children}
    </StyleKitContext.Provider>
  );
}

export function useStyleKit() {
  const ctx = useContext(StyleKitContext);
  if (!ctx) throw new Error('useStyleKit must be used within StyleKitProvider');
  return ctx;
}
