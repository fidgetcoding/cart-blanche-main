import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductTile } from '../ProductTile';
import { DEMO_PRODUCTS } from '@/data/demo-data';

// The store's tile keeps its quick actions on hover; only the landing turns them off (actions={false}).
describe('ProductTile', () => {
  const props = () => ({
    product: DEMO_PRODUCTS[0], scale: 1, isFocused: false, isHovered: true,
    onClick: vi.fn(), onHoverStart: vi.fn(), onHoverEnd: vi.fn(), onQuickAdd: vi.fn(), onQuickStyleKit: vi.fn(),
  });

  it('shows Quick Add and Style Kit on a hovered tile by default, as the store uses it', () => {
    render(<ProductTile {...props()} />);
    expect(screen.getByTitle('Quick Add')).toBeInTheDocument();
    expect(screen.getByTitle('Style Kit')).toBeInTheDocument();
  });

  it('keeps the glow but drops both actions with actions={false}', () => {
    const { container } = render(<ProductTile {...props()} actions={false} />);
    expect(screen.queryByTitle('Quick Add')).toBeNull();
    expect(screen.queryByTitle('Style Kit')).toBeNull();
    expect((container.querySelector('.rounded-lg') as HTMLElement).style.boxShadow).not.toBe('');
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows a photo the browser already has at once, with no fade from blank', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(400);
    const { container } = render(<ProductTile {...props()} />);
    expect(container.querySelector('img')!.className).toContain('opacity-100');
  });

  it('fades in a photo that is still loading', () => {
    const { container } = render(<ProductTile {...props()} />);
    expect(container.querySelector('img')!.className).toContain('opacity-0');
  });
  it('shows a remounted tile its photo at once once it has loaded before, as on a page flip back', () => {
    const product = { ...DEMO_PRODUCTS[0], id: 'flip', images: [{ ...DEMO_PRODUCTS[0].images[0], thumb: '/products/flip-thumb.webp' }] };
    const first = render(<ProductTile {...props()} product={product} />);
    fireEvent.load(first.container.querySelector('img')!);
    first.unmount();
    const again = render(<ProductTile {...props()} product={product} />);
    const img = again.container.querySelector('img')!;
    expect(img.className).toContain('opacity-100');
    expect(img.getAttribute('loading')).toBe('eager');
  });
});
