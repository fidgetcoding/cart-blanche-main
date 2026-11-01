import { useEffect, useState } from 'react';
import { supabase } from '@/lib/demo/client';
import { DEMO_MERCHANT_ID } from '@/lib/demo/store';
import { resolveStoreMerchantId } from '@/lib/store-merchant';

/** The name a real store saved in its settings, or the fallback until there is one. */
export function useStoreName(fallback: string): string {
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const merchantId = await resolveStoreMerchantId();
      if (!merchantId || merchantId === DEMO_MERCHANT_ID) return;
      const { data } = await supabase.rpc('store_name', { p_merchant_id: merchantId });
      if (!cancelled && typeof data === 'string') setSaved(data);
    })().catch(() => {
      // The wordmark just keeps its fallback.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return saved ?? fallback;
}
