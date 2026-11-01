import { describe, expect, it } from 'vitest';
import { checkMessages, clientIp, isProjectStorageUrl, pickProductFields } from '../../../supabase/functions/_shared/chat-guards.ts';

const PROJECT = 'https://abc.supabase.co';
const IMAGE = `${PROJECT}/storage/v1/object/public/chat-uploads/a.png`;
const limits = { maxMessages: 3, maxContentChars: 10, maxTotalChars: 15 };

describe('checkMessages', () => {
  it('rebuilds valid messages from known fields only', () => {
    const result = checkMessages([{ role: 'user', content: 'hi', extra: 'x', tool_calls: [] }], limits);
    expect(result).toEqual({ ok: true, messages: [{ role: 'user', content: 'hi' }] });
  });

  it.each(['system', 'tool', 'developer', undefined])('rejects role %s', (role) => {
    expect(checkMessages([{ role, content: 'hi' }], limits).ok).toBe(false);
  });

  it.each([[null], [[{ type: 'text', text: 'hi' }]], [42]])('rejects non-string content %j', (content) => {
    expect(checkMessages([{ role: 'user', content }], limits).ok).toBe(false);
  });

  it('rejects missing, empty and oversized lists', () => {
    expect(checkMessages(undefined, limits).ok).toBe(false);
    expect(checkMessages([], limits).ok).toBe(false);
    expect(checkMessages(Array(4).fill({ role: 'user', content: 'a' }), limits).ok).toBe(false);
  });

  it('caps each message and the running total', () => {
    expect(checkMessages([{ role: 'user', content: 'x'.repeat(11) }], limits).ok).toBe(false);
    expect(checkMessages(Array(2).fill({ role: 'user', content: 'x'.repeat(8) }), limits).ok).toBe(false);
  });

  it('rejects null and non-object entries without throwing', () => {
    expect(checkMessages([null], limits).ok).toBe(false);
    expect(checkMessages(['hi'], limits).ok).toBe(false);
  });

  describe('images', () => {
    const withImages = { ...limits, allowImagesFrom: PROJECT };

    it('keeps project storage images on user messages', () => {
      const result = checkMessages([{ role: 'user', content: 'a', image_url: IMAGE }], withImages);
      expect(result).toEqual({ ok: true, messages: [{ role: 'user', content: 'a', image_url: IMAGE }] });
    });

    it('rejects images from elsewhere, on assistant turns, or when images are off', () => {
      expect(checkMessages([{ role: 'user', content: 'a', image_url: 'https://evil.test/a.png' }], withImages).ok).toBe(false);
      expect(checkMessages([{ role: 'assistant', content: 'a', image_url: IMAGE }], withImages).ok).toBe(false);
      expect(checkMessages([{ role: 'user', content: 'a', image_url: IMAGE }], limits).ok).toBe(false);
    });
  });
});

describe('isProjectStorageUrl', () => {
  it('accepts public objects on the project host', () => {
    expect(isProjectStorageUrl(IMAGE, PROJECT)).toBe(true);
  });

  it.each([
    'https://evil.test/storage/v1/object/public/a.png',
    'https://abc.supabase.co.evil.test/storage/v1/object/public/a.png',
    'https://abc.supabase.co@evil.test/storage/v1/object/public/a.png',
    'https://user:pass@abc.supabase.co/storage/v1/object/public/a.png',
    'http://abc.supabase.co/storage/v1/object/public/a.png',
    'https://abc.supabase.co/rest/v1/merchants',
    'data:image/png;base64,AAAA',
    'not a url',
    42,
    null,
  ])('rejects %s', (url) => {
    expect(isProjectStorageUrl(url, PROJECT)).toBe(false);
  });
});

describe('pickProductFields', () => {
  it('keeps the allowlisted fields', () => {
    const product = { title: 'T', description: 'D', price: 10, compare_at_price: null, status: 'draft', category: 'c', tags: ['a'], pinned: true };
    expect(pickProductFields(product)).toEqual(product);
  });

  it('strips merchant_id, id and anything else', () => {
    expect(pickProductFields({ title: 'T', merchant_id: 'other', id: 'x', images: [] })).toEqual({ title: 'T' });
  });

  it('drops values of the wrong type', () => {
    expect(pickProductFields({ price: '10', title: 5, tags: [1], pinned: 'yes' })).toEqual({});
    expect(pickProductFields({ price: -1 })).toEqual({});
    expect(pickProductFields({ price: Number.NaN })).toEqual({});
  });

  it('handles non-objects', () => {
    expect(pickProductFields(null)).toEqual({});
    expect(pickProductFields('x')).toEqual({});
  });
});

describe('clientIp', () => {
  it('prefers the platform headers', () => {
    expect(clientIp(new Headers({ 'cf-connecting-ip': '1.1.1.1', 'x-real-ip': '2.2.2.2' }))).toBe('1.1.1.1');
    expect(clientIp(new Headers({ 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '9.9.9.9' }))).toBe('2.2.2.2');
  });

  it('ignores the client-controlled start of x-forwarded-for', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': 'spoofed, 3.3.3.3' }))).toBe('3.3.3.3');
  });

  it('falls back to a shared bucket', () => {
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
