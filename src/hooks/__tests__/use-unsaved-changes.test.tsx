import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useUnsavedChanges } from '../use-unsaved-changes';

function Editor() {
  const { markDirty, BlockerDialog } = useUnsavedChanges();
  useEffect(() => { markDirty(); }, [markDirty]);
  return (
    <>
      <BlockerDialog />
      <p>editor</p>
      <Link to="/elsewhere">Leave</Link>
    </>
  );
}

function openBlocked() {
  const router = createMemoryRouter([
    { path: '/', element: <Editor /> },
    { path: '/elsewhere', element: <p>elsewhere</p> },
  ]);
  render(<RouterProvider router={router} />);
  fireEvent.click(screen.getByRole('link', { name: 'Leave' }));
  return router;
}

describe('the unsaved changes dialog', () => {
  it('is a labelled modal dialog', () => {
    openBlocked();
    const dialog = screen.getByRole('dialog', { name: 'UNSAVED CHANGES' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('stays on the page when Escape is pressed', async () => {
    const router = openBlocked();
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByText('editor')).toBeTruthy();
  });

  // The discount form under it also closes on Escape; one press should only answer the dialog on top.
  it('keeps that Escape from reaching anything under it', async () => {
    openBlocked();
    const underneath = vi.fn();
    document.addEventListener('keydown', underneath);
    await act(async () => { fireEvent.keyDown(document, { key: 'Escape' }); });
    document.removeEventListener('keydown', underneath);
    expect(underneath).not.toHaveBeenCalled();
  });

  it('still leaves when asked to', async () => {
    const router = openBlocked();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'LEAVE WITHOUT SAVING' })); });
    expect(router.state.location.pathname).toBe('/elsewhere');
  });
});
