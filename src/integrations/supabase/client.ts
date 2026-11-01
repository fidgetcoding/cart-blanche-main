import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isBackendConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// Null when no backend is set up: the app then runs entirely on demo data.
// App code should import the demo-aware client from "@/lib/demo/client" instead.
export const supabase = isBackendConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
