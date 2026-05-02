import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CartProvider } from '@/contexts/CartContext';
import { SmartCartProvider } from '@/contexts/SmartCartContext';
import { StyleKitProvider } from '@/contexts/StyleKitContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { SpatialCanvas } from '@/components/storefront/SpatialCanvas';
import { MaisonCanvas } from '@/components/storefront/MaisonCanvas';
import { StyleKitView } from '@/components/storefront/StyleKitView';
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
          </StyleKitProvider>
        </SmartCartProvider>
      </CartProvider>
    </div>
  );
};

const Index = () => {
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();
  const [activeTemplate, setActiveTemplateState] = useState<ActiveTemplate>(() => getActiveTemplate());

  useEffect(() => {
    const unsub = subscribeActiveTemplate(setActiveTemplateState);
    return unsub;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth', { replace: true });
      } else {
        setIsReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!isReady) return null;

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
