import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CartProvider } from '@/contexts/CartProvider';
import { useStyleKit } from '@/contexts/StyleKitContext';
import { StyleKitProvider } from '@/contexts/StyleKitProvider';
import { DEMO_PRODUCTS, type DemoProduct } from '@/data/demo-data';

vi.mock('@/integrations/supabase/client', () => ({ supabase: null, isBackendConfigured: false }));

import { StyleKitView } from '../StyleKitView';

const product = (id: string) => DEMO_PRODUCTS.find(p => p.id === id)!;
const crewneck = product('p13');
const tee = product('p6');
const cargo = product('p5');

let kit: ReturnType<typeof useStyleKit>;
function GrabKit() {
  kit = useStyleKit();
  return null;
}

// The size picker and remove button of a product's panel in the look.
const details = (p: DemoProduct) =>
  within(screen.getByRole('heading', { name: p.title }).closest<HTMLElement>('.gap-3')!);
const removeButton = (p: DemoProduct) =>
  screen.getByAltText(p.title).parentElement!.querySelector<HTMLElement>('button.top-2')!;

function renderKit() {
  render(
    <CartProvider>
      <StyleKitProvider>
        <GrabKit />
        <StyleKitView />
      </StyleKitProvider>
    </CartProvider>,
  );
}

describe('StyleKitView slot sizes', () => {
  beforeAll(() => { MotionGlobalConfig.skipAnimations = true; });
  afterAll(() => { MotionGlobalConfig.skipAnimations = false; });

  it('clears the top size when a different top takes the slot', async () => {
    renderKit();
    act(() => kit.openStyleKit(cargo, 'counterparts', 'M'));
    act(() => kit.replaceInLook(crewneck));

    await screen.findByRole('heading', { name: crewneck.title });
    fireEvent.click(details(crewneck).getByRole('button', { name: 'S' }));
    expect(screen.getByText(`${crewneck.title} · S`)).toBeInTheDocument();

    act(() => kit.replaceInLook(tee));
    expect(screen.getByText(`${tee.title} · Select size`)).toBeInTheDocument();
    expect(screen.getByText(`${cargo.title} · M`)).toBeInTheDocument();
  });

  it('keeps the size the shopper opened the look with', () => {
    renderKit();
    act(() => kit.openStyleKit(crewneck, 'counterparts', 'M'));
    act(() => kit.replaceInLook(cargo));

    expect(screen.getByText(`${crewneck.title} · M`)).toBeInTheDocument();
    expect(screen.getByText(`${cargo.title} · Select size`)).toBeInTheDocument();
  });

  it('keeps the promoted product on its own size when the anchor is removed', async () => {
    renderKit();
    act(() => kit.openStyleKit(crewneck, 'counterparts', 'M'));
    act(() => kit.replaceInLook(cargo));

    await screen.findByRole('heading', { name: cargo.title });
    fireEvent.click(details(cargo).getByRole('button', { name: 'L' }));
    fireEvent.click(removeButton(crewneck));

    expect(kit.anchorProduct?.id).toBe(cargo.id);
    expect(details(cargo).getByRole('button', { name: 'L' })).toHaveClass('bg-primary');
    expect(details(cargo).getByRole('button', { name: 'M' })).not.toHaveClass('bg-primary');
  });
});
