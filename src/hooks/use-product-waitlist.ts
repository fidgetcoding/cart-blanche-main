import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WaitlistSignup {
  id: string;
  merchant_id: string;
  product_id: string;
  email: string;
  name: string;
  size_preference: string;
  colorway_preference?: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
  notified_at: string | null;
  created_at: string;
}

export function useProductWaitlist() {
  const [signups, setSignups] = useState<WaitlistSignup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSignups([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('waitlist_signups')
      .select('*')
      .eq('merchant_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch waitlist:', error);
      setSignups([]);
    } else {
      setSignups((data || []) as WaitlistSignup[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const byProduct = signups.reduce<Record<string, WaitlistSignup[]>>((acc, s) => {
    if (!acc[s.product_id]) acc[s.product_id] = [];
    acc[s.product_id].push(s);
    return acc;
  }, {});

  const countFor = (productId: string) => byProduct[productId]?.length || 0;
  const forProduct = (productId: string) => byProduct[productId] || [];

  const markFulfilled = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('waitlist_signups')
      .update({ status: 'fulfilled', notified_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('Failed to mark fulfilled:', error);
      return false;
    }
    await fetchAll();
    return true;
  }, [fetchAll]);

  const deleteSignup = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('waitlist_signups')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Failed to delete signup:', error);
      return false;
    }
    await fetchAll();
    return true;
  }, [fetchAll]);

  return { signups, byProduct, countFor, forProduct, loading, refetch: fetchAll, markFulfilled, deleteSignup };
}
