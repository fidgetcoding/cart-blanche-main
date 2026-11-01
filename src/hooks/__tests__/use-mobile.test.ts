import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useIsMobile } from '../use-mobile';

const original = window.innerWidth;
const atWidth = (width: number) => Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });

describe('useIsMobile', () => {
  afterEach(() => atWidth(original));

  it('defaults to phone widths', () => {
    atWidth(767);
    expect(renderHook(() => useIsMobile()).result.current).toBe(true);
    atWidth(768);
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });

  it('keeps the storefront header compact on a tablet, where the full bar would overlap', () => {
    atWidth(768);
    expect(renderHook(() => useIsMobile(1024)).result.current).toBe(true);
    atWidth(1023);
    expect(renderHook(() => useIsMobile(1024)).result.current).toBe(true);
    atWidth(1024);
    expect(renderHook(() => useIsMobile(1024)).result.current).toBe(false);
  });
});
