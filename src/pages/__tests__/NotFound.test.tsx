import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NotFound from '../NotFound';

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '*', element: <NotFound /> }], { basename: '/demo', initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe('the 404 page', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs nothing to the console', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAt('/demo/nope');
    expect(screen.getByText('404')).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
  });

  // A plain <a href="/"> left the demo for the landing page.
  it('returns to the store home inside the demo', () => {
    renderAt('/demo/admin/nope');
    expect(screen.getByRole('link', { name: 'Return to Home' }).getAttribute('href')).toBe('/demo');
  });
});
