import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.hoisted(() => vi.fn());
const insert = vi.hoisted(() => vi.fn());
const submitStoreSignup = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/lib/demo/client', () => ({
  supabase: { auth: { getUser }, from: () => ({ insert }) },
}));
vi.mock('@/lib/shopper-api', () => ({ submitStoreSignup }));
vi.mock('sonner', () => ({ toast }));

import { useSubscriberSignup, WELCOME_CODE } from '../use-subscriber-signup';
import { useWaitlistSignup } from '../use-waitlist-signup';

const signedOut = { data: { user: null } };
const signedIn = { data: { user: { id: 'merchant' } } };

describe('shopper signups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockResolvedValue({ error: null });
    vi.stubEnv('VITE_STORE_MERCHANT_ID', 'store');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('sends a logged-out shopper through the edge function', async () => {
    getUser.mockResolvedValue(signedOut);
    submitStoreSignup.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useSubscriberSignup());
    let outcome;
    await act(async () => { outcome = await result.current.submit(' Ann@Example.com'); });
    expect(submitStoreSignup).toHaveBeenCalledWith({ kind: 'subscriber', merchant_id: 'store', email: 'ann@example.com' });
    expect(outcome).toEqual({ ok: true, duplicate: false, welcomeCode: WELCOME_CODE });
    expect(insert).not.toHaveBeenCalled();
  });

  it('adds a logged-out shopper to a waitlist through the edge function', async () => {
    getUser.mockResolvedValue(signedOut);
    submitStoreSignup.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useWaitlistSignup());
    let outcome;
    await act(async () => { outcome = await result.current.submit({ productId: 'p1', email: 'a@example.com', name: 'Ann', sizePreference: 'M' }); });
    expect(submitStoreSignup).toHaveBeenCalledWith(expect.objectContaining({ kind: 'waitlist', merchant_id: 'store', product_id: 'p1', name: 'Ann', size_preference: 'M' }));
    expect(outcome).toEqual({ ok: true, duplicate: false });
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows the function\'s message when it refuses', async () => {
    getUser.mockResolvedValue(signedOut);
    submitStoreSignup.mockResolvedValue({ ok: false, error: 'Too many tries.' });
    const { result } = renderHook(() => useWaitlistSignup());
    await act(async () => { await result.current.submit({ productId: 'p1', email: 'a@example.com', name: 'Ann' }); });
    expect(toast.error).toHaveBeenCalledWith('Too many tries.');
  });

  it('still writes directly for a signed-in merchant', async () => {
    getUser.mockResolvedValue(signedIn);
    const { result } = renderHook(() => useSubscriberSignup());
    await act(async () => { await result.current.submit('a@example.com'); });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ merchant_id: 'merchant', email: 'a@example.com' }));
    expect(submitStoreSignup).not.toHaveBeenCalled();
  });

  it('fails plainly when no store is configured', async () => {
    vi.stubEnv('VITE_STORE_MERCHANT_ID', '');
    getUser.mockResolvedValue(signedOut);
    const { result } = renderHook(() => useSubscriberSignup());
    let outcome;
    await act(async () => { outcome = await result.current.submit('a@example.com'); });
    expect(outcome).toEqual({ ok: false, duplicate: false, welcomeCode: null });
    expect(submitStoreSignup).not.toHaveBeenCalled();
  });
});
