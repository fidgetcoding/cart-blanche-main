import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

type Save = (override?: unknown) => Promise<void>;

const canvas = vi.hoisted(() => ({ onSave: null as Save | null }));
const db = vi.hoisted(() => ({
  order: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  pendingInserts: [] as (() => void)[],
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/use-grid-layout', () => {
  const catalog = { loading: false, getAllProductsUnfiltered: () => [], getOrderedCategories: () => [] };
  return { useGridLayout: () => catalog };
});
// Stands in for the canvas and keeps the onSave it was first given, like its
// debounced auto-save timer does.
vi.mock('@/components/admin/StyleGuideCanvas', () => ({
  default: (props: { onSave: Save }) => {
    canvas.onSave ??= props.onSave;
    return null;
  },
}));
vi.mock('@/lib/demo/client', () => {
  const read: Record<string, unknown> = {
    select: () => read,
    eq: () => read,
    order: (...args: unknown[]) => { db.order(...args); return read; },
    limit: () => read,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: 'm' } } }) },
      from: () => ({
        ...read,
        insert: (row: unknown) => {
          db.insert(row);
          const id = `guide-${db.insert.mock.calls.length}`;
          // Inserts stay in flight until the test lands them.
          const landed = new Promise(resolve => {
            db.pendingInserts.push(() => resolve({ data: { id }, error: null }));
          });
          return { select: () => ({ single: () => landed }) };
        },
        update: (patch: unknown) => ({
          eq: async (column: string, value: unknown) => {
            db.update(patch, column, value);
            return { error: null };
          },
        }),
      }),
    },
  };
});

import AdminStylingGuide from '../AdminStylingGuide';

describe('saving a new look book', () => {
  it('loads the newest guide row', async () => {
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminStylingGuide /> }])} />);
    await screen.findByRole('button', { name: 'CANVAS' });
    expect(db.order).toHaveBeenCalledWith('updated_at', expect.objectContaining({ ascending: false }));
  });

  it('updates the row the first save is still creating instead of adding a second one', async () => {
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminStylingGuide /> }])} />);
    fireEvent.click(await screen.findByRole('button', { name: 'CANVAS' }));
    await waitFor(() => expect(canvas.onSave).not.toBeNull());
    const save = canvas.onSave!;
    const layout = { canvasLayout: { positions: {}, nodeIds: [] } };

    const first = save(layout);
    await waitFor(() => expect(db.insert).toHaveBeenCalledTimes(1));
    const second = save(layout);
    // Let the second save get as far as it can before the first insert lands.
    await act(() => new Promise(resolve => setTimeout(resolve, 0)));

    await act(async () => {
      db.pendingInserts.forEach(land => land());
      await Promise.all([first, second]);
    });

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledWith(expect.anything(), 'id', 'guide-1');
  });
});
