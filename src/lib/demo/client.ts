// Drop-in for the generated supabase client. Visitors with a session get the
// real client untouched; visitors without one get the in-memory demo store,
// so /admin works logged out and can never write to the database or storage.
import type { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase as realClient } from '@/integrations/supabase/client';
import { DEMO_MERCHANT_ID, isWriteQuery, runDemoQuery, runDemoRpc, type QueryOp } from './store';

export const DEMO_TOAST = "Demo mode: changes aren't saved";
export const DEMO_CHAT_MESSAGE =
  "This is the demo, so the AI store manager is switched off and nothing you type leaves your browser. Signed-in merchants can ask it about sales, stock and pricing, and confirm the changes it proposes.";

// The chat panel shows its own canned reply, so a toast there is just noise.
const QUIET_TABLES = new Set(['conversations', 'chat_messages']);

type RealClient = NonNullable<typeof realClient>;

// Stands in for the auth client when no backend is configured.
const offlineAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  signOut: async () => ({ error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
} as unknown as RealClient['auth'];

/** The real auth state, never the demo session. Works with no backend too. */
export const realAuth = realClient?.auth ?? offlineAuth;

const DEMO_USER = { id: DEMO_MERCHANT_ID, email: 'demo@example.com', aud: 'demo', role: 'demo' } as unknown as User;
const DEMO_SESSION = { access_token: 'demo', token_type: 'bearer', user: DEMO_USER } as unknown as Session;

function isAdminPath(): boolean {
  return window.location.pathname.startsWith('/admin');
}

/**
 * With no backend everything is demo data. Otherwise /admin always falls back to
 * it, and the storefront only does when no VITE_STORE_MERCHANT_ID is configured.
 */
function demoAppliesToPage(): boolean {
  return !realClient || isAdminPath() || !import.meta.env.VITE_STORE_MERCHANT_ID;
}

export async function isDemoMode(): Promise<boolean> {
  const { data: { session } } = await realAuth.getSession();
  return !session && demoAppliesToPage();
}

export function isDemoSession(session: Session | null): boolean {
  return session?.user.id === DEMO_MERCHANT_ID;
}

function announceDemoWrite(table?: string): void {
  if (isAdminPath() && !(table && QUIET_TABLES.has(table))) {
    toast(DEMO_TOAST, { id: 'demo-mode' });
  }
}

type QueryBuilder = { [method: string]: (...args: unknown[]) => QueryBuilder };

function deferredQuery(table: string) {
  const ops: QueryOp[] = [];

  const execute = async () => {
    if (await isDemoMode()) {
      const result = runDemoQuery(table, ops);
      if (isWriteQuery(ops) && !result.error) announceDemoWrite(table);
      return result;
    }
    return ops.reduce((builder, [method, args]) => builder[method](...args), realClient!.from(table as never) as unknown as QueryBuilder);
  };

  const chain = new Proxy({} as QueryBuilder, {
    get(_target, prop) {
      if (prop === 'then') {
        return ((resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          execute().then(resolve, reject)) as unknown as QueryBuilder[string];
      }
      if (typeof prop !== 'string') return undefined;
      return (...args: unknown[]) => {
        ops.push([prop, args]);
        return chain;
      };
    },
  });
  return chain;
}

const demoUploads = new Map<string, string>();

function storageBucket(bucket: string) {
  const real = realClient?.storage.from(bucket);
  return {
    upload: async (path: string, file: File, options?: Parameters<NonNullable<typeof real>['upload']>[2]) => {
      if (real && !(await isDemoMode())) return real.upload(path, file, options);
      demoUploads.set(`${bucket}/${path}`, URL.createObjectURL(file));
      announceDemoWrite();
      return { data: { path }, error: null };
    },
    getPublicUrl: (path: string) => {
      const blobUrl = demoUploads.get(`${bucket}/${path}`);
      return blobUrl || !real ? { data: { publicUrl: blobUrl ?? '' } } : real.getPublicUrl(path);
    },
  };
}

const demoAwareAuth = new Proxy(realAuth, {
  get(auth, prop) {
    if (prop === 'getSession') {
      return async () => {
        const result = await auth.getSession();
        if (result.data.session || !demoAppliesToPage()) return result;
        return { data: { session: DEMO_SESSION }, error: null };
      };
    }
    if (prop === 'getUser') {
      return async () => {
        if (await isDemoMode()) return { data: { user: DEMO_USER }, error: null };
        return auth.getUser();
      };
    }
    const value = Reflect.get(auth, prop);
    return typeof value === 'function' ? value.bind(auth) : value;
  },
});

export const supabase = {
  auth: demoAwareAuth,
  from: deferredQuery,
  rpc: async (fn: string, args?: Record<string, unknown>) =>
    (await isDemoMode()) ? runDemoRpc(fn, args) : realClient!.rpc(fn as never, args as never),
  storage: { from: storageBucket },
} as unknown as RealClient;
