import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
});
