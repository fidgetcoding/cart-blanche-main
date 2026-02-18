import { createContext, useContext, useRef, useCallback, useEffect, useState, type ReactNode } from 'react';
import { ALEEngine, type ALEEvent, type ALEAdjustment, type ALEIntensity } from '@/lib/ale-engine';

interface ALEContextValue {
  /** Push a behavioural event into the ALE engine */
  trackEvent: (event: Omit<ALEEvent, 'timestamp'>) => void;
  /** Get the layout adjustment for a specific product */
  getAdjustment: (productId: string) => ALEAdjustment | undefined;
  /** Get hotzone emphasis multiplier */
  getHotzoneEmphasis: (hotzoneId: string) => number;
  /** Whether ALE has activated (>= 10 events) */
  isActive: boolean;
  /** Current event count */
  eventCount: number;
  /** Reset all ALE session data */
  reset: () => void;
}

const ALEContext = createContext<ALEContextValue | null>(null);

export function useALE() {
  const ctx = useContext(ALEContext);
  if (!ctx) throw new Error('useALE must be used within <ALEProvider>');
  return ctx;
}

interface ALEProviderProps {
  children: ReactNode;
  enabled?: boolean;
  intensity?: ALEIntensity;
  pinnedProductIds?: string[];
}

export function ALEProvider({ children, enabled = true, intensity = 'medium', pinnedProductIds = [] }: ALEProviderProps) {
  const engineRef = useRef<ALEEngine | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  // Bump this to force consumers to re-read adjustments
  const [, setTick] = useState(0);

  // Lazily initialize engine
  if (!engineRef.current) {
    engineRef.current = new ALEEngine();
  }

  // Configure engine when props change
  useEffect(() => {
    const engine = engineRef.current!;
    engine.configure({
      enabled,
      intensity,
      pinnedProductIds,
      onUpdate: () => {
        setIsActive(engine.isActive());
        setTick(t => t + 1);
      },
    });
  }, [enabled, intensity, pinnedProductIds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => engineRef.current?.destroy();
  }, []);

  const trackEvent = useCallback((event: Omit<ALEEvent, 'timestamp'>) => {
    const engine = engineRef.current!;
    engine.pushEvent({ ...event, timestamp: Date.now() });
    setEventCount(engine.getEventCount());
    setIsActive(engine.isActive());
  }, []);

  const getAdjustment = useCallback((productId: string) => {
    return engineRef.current?.getAdjustment(productId);
  }, []);

  const getHotzoneEmphasis = useCallback((hotzoneId: string) => {
    return engineRef.current?.getHotzoneEmphasis(hotzoneId) ?? 1.0;
  }, []);

  const reset = useCallback(() => {
    engineRef.current?.reset();
    setIsActive(false);
    setEventCount(0);
    setTick(t => t + 1);
  }, []);

  return (
    <ALEContext.Provider value={{ trackEvent, getAdjustment, getHotzoneEmphasis, isActive, eventCount, reset }}>
      {children}
    </ALEContext.Provider>
  );
}
