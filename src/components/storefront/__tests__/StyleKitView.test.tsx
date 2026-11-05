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

describe('StyleKitView browsing', () => {
  beforeAll(() => { MotionGlobalConfig.skipAnimations = true; });
  afterAll(() => { MotionGlobalConfig.skipAnimations = false; });

  it("changes a carousel card's photo without adding that product to the look", async () => {
    renderKit();
    act(() => kit.openStyleKit(crewneck, 'counterparts'));
    const dot = await waitForDot();
    fireEvent.click(dot);
    expect(kit.lookItems.map(p => p.id)).toEqual([crewneck.id]);
  });

  it('lists each size once for a product sold in several colours', async () => {
    const puffer = product('p1');
    expect(new Set(puffer.colorways!.map(c => c.id)).size).toBeGreaterThan(1);
    renderKit();
    act(() => kit.openStyleKit(puffer, 'counterparts'));
    await screen.findByRole('heading', { name: puffer.title });
    expect(details(puffer).getAllByRole('button', { name: 'M' })).toHaveLength(1);
  });
});

// A photo dot on a carousel card (cards with several photos have one per photo).
async function waitForDot() {
  await screen.findAllByRole('button', { name: /ADD/ });
  return document.querySelectorAll<HTMLElement>('.no-scrollbar button.flex-1')[1];
}

describe('StyleKitView lane arrows', () => {
  beforeAll(() => { MotionGlobalConfig.skipAnimations = true; });
  afterAll(() => { MotionGlobalConfig.skipAnimations = false; });

  // Every lane measures this wide; the viewport is 1280.
  function laneWidth(width: number) {
    const scroll = vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(width);
    const client = vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1280);
    return () => { scroll.mockRestore(); client.mockRestore(); };
  }

  it('shows no arrows on a lane that fits, since they would do nothing', async () => {
    const restore = laneWidth(1280);
    try {
      renderKit();
      act(() => kit.openStyleKit(crewneck, 'counterparts'));
      await screen.findAllByRole('button', { name: /ADD/ });
      expect(document.querySelectorAll('button:has(svg.lucide-chevron-left), button:has(svg.lucide-chevron-right)')).toHaveLength(0);
    } finally {
      restore();
    }
  });

  it('keeps the arrows on a lane that scrolls', async () => {
    const restore = laneWidth(2600);
    try {
      renderKit();
      act(() => kit.openStyleKit(crewneck, 'counterparts'));
      await screen.findAllByRole('button', { name: /ADD/ });
      expect(screen.getByRole('button', { name: 'Scroll forward' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Scroll back' })).toBeTruthy();
    } finally {
      restore();
    }
  });
});

