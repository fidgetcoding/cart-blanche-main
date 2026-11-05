import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const charts = vi.hoisted(() => {
  let land = () => {};
  const landed = new Promise<void>(resolve => { land = resolve; });
  return { landed, land: () => land() };
});

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/demo/client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'm' } } } }) } },
}));
vi.mock('@/lib/size-charts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/size-charts')>();
  return {
    ...actual,
    fetchAllSizeCharts: async () => {
      await charts.landed;
      return actual.DEFAULT_CHARTS;
    },
  };
});

import AdminSizeCharts from '../AdminSizeCharts';

// The loading line and the page shared one element, so when the charts landed the browser saw it
// narrow to the page's max width and move: load CLS 0.0064 at 1440px.
describe('size charts while they load', () => {
  it('replace the loading line instead of reusing its element', async () => {
    render(<AdminSizeCharts />);
    const placeholder = screen.getByText('LOADING SIZE CHARTS...');
    await act(async () => charts.land());
    expect(await screen.findByText('SIZE CHARTS')).toBeTruthy();
    expect(placeholder.isConnected).toBe(false);
  });
});
