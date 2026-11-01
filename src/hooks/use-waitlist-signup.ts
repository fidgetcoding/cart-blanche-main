import { useState } from 'react';
import { supabase } from '@/lib/demo/client';
import { toast } from 'sonner';

interface SubmitInput {
  productId: string;
  email: string;
  name: string;
  sizePreference?: string;
  colorPreference?: string;
}

interface SubmitResult {
  ok: boolean;
  duplicate: boolean;
}

export function useWaitlistSignup() {
  const [submitting, setSubmitting] = useState(false);

  async function submit(input: SubmitInput): Promise<SubmitResult> {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Waitlist is unavailable right now. Please try again later.');
        return { ok: false, duplicate: false };
      }

      const { error } = await supabase.from('waitlist_signups').insert({
        merchant_id: user.id,
        product_id: input.productId,
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        size_preference: input.sizePreference?.trim() || null,
        colorway_preference: input.colorPreference?.trim() || null,
      } as any);

      if (error) {
        if (error.code === '23505') {
          toast.success("You're on the list — we'll email you when this is back in stock.");
          return { ok: true, duplicate: true };
        }
        toast.error('Something went wrong. Please try again.');
        console.error('Waitlist signup error:', error);
        return { ok: false, duplicate: false };
      }

      toast.success("You're on the list — we'll email you when this is back in stock.");
      return { ok: true, duplicate: false };
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting };
}
