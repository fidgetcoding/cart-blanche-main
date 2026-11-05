import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PortalFrame } from '../page/parts/portal';

// The Orders page's chunk is still on its way (a slow network, a visitor who scrolled straight there).
const chunk = vi.hoisted(() => {
  let arrive: (m: { default: () => JSX.Element }) => void = () => {};
  const loading = new Promise<{ default: () => JSX.Element }>(r => { arrive = r; });
  return { loading, arrive: (m: { default: () => JSX.Element }) => arrive(m) };
});
vi.mock('../page/lib/portal-pages', async importOriginal => {
  const real = await importOriginal<typeof import('../page/lib/portal-pages')>();
  return { ...real, portalPageImports: { ...real.portalPageImports, orders: () => chunk.loading } };
});

beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('ResizeObserver', Observer);
});

describe('a portal page that arrives late', () => {
  it('fades in when it arrives instead of showing an empty panel and popping in', async () => {
    const router = createMemoryRouter([{ path: '*', element: <PortalFrame route="orders" pages={['orders']} /> }]);
    const { container } = render(<RouterProvider router={router} />);
    const layer = () => container.querySelector('main')!.firstElementChild as HTMLElement;
    expect(layer().style.opacity).toBe('0');
    await act(async () => { chunk.arrive({ default: () => <h1>Orders page</h1> }); await chunk.loading; });
    expect(await screen.findByText('Orders page')).toBeInTheDocument();
    expect(layer().style.opacity).toBe('1');
  });
});
