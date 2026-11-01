import { supabase } from '@/lib/demo/client';

/**
 * Whose rows the storefront may show: the signed-in merchant, or the store set
 * in VITE_STORE_MERCHANT_ID. With neither, anon visitors resolve to the demo
 * merchant through the demo-aware client, so they only ever see bundled data.
 */
export async function resolveStoreMerchantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || import.meta.env.VITE_STORE_MERCHANT_ID || null;
}
