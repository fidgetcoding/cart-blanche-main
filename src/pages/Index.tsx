import { useEffect, useState } from 'react';
import { CartProvider } from '@/contexts/CartProvider';
import { SmartCartProvider } from '@/contexts/SmartCartProvider';
import { StyleKitProvider } from '@/contexts/StyleKitProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeProvider } from '@/contexts/ThemeProvider';
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
            {/* SL shows Build a Set in its own modal; a second full-screen copy sat behind it. */}
            {activeTemplate !== 'sl' && <StyleKitView />}
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
