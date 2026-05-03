import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// V1 hardcoded welcome code. When merchants get a configurable
// "subscriber welcome promo" UI, swap this for a dynamic lookup.
export const WELCOME_CODE = 'WELCOME10';

interface SubmitResult {
  ok: boolean;
  duplicate: boolean;
  welcomeCode: string | null;
}

/**
 * Submits a subscriber row to public.subscribers, scoped to the
 * authenticated merchant (whose storefront the shopper is browsing).
 *
 * Multi-tenancy model mirrors useWaitlistSignup: merchant_id = the
 * authenticated user's id. Anonymous shoppers cannot submit unless
 * the storefront session itself has a merchant auth context.
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
      if (!user) {
        return { ok: false, duplicate: false, welcomeCode: null };
      }

      const normalized = email.trim().toLowerCase();

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
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting };
}
