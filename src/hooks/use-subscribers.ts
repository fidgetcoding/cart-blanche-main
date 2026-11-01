import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/demo/client';

export interface Subscriber {
  id: string;
  merchant_id: string;
  email: string;
  welcome_code: string;
  created_at: string;
}

/**
 * Fetches all subscribers for the authenticated merchant, sorted newest
 * first. Mirrors useProductWaitlist's structure: stateful list + loading
 * flag + delete operation. RLS scopes to merchant_id automatically via
 * the auth.uid() match in the SELECT policy.
 */
export function useSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubscribers([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .eq('merchant_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch subscribers:', error);
      setSubscribers([]);
    } else {
      setSubscribers((data || []) as Subscriber[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const deleteSubscriber = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('subscribers')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Failed to delete subscriber:', error);
      return false;
    }
    await fetchAll();
    return true;
  }, [fetchAll]);

  return { subscribers, loading, refetch: fetchAll, deleteSubscriber };
}
