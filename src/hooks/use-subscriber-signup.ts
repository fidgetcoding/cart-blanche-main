import { useState } from 'react';
import { supabase } from '@/lib/demo/client';
import { submitStoreSignup } from '@/lib/shopper-api';

// V1 hardcoded welcome code. When merchants get a configurable
// "subscriber welcome promo" UI, swap this for a dynamic lookup.
export const WELCOME_CODE = 'WELCOME10';

interface SubmitResult {
  ok: boolean;
  duplicate: boolean;
  welcomeCode: string | null;
}

/**
 * Adds a subscriber for the store being browsed. A signed-in merchant writes
 * their own row directly. A logged-out shopper goes through the store-signup
 * edge function, for the store set in VITE_STORE_MERCHANT_ID.
 *
 * Duplicate signup (same email + merchant) returns ok=true with
 * duplicate=true so the caller can show the friendly "already
 * subscribed — here's your code" path. The same WELCOME_CODE is
 * returned in both new and duplicate cases.
 */
export function useSubscriberSignup() {
  const [submitting, setSubmitting] = useState(false);

  async function submit(email: string): Promise<SubmitResult> {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const normalized = email.trim().toLowerCase();

      if (!user) {
        const merchantId = import.meta.env.VITE_STORE_MERCHANT_ID;
        const result = merchantId
          ? await submitStoreSignup({ kind: 'subscriber', merchant_id: merchantId, email: normalized })
          : { ok: false };
        return result.ok
          ? { ok: true, duplicate: false, welcomeCode: WELCOME_CODE }
          : { ok: false, duplicate: false, welcomeCode: null };
      }

      const { error } = await supabase.from('subscribers').insert({
        merchant_id: user.id,
        email: normalized,
      });

      if (error) {
        // Postgres unique_violation — already subscribed.
        // Honor the friendly UX: same success state, same code.
        if (error.code === '23505') {
          return { ok: true, duplicate: true, welcomeCode: WELCOME_CODE };
        }
        console.error('Subscriber signup error:', error);
        return { ok: false, duplicate: false, welcomeCode: null };
      }

      return { ok: true, duplicate: false, welcomeCode: WELCOME_CODE };
    } catch {
      return { ok: false, duplicate: false, welcomeCode: null };
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting };
}
