import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_MERCHANT_ID, isWriteQuery, resetDemoStore, runDemoQuery, runDemoRpc, type QueryOp } from '../store';

const q = (...ops: QueryOp[]) => ops;

describe('demo store', () => {
  beforeEach(() => resetDemoStore());

  it('reads seeded rows with filters, ordering and limit', () => {
    const { data, error } = runDemoQuery('subscribers', q(
      ['select', ['*']],
      ['eq', ['merchant_id', DEMO_MERCHANT_ID]],
      ['order', ['created_at', { ascending: false }]],
      ['limit', [3]],
    ));
    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect(data[0].created_at >= data[1].created_at).toBe(true);
    expect((data as { email: string }[]).every(row => row.email.endsWith('@example.com'))).toBe(true);
  });

  it('returns no rows for a different merchant', () => {
    const { data } = runDemoQuery('discount_codes', q(['select', ['*']], ['eq', ['merchant_id', 'someone-else']]));
    expect(data).toEqual([]);
  });

  it('applies inserts in memory and returns the row with defaults when selected', () => {
    const { data } = runDemoQuery('discount_codes', q(
      ['insert', [{ merchant_id: DEMO_MERCHANT_ID, code: 'NEW5', discount_value: 5 }]],
      ['select', []],
      ['single', []],
    ));
    expect(data).toMatchObject({ code: 'NEW5', times_used: 0 });
    expect((data as { id: string }).id).toBeTruthy();
    const after = runDemoQuery('discount_codes', q(['select', ['*']], ['eq', ['code', 'NEW5']]));
    expect(after.data).toHaveLength(1);
  });

  it('reports a duplicate signup the way Postgres does', () => {
    const row = { merchant_id: DEMO_MERCHANT_ID, email: 'MAYA.CHEN@example.com' };
    const { error } = runDemoQuery('subscribers', q(['insert', [row]]));
    expect(error?.code).toBe('23505');
  });

  it('updates and deletes only the matched rows', () => {
    runDemoQuery('discount_codes', q(['update', [{ is_active: false }]], ['eq', ['id', 'demo-code-1']]));
    const updated = runDemoQuery('discount_codes', q(['select', ['*']], ['eq', ['id', 'demo-code-1']], ['single', []]));
    expect((updated.data as { is_active: boolean }).is_active).toBe(false);

    const before = (runDemoQuery('discount_codes', q(['select', ['*']])).data as unknown[]).length;
    runDemoQuery('discount_codes', q(['delete', []], ['eq', ['id', 'demo-code-2']]));
    expect(runDemoQuery('discount_codes', q(['select', ['*']])).data).toHaveLength(before - 1);
  });

  it('upserts on the conflict columns', () => {
    const upsert = (order: string[]): QueryOp => [
      'upsert',
      [{ merchant_id: DEMO_MERCHANT_ID, layout_type: 'default', product_order: order }, { onConflict: 'merchant_id,layout_type' }],
    ];
    runDemoQuery('grid_layouts', q(upsert(['p1'])));
    runDemoQuery('grid_layouts', q(upsert(['p2'])));
    const { data } = runDemoQuery('grid_layouts', q(['select', ['*']]));
    expect(data).toHaveLength(1);
    expect(data[0].product_order).toEqual(['p2']);
  });

  it('does not let callers mutate stored rows through results', () => {
    const { data } = runDemoQuery('merchants', q(['select', ['*']], ['eq', ['id', DEMO_MERCHANT_ID]], ['single', []]));
    (data as { store_name: string }).store_name = 'changed';
    const again = runDemoQuery('merchants', q(['select', ['*']], ['eq', ['id', DEMO_MERCHANT_ID]], ['single', []]));
    expect((again.data as { store_name: string }).store_name).not.toBe('changed');
  });

  it('single() errors when nothing matches, maybeSingle() does not', () => {
    const select: QueryOp[] = [['select', ['*']], ['eq', ['id', 'missing']]];
    expect(runDemoQuery('merchants', [...select, ['single', []]]).error?.code).toBe('PGRST116');
    expect(runDemoQuery('merchants', [...select, ['maybeSingle', []]])).toMatchObject({ data: null, error: null });
  });

  it('refuses chain methods it cannot honour instead of guessing', () => {
    const { error } = runDemoQuery('merchants', q(['select', ['*']], ['textSearch', ['store_name', 'x']]));
    expect(error?.message).toContain('textSearch');
  });

  it('classifies write queries', () => {
    expect(isWriteQuery(q(['select', ['*']], ['eq', ['id', 1]]))).toBe(false);
    expect(isWriteQuery(q(['update', [{}]], ['eq', ['id', 1]]))).toBe(true);
  });

  describe('validate_discount', () => {
    const check = (code: string, merchant = DEMO_MERCHANT_ID) =>
      runDemoRpc('validate_discount', { p_merchant_id: merchant, p_code: code }).data;

    it('accepts a live code regardless of case', () => {
      expect(check('spring20')[0]).toMatchObject({ code: 'SPRING20', status: 'ok', discount_value: 20 });
    });

    it('treats wildcards literally', () => {
      expect(check('SPRING%')).toEqual([]);
    });

    it('hides the value of expired codes and ignores inactive ones', () => {
      expect(check('SUMMER15')[0]).toMatchObject({ status: 'expired', discount_value: null });
      expect(check('VIP30')).toEqual([]);
    });

    it('only matches the given merchant', () => {
      expect(check('SPRING20', 'someone-else')).toEqual([]);
    });
  });
});
