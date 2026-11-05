import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PortalFrame } from '../page/parts/portal';

// A portal page whose chunk can't be fetched (a dropped connection, or a deploy that replaced it).
vi.mock('../page/lib/portal-pages', async importOriginal => {
  const real = await importOriginal<typeof import('../page/lib/portal-pages')>();
  return { ...real, portalPageImports: { ...real.portalPageImports, orders: () => Promise.reject(new Error('Failed to fetch dynamically imported module')) } };
});

beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('ResizeObserver', Observer);
});

describe('PortalFrame', () => {
  it('keeps the frame up when one of its pages fails to load', async () => {
    const router = createMemoryRouter([{ path: '*', element: <PortalFrame route="orders" pages={['orders', 'inventory']} /> }]);
    // React reports the caught error on the console and the window; keep the run quiet.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const quiet = (e: ErrorEvent) => e.preventDefault();
    window.addEventListener('error', quiet);
    render(<RouterProvider router={router} />);
    // Let the failed import settle.
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('AI STORE MANAGER')).toBeInTheDocument();
    window.removeEventListener('error', quiet);
  });
});
