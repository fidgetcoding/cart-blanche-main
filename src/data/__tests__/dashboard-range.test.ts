import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDashboardDataForRange } from '../mock-orders';

describe('dashboard chart buckets', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 14, 30));
  });
  afterEach(() => vi.useRealTimers());

  // The 1D charts had a single bucket, so they drew one dot over a lone "0:00".
  it('splits a day into 24 hours, labelled by the clock', () => {
    const data = getDashboardDataForRange('1D');
    expect(data.salesChartData).toHaveLength(24);
    expect(data.salesChartData.map(p => p.name)).toEqual(
      Array.from({ length: 24 }, (_, i) => `${(14 + i) % 24}:00`),
    );
    expect(data.orderChartData.map(p => p.name)).toEqual(data.salesChartData.map(p => p.name));
    expect(data.orderChartData.reduce((sum, p) => sum + p.current, 0)).toBe(data.totalOrders);
  });

  it('keeps 7 days for a week and 12 buckets for a month', () => {
    expect(getDashboardDataForRange('7D').salesChartData).toHaveLength(7);
    expect(getDashboardDataForRange('1M').salesChartData).toHaveLength(12);
  });
});
