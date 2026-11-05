import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const products = vi.hoisted(() => Array.from({ length: 25 }, (_, i) => ({
  id: `p${i + 1}`, title: `Tile ${i + 1}`, price: 10, images: [], category: 'essentials', variants: [], description: '',
})));

vi.mock('@/hooks/use-grid-layout', () => ({
  useGridLayout: () => ({
    loading: false,
    layout: null,
    saveLayout: vi.fn(),
    saveHiddenTags: vi.fn(),
    resetLayout: vi.fn(),
    getOrderedProducts: () => products,
    getOrderedCategories: () => ['ALL', 'ESSENTIALS'],
    getAllProductsUnfiltered: () => products,
  }),
}));

// The editor watches its own box, which jsdom can't measure, so the test sets the size.
const box = vi.hoisted(() => ({ width: 800, height: 900, notify: () => {} }));
vi.stubGlobal('ResizeObserver', class {
  constructor(private callback: () => void) { box.notify = () => this.callback(); }
  observe() { this.callback(); }
  unobserve() {}
  disconnect() {}
});

import AdminPageEditor from '../AdminPageEditor';

const onPage = (n: 1 | 2) => {
  expect(screen.queryByText(n === 1 ? 'Tile 1' : 'Tile 21')).toBeTruthy();
  expect(screen.queryByText(n === 1 ? 'Tile 21' : 'Tile 1')).toBeNull();
};

describe('the grid editor page arrows', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminPageEditor /> }])} />);
  });
  afterEach(() => vi.useRealTimers());

  it('never turn the page on hover', () => {
    onPage(1);
    const next = screen.getByRole('button', { name: 'Next page' });
    fireEvent.mouseEnter(next);
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.mouseLeave(next);
    onPage(1);
  });

  it('turn exactly one page per click, even after hovering first', () => {
    const next = screen.getByRole('button', { name: 'Next page' });
    fireEvent.mouseEnter(next);
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.click(next);
    onPage(2);
    const prev = screen.getByRole('button', { name: 'Previous page' });
    fireEvent.mouseEnter(prev);
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.click(prev);
    onPage(1);
  });
});

describe('the grid editor canvas', () => {
  it('rescales when the chat panel beside it is resized, with no window resize', () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ width: box.width, height: box.height, top: 0, left: 0, right: box.width, bottom: box.height, x: 0, y: 0, toJSON: () => ({}) }),
    );
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <AdminPageEditor /> }])} />);
    const canvasWidth = () => parseFloat((screen.getByText('Tile 1').closest('.relative.mx-auto') as HTMLElement).style.width);
    const before = canvasWidth();

    box.width = 500;
    act(() => box.notify());

    expect(canvasWidth()).toBeLessThan(before);
    expect(canvasWidth()).toBeCloseTo(500 - 180);
    rect.mockRestore();
  });
});
