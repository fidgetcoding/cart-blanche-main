// In-memory stand-in for the database, used when a visitor has no session.
// Nothing here touches the network and everything resets on page reload.
import { generateMockOrders } from '@/data/mock-orders';

export const DEMO_MERCHANT_ID = '00000000-0000-4000-8000-00000000d3a0';

type Row = Record<string, unknown>;
export type QueryOp = [method: string, args: unknown[]];

export interface DemoError {
  message: string;
  code?: string;
}

export interface DemoResult {
  data: unknown;
  error: DemoError | null;
  count: number | null;
  status: number;
  statusText: string;
}

const WRITE_METHODS = new Set(['insert', 'update', 'upsert', 'delete']);

// Mirrors the unique indexes the UI's duplicate handling relies on.
const UNIQUE_KEYS: Record<string, string[]> = {
  subscribers: ['merchant_id', 'email'],
  waitlist_signups: ['merchant_id', 'product_id', 'email'],
  discount_codes: ['merchant_id', 'code'],
};

// Mirrors the column defaults the UI reads back after an insert.
const INSERT_DEFAULTS: Record<string, Row> = {
  subscribers: { welcome_code: 'WELCOME10' },
  waitlist_signups: { status: 'pending', notified_at: null, size_preference: '' },
  discount_codes: { times_used: 0 },
};

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function seedDiscounts(): Row[] {
  const base = {
    merchant_id: DEMO_MERCHANT_ID,
    max_uses: null,
    starts_at: daysAgo(30),
    expires_at: null,
    updated_at: daysAgo(30),
  };
  return [
    { ...base, id: 'demo-code-1', code: 'WELCOME10', description: 'New subscriber welcome', discount_type: 'percentage', discount_value: 10, minimum_spend: 0, times_used: 48, is_active: true, created_at: daysAgo(30) },
    { ...base, id: 'demo-code-2', code: 'SPRING20', description: 'Seasonal promotion', discount_type: 'percentage', discount_value: 20, minimum_spend: 150, max_uses: 200, times_used: 37, is_active: true, created_at: daysAgo(21) },
    { ...base, id: 'demo-code-3', code: 'TAKE25', description: '$25 off orders over $200', discount_type: 'fixed', discount_value: 25, minimum_spend: 200, times_used: 12, is_active: true, created_at: daysAgo(14) },
    { ...base, id: 'demo-code-4', code: 'FREESHIP', description: 'Free shipping', discount_type: 'free_shipping', discount_value: 0, minimum_spend: 75, times_used: 91, is_active: true, created_at: daysAgo(10) },
    { ...base, id: 'demo-code-5', code: 'SUMMER15', description: 'Ended promotion', discount_type: 'percentage', discount_value: 15, minimum_spend: 0, times_used: 203, expires_at: daysAgo(5), is_active: true, created_at: daysAgo(90) },
    { ...base, id: 'demo-code-6', code: 'VIP30', description: 'Paused promotion', discount_type: 'percentage', discount_value: 30, minimum_spend: 0, max_uses: 50, times_used: 50, is_active: false, created_at: daysAgo(60) },
  ];
}

function seedSubscribers(): Row[] {
  return ['maya.chen', 'jordan.rivera', 'sam.okafor', 'priya.nair', 'alex.morgan', 'taylor.brooks', 'noor.haddad', 'lena.fischer']
    .map((name, i) => ({
      id: `demo-subscriber-${i + 1}`,
      merchant_id: DEMO_MERCHANT_ID,
      email: `${name}@example.com`,
      welcome_code: 'WELCOME10',
      created_at: daysAgo(i * 3 + 1),
    }));
}

function seedWaitlist(): Row[] {
  const signups: [string, string, string, string, string][] = [
    ['p1', 'Maya Chen', 'maya.chen@example.com', 'M', 'pending'],
    ['p1', 'Jordan Rivera', 'jordan.rivera@example.com', 'L', 'pending'],
    ['p2', 'Sam Okafor', 'sam.okafor@example.com', 'S', 'pending'],
    ['p4', 'Priya Nair', 'priya.nair@example.com', 'M', 'fulfilled'],
    ['p9', 'Alex Morgan', 'alex.morgan@example.com', 'XL', 'pending'],
    ['p7', 'Taylor Brooks', 'taylor.brooks@example.com', 'M', 'cancelled'],
  ];
  return signups.map(([product_id, name, email, size_preference, status], i) => ({
    id: `demo-waitlist-${i + 1}`,
    merchant_id: DEMO_MERCHANT_ID,
    product_id,
    name,
    email,
    size_preference,
    colorway_preference: null,
    status,
    notified_at: status === 'fulfilled' ? daysAgo(1) : null,
    created_at: daysAgo(i * 2 + 1),
  }));
}

function seedTables(): Record<string, Row[]> {
  return {
    merchants: [{
      id: DEMO_MERCHANT_ID,
      email: 'demo@example.com',
      store_name: 'Cart Blanche Demo',
      store_slug: 'demo',
      store_description: 'Sample store with sample data.',
      store_tagline: 'Sample data only',
      store_category: 'fashion',
      brand_config: {},
      stripe_connected_account_id: null,
      onboarding_completed: true,
      created_at: daysAgo(120),
      updated_at: daysAgo(1),
    }],
    discount_codes: seedDiscounts(),
    subscribers: seedSubscribers(),
    waitlist_signups: seedWaitlist(),
    orders: generateMockOrders(100).map(order => ({ ...order, merchant_id: DEMO_MERCHANT_ID })),
  };
}

let tables: Record<string, Row[]> | null = null;

function rowsFor(table: string): Row[] {
  tables ??= seedTables();
  return (tables[table] ??= []);
}

export function resetDemoStore(): void {
  tables = null;
}

export function isWriteQuery(ops: QueryOp[]): boolean {
  return ops.some(([method]) => WRITE_METHODS.has(method));
}

function success(data: unknown, count: number | null = null): DemoResult {
  return { data, error: null, count, status: 200, statusText: 'OK' };
}

function failure(error: DemoError, status = 400): DemoResult {
  return { data: null, error, count: null, status, statusText: 'Bad Request' };
}

function sameKey(a: unknown, b: unknown): boolean {
  return typeof a === 'string' && typeof b === 'string' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function matchesKeys(row: Row, payload: Row, keys: string[]): boolean {
  return keys.every(key => sameKey(row[key], payload[key]));
}

function compareValues(a: unknown, b: unknown, ascending: boolean): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  const order = (a as string) < (b as string) ? -1 : 1;
  return ascending ? order : -order;
}

function asRows(payload: unknown): Row[] {
  return (Array.isArray(payload) ? payload : [payload]) as Row[];
}

function newRow(table: string, payload: Row): Row {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), created_at: now, updated_at: now, ...INSERT_DEFAULTS[table], ...structuredClone(payload) };
}

function applyCardinality(rows: Row[], cardinality: 'single' | 'maybe' | null): DemoResult {
  if (!cardinality) return success(structuredClone(rows), rows.length);
  if (rows.length === 1) return success(structuredClone(rows[0]), 1);
  if (rows.length === 0 && cardinality === 'maybe') return success(null, 0);
  return failure({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }, 406);
}

/** Runs a recorded supabase-js query chain against the in-memory tables. */
export function runDemoQuery(table: string, ops: QueryOp[]): DemoResult {
  const rows = rowsFor(table);
  const filters: ((row: Row) => boolean)[] = [];
  const orders: { column: string; ascending: boolean }[] = [];
  let action: 'read' | 'insert' | 'upsert' | 'update' | 'delete' = 'read';
  let payload: unknown;
  let onConflict: string[] = [];
  let returning = false;
  let limit: number | null = null;
  let cardinality: 'single' | 'maybe' | null = null;

  for (const [method, args] of ops) {
    switch (method) {
      case 'select':
        if (action !== 'read') returning = true;
        break;
      case 'insert':
      case 'update':
        action = method;
        payload = args[0];
        break;
      case 'upsert':
        action = 'upsert';
        payload = args[0];
        onConflict = String((args[1] as { onConflict?: string } | undefined)?.onConflict ?? 'id').split(',');
        break;
      case 'delete':
        action = 'delete';
        break;
      case 'eq':
        filters.push(row => row[args[0] as string] === args[1]);
        break;
      case 'in': {
        const allowed = new Set(args[1] as unknown[]);
        filters.push(row => allowed.has(row[args[0] as string]));
        break;
      }
      case 'order':
        orders.push({ column: args[0] as string, ascending: (args[1] as { ascending?: boolean } | undefined)?.ascending ?? true });
        break;
      case 'limit':
        limit = args[0] as number;
        break;
      case 'single':
        cardinality = 'single';
        break;
      case 'maybeSingle':
        cardinality = 'maybe';
        break;
      default:
        return failure({ message: `Demo data does not support .${method}()` });
    }
  }

  const matched = () => rows.filter(row => filters.every(filter => filter(row)));
  let affected: Row[] = [];

  if (action === 'read') {
    affected = matched();
    if (orders.length > 0) {
      affected = [...affected].sort((a, b) => {
        for (const { column, ascending } of orders) {
          const order = compareValues(a[column], b[column], ascending);
          if (order !== 0) return order;
        }
        return 0;
      });
    }
    if (limit !== null) affected = affected.slice(0, limit);
    return applyCardinality(affected, cardinality);
  }

  if (action === 'insert') {
    const incoming = asRows(payload);
    const unique = UNIQUE_KEYS[table];
    if (unique && incoming.some(item => rows.some(row => matchesKeys(row, item, unique)))) {
      return failure({ code: '23505', message: 'duplicate key value violates unique constraint' }, 409);
    }
    affected = incoming.map(item => newRow(table, item));
    rows.push(...affected);
  } else if (action === 'upsert') {
    affected = asRows(payload).map(item => {
      const existing = rows.find(row => matchesKeys(row, item, onConflict));
      if (existing) return Object.assign(existing, structuredClone(item));
      const created = newRow(table, item);
      rows.push(created);
      return created;
    });
  } else if (action === 'update') {
    const changes = structuredClone(payload as Row);
    affected = matched().map(row => Object.assign(row, { updated_at: new Date().toISOString() }, changes));
  } else {
    affected = matched();
    tables![table] = rows.filter(row => !affected.includes(row));
  }

  return returning ? applyCardinality(affected, cardinality) : success(null);
}

/** Same rules as the validate_discount SQL function, against the demo codes. */
export function runDemoRpc(fn: string, args: Record<string, unknown> | undefined): DemoResult {
  if (fn !== 'validate_discount') return failure({ message: `Demo data does not support ${fn}()` });
  const code = String(args?.p_code ?? '').trim().toLowerCase();
  const found = rowsFor('discount_codes').find(row =>
    row.merchant_id === args?.p_merchant_id && row.is_active && String(row.code).toLowerCase() === code);
  if (!found) return success([], 0);

  const now = Date.now();
  let status = 'ok';
  if (found.starts_at && new Date(found.starts_at as string).getTime() > now) status = 'not_started';
  else if (found.expires_at && new Date(found.expires_at as string).getTime() <= now) status = 'expired';
  else if (found.max_uses !== null && (found.times_used as number) >= (found.max_uses as number)) status = 'exhausted';

  const usable = status === 'ok';
  return success([{
    code: found.code,
    discount_type: usable ? found.discount_type : null,
    discount_value: usable ? found.discount_value : null,
    description: usable ? found.description : null,
    minimum_spend: usable ? found.minimum_spend : null,
    status,
  }], 1);
}
