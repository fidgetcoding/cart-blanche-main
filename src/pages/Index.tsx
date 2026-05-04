import { useEffect, useState } from 'react';
import { CartProvider } from '@/contexts/CartContext';
import { SmartCartProvider } from '@/contexts/SmartCartContext';
import { StyleKitProvider } from '@/contexts/StyleKitContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { SpatialCanvas } from '@/components/storefront/SpatialCanvas';
import { MaisonCanvas } from '@/components/storefront/MaisonCanvas';
import { StyleKitView } from '@/components/storefront/StyleKitView';
import { SubscriberPopup } from '@/components/storefront/SubscriberPopup';
import { getActiveTemplate, subscribeActiveTemplate, type ActiveTemplate } from '@/lib/active-template';

const StorefrontShell = ({ activeTemplate }: { activeTemplate: ActiveTemplate }) => {
  const { theme } = useTheme();
  return (
    <div className={`${theme} h-screen w-full bg-background text-foreground`}>
      <CartProvider>
        <SmartCartProvider>
          <StyleKitProvider>
            {activeTemplate === 'sl' ? <MaisonCanvas /> : <SpatialCanvas />}
            <StyleKitView />
            <SubscriberPopup variant={activeTemplate} />
          </StyleKitProvider>
        </SmartCartProvider>
      </CartProvider>
    </div>
  );
};

const Index = () => {
  const [activeTemplate, setActiveTemplateState] = useState<ActiveTemplate>(() => getActiveTemplate());

  useEffect(() => {
    const unsub = subscribeActiveTemplate(setActiveTemplateState);
    return unsub;
  }, []);

  const themeKey = activeTemplate === 'sl' ? 'cb-theme-sl' : 'cb-theme-yz';
  const themeDefaults = activeTemplate === 'sl'
    ? { mode: 'light' as const, tileBgMode: 'transparent' as const }
    : { mode: 'dark' as const };

  return (
    <ThemeProvider key={themeKey} storageKey={themeKey} defaults={themeDefaults}>
      <StorefrontShell activeTemplate={activeTemplate} />
    </ThemeProvider>
  );
};

export default Index;
