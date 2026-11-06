import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCart } from '@/contexts/CartContext';
import { CartProvider } from '@/contexts/CartProvider';
import { StyleKitProvider } from '@/contexts/StyleKitProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { DEMO_PRODUCTS, type DemoProduct } from '@/data/demo-data';
import { ProductView } from '../ProductView';

let cart: ReturnType<typeof useCart>;
function GrabCart() {
  cart = useCart();
  return null;
}

function view(
  productIndex: number,
  onNavigate: (i: number) => void = () => {},
  onClose: () => void = () => {},
  products: DemoProduct[] = DEMO_PRODUCTS,
) {
  return (
    <ThemeProvider>
      <CartProvider>
        <StyleKitProvider>
          <GrabCart />
          <ProductView
            productIndex={productIndex}
            products={products}
            categories={['ALL']}
            activeCategory="ALL"
            onCategoryChange={() => {}}
            onClose={onClose}
            onNavigate={onNavigate}
          />
        </StyleKitProvider>
      </CartProvider>
    </ThemeProvider>
  );
}

// Renders the view past its opening cooldown, so wheel input steps it.
function openView(...args: Parameters<typeof view>) {
  vi.useFakeTimers();
  const utils = render(view(...args));
  act(() => { vi.advanceTimersByTime(700); });
  vi.useRealTimers();
  return utils;
}

const activePhoto = () => {
  const bars = [...document.querySelectorAll('[data-image-zone] button.flex-1 > div')];
  return bars.findIndex(bar => bar.className.includes('bg-foreground/80'));
};

function touchSwipe(target: Element, from: [number, number], to: [number, number]) {
  fireEvent.touchStart(target, { touches: [{ clientX: from[0], clientY: from[1] }] });
  fireEvent.touchEnd(target, { touches: [], changedTouches: [{ clientX: to[0], clientY: to[1] }] });
}

describe('ProductView', () => {
  it('stays open when the cursor lands on the close button', () => {
    render(view(0));
    const expand = screen.getAllByRole('button').find(button => button.querySelector('svg.lucide-plus'));
    fireEvent.click(expand!);
    const close = screen.getByRole('button', { name: 'Close details' });
    fireEvent.mouseEnter(close);
    expect(screen.getByRole('button', { name: 'Close details' })).toBeTruthy();
    fireEvent.click(close);
  });

  it('survives its product disappearing, as when a filter removes it', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(view(0));
    expect(() => rerender(view(-1))).not.toThrow();
    expect(() => rerender(view(0))).not.toThrow();
    consoleError.mockRestore();
  });

  it('moves one product per arrow click, and never on hover', () => {
    const onNavigate = vi.fn();
    render(view(0, onNavigate));
    const next = screen.getByRole('button', { name: 'Next product' });
    fireEvent.mouseEnter(next);
    fireEvent.mouseLeave(next);
    fireEvent.mouseEnter(next);
    expect(onNavigate).not.toHaveBeenCalled();
    fireEvent.click(next);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('moves one product per trackpad swipe, momentum tail included', () => {
    vi.useFakeTimers();
    try {
      const onNavigate = vi.fn();
      render(view(0, onNavigate));
      vi.advanceTimersByTime(700);
      // A trackpad swipe: ~1.4s of wheel events every 16ms as the momentum decays.
      const swipe = () => {
        for (let i = 0; i < 90; i++) {
          fireEvent.wheel(document.body, { deltaX: Math.max(20, 120 - i), deltaY: 0 });
          vi.advanceTimersByTime(16);
        }
      };
      swipe();
      expect(onNavigate).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(400);
      swipe();
      expect(onNavigate).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stays one step per swipe when the page stalls mid-swipe', () => {
    vi.useFakeTimers();
    try {
      const onNavigate = vi.fn();
      render(view(0, onNavigate));
      vi.advanceTimersByTime(700);
      // Wheel events keep the time the trackpad made them. A busy page delivers some late,
      // after a pause longer than the quiet window, but their timestamps are still 16ms apart.
      const wheelAt = (timeStamp: number) => {
        const event = new WheelEvent('wheel', { deltaX: 80, deltaY: 0, bubbles: true, cancelable: true });
        Object.defineProperty(event, 'timeStamp', { value: timeStamp });
        document.body.dispatchEvent(event);
      };
      const start = performance.now();
      wheelAt(start);
      wheelAt(start + 16);
      vi.advanceTimersByTime(400);
      wheelAt(start + 32);
      wheelAt(start + 48);
      expect(onNavigate).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('moves one product per key press, and not again while the key is held', () => {
    const onNavigate = vi.fn();
    render(view(0, onNavigate));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    for (let i = 0; i < 5; i++) fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true });
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('leaves keys typed into a text field alone', () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    render(view(0, onNavigate, onClose));
    const field = document.createElement('input');
    document.body.appendChild(field);
    try {
      const arrow = fireEvent.keyDown(field, { key: 'ArrowLeft' });
      fireEvent.keyDown(field, { key: 'Escape' });
      expect(arrow).toBe(true);
      expect(onNavigate).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      field.remove();
    }
  });

  it('hands wheel, keys and Escape to the cart while it is open on top', () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    openView(0, onNavigate, onClose);
    act(() => cart.openCart());
    const scrolled = fireEvent.wheel(document.body, { deltaY: 120 });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Escape' });
    touchSwipe(document.body, [200, 400], [200, 200]);
    expect(scrolled).toBe(true);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores wheel and touch input on a layer outside the view', () => {
    const onNavigate = vi.fn();
    openView(0, onNavigate);
    const popup = document.createElement('div');
    document.body.appendChild(popup);
    try {
      const scrolled = fireEvent.wheel(popup, { deltaX: 120 });
      touchSwipe(popup, [300, 200], [100, 200]);
      expect(scrolled).toBe(true);
      expect(onNavigate).not.toHaveBeenCalled();
    } finally {
      popup.remove();
    }
  });

  it('cycles photos one at a time with a horizontal touch swipe on the image', () => {
    const onNavigate = vi.fn();
    render(view(0, onNavigate));
    const image = document.querySelector('[data-image-zone]')!;
    expect(activePhoto()).toBe(0);
    touchSwipe(image, [300, 200], [100, 210]);
    expect(activePhoto()).toBe(1);
    touchSwipe(image, [100, 200], [300, 190]);
    expect(activePhoto()).toBe(0);
    expect(onNavigate).not.toHaveBeenCalled();
    touchSwipe(image, [200, 300], [200, 100]);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('pages the colour swatches on a vertical swipe there, without changing product', () => {
    const base = DEMO_PRODUCTS[0];
    const colorways = Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, name: `Colour ${i}`, hex: '#000000' }));
    const many = { ...base, colorways, images: base.images.map(img => ({ ...img, colorway_id: undefined })) };
    const onNavigate = vi.fn();
    render(view(0, onNavigate, () => {}, [many, ...DEMO_PRODUCTS.slice(1)]));
    expect(screen.getByTitle('Colour 0')).toBeTruthy();
    touchSwipe(screen.getByTitle('Colour 3'), [300, 300], [300, 200]);
    expect(screen.getByTitle('Colour 10')).toBeTruthy();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('does not step on a two-finger touch', () => {
    const onNavigate = vi.fn();
    render(view(0, onNavigate));
    fireEvent.touchStart(document.body, { touches: [{ clientX: 100, clientY: 400 }, { clientX: 200, clientY: 400 }] });
    fireEvent.touchEnd(document.body, { touches: [], changedTouches: [{ clientX: 100, clientY: 100 }] });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('keeps the category bar on screen on a phone, clear of the cart button', () => {
    render(view(0));
    const all = screen.getByRole('button', { name: 'ALL' });
    const bar = all.parentElement!;
    expect(bar.className).toContain('overflow-x-auto');
    expect(bar.parentElement!.className).toContain('max-md:right-20');
  });

  it("shows the next product's own first photo from its very first frame", () => {
    const [first, second] = DEMO_PRODUCTS;
    const { rerender } = render(view(0));
    touchSwipe(document.querySelector('[data-image-zone]')!, [300, 200], [100, 200]);
    expect(activePhoto()).toBe(1);
    // Every photo the second product's view mounts, including any shown for one frame and replaced.
    const mounted = new Set<string>();
    const collect = (records: MutationRecord[]) => {
      for (const record of records) {
        for (const node of [...record.addedNodes, ...record.removedNodes]) {
          if (!(node instanceof Element)) continue;
          for (const img of node.matches('img') ? [node] : [...node.querySelectorAll('img')]) {
            mounted.add(img.getAttribute('src')!);
          }
        }
      }
    };
    const observer = new MutationObserver(collect);
    observer.observe(document.body, { subtree: true, childList: true });
    rerender(view(1));
    collect(observer.takeRecords());
    observer.disconnect();
    expect(first.id).not.toBe(second.id);
    // Its own first photo (the thumbnail the canvas already has, sharpening to the full one), never the first product's.
    expect([...mounted].filter(src => first.images.some(i => i.thumb === src || i.medium === src))).toEqual([]);
    expect([...mounted].filter(src => src === second.images[0].thumb || src === second.images[0].medium)).toHaveLength(1);
  });

  it('closes the waitlist on Escape and keeps the product open beneath it', async () => {
    const soldOut = { ...DEMO_PRODUCTS[0], variants: DEMO_PRODUCTS[0].variants.map(v => ({ ...v, inventory_count: 0 })) };
    const onClose = vi.fn();
    render(view(0, () => {}, onClose, [soldOut, ...DEMO_PRODUCTS.slice(1)]));
    fireEvent.click(screen.getByRole('button', { name: 'JOIN THE WAITLIST' }));
    expect(await screen.findByRole('heading', { name: 'Join the waitlist' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Join the waitlist' })).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers each size once on the waitlist for a product sold in several colours', async () => {
    const puffer = DEMO_PRODUCTS[0];
    expect(puffer.colorways!.length).toBeGreaterThan(1);
    const soldOut = { ...puffer, variants: puffer.variants.map(v => ({ ...v, inventory_count: 0 })) };
    render(view(0, () => {}, () => {}, [soldOut, ...DEMO_PRODUCTS.slice(1)]));
    fireEvent.click(screen.getByRole('button', { name: 'JOIN THE WAITLIST' }));
    await screen.findByRole('heading', { name: 'Join the waitlist' });
    expect(screen.getAllByRole('button', { name: 'M' })).toHaveLength(1);
  });

  it('opens the details on a click of "+" only, never on hover', () => {
    render(view(0));
    const expand = screen.getAllByRole('button').find(button => button.querySelector('svg.lucide-plus'))!;
    fireEvent.mouseEnter(expand);
    fireEvent.mouseLeave(expand);
    fireEvent.mouseEnter(expand);
    expect(screen.queryByRole('button', { name: 'Close details' })).toBeNull();
    fireEvent.click(expand);
    expect(screen.getByRole('button', { name: 'Close details' })).toBeTruthy();
  });

  it('changes photo on a click of its bar only, never on hover', () => {
    render(view(0));
    const bars = document.querySelectorAll<HTMLElement>('[data-image-zone] button.flex-1');
    expect(bars.length).toBeGreaterThan(1);
    fireEvent.mouseEnter(bars[1]);
    expect(activePhoto()).toBe(0);
    fireEvent.click(bars[1]);
    expect(activePhoto()).toBe(1);
  });

  it('picks a size when the pointer rests on it, never while it sweeps past', () => {
    vi.useFakeTimers();
    render(view(0));
    fireEvent.click(screen.getAllByRole('button').find(button => button.querySelector('svg.lucide-plus'))!);
    const sizes = screen.getAllByRole('button').filter(button => /^(XS|S|M|L|XL)$/.test(button.textContent ?? ''));
    const picked = () => sizes.filter(button => button.className.includes('bg-foreground text-background')).map(button => button.textContent);
    const before = picked();
    for (const size of sizes) {
      fireEvent.mouseEnter(size);
      act(() => { vi.advanceTimersByTime(30); });
      fireEvent.mouseLeave(size);
    }
    act(() => { vi.advanceTimersByTime(500); });
    expect(picked()).toEqual(before);
    fireEvent.mouseEnter(sizes[1]);
    act(() => { vi.advanceTimersByTime(200); });
    expect(picked()).toEqual([sizes[1].textContent]);
    vi.useRealTimers();
  });
});
