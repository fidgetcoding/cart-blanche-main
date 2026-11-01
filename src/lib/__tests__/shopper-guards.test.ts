import { describe, expect, it } from 'vitest';
import { checkSignup, sniffImageType } from '../../../supabase/functions/_shared/shopper-guards.ts';

const merchant_id = '11111111-1111-4111-8111-111111111111';
const waitlist = { kind: 'waitlist', merchant_id, email: 'A@Example.com ', name: 'Ann', product_id: 'p1' };

describe('checkSignup', () => {
  it('accepts a subscriber and normalises the email', () => {
    expect(checkSignup({ kind: 'subscriber', merchant_id, email: ' Ann@Example.COM' })).toEqual({
      ok: true,
      signup: { kind: 'subscriber', merchant_id, email: 'ann@example.com' },
    });
  });

  it('accepts a waitlist signup and keeps only known fields', () => {
    const result = checkSignup({ ...waitlist, size_preference: 'M', status: 'fulfilled', id: 'x' });
    expect(result).toEqual({
      ok: true,
      signup: { kind: 'waitlist', merchant_id, email: 'a@example.com', name: 'Ann', product_id: 'p1', size_preference: 'M', colorway_preference: null },
    });
  });

  it.each([
    ['a missing body', null],
    ['a bad store id', { kind: 'subscriber', merchant_id: 'x', email: 'a@example.com' }],
    ['a bad email', { kind: 'subscriber', merchant_id, email: 'nope' }],
    ['a huge email', { kind: 'subscriber', merchant_id, email: `${'a'.repeat(300)}@example.com` }],
    ['an unknown kind', { kind: 'admin', merchant_id, email: 'a@example.com' }],
    ['a waitlist with no name', { ...waitlist, name: ' ' }],
    ['a waitlist with no product', { ...waitlist, product_id: undefined }],
    ['a non-string name', { ...waitlist, name: 5 }],
  ])('refuses %s', (_label, input) => {
    expect(checkSignup(input).ok).toBe(false);
  });
});

describe('sniffImageType', () => {
  const bytes = (...values: number[]) => new Uint8Array(values);
  const ascii = (text: string) => [...text].map(c => c.charCodeAt(0));

  it.each([
    ['image/jpeg', bytes(0xff, 0xd8, 0xff, 0xe0)],
    ['image/png', bytes(0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a)],
    ['image/webp', bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'))],
    ['image/gif', bytes(...ascii('GIF89a'))],
  ])('recognises %s', (contentType, data) => {
    expect(sniffImageType(data)?.contentType).toBe(contentType);
  });

  it.each([
    ['html', bytes(...ascii('<script>alert(1)</script>'))],
    ['svg', bytes(...ascii('<svg xmlns='))],
    ['an empty file', bytes()],
    ['RIFF that is not WebP', bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE'))],
  ])('refuses %s', (_label, data) => {
    expect(sniffImageType(data)).toBeNull();
  });
});
