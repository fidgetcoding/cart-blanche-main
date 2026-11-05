import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from '@/contexts/CartProvider';
import { StyleKitProvider } from '@/contexts/StyleKitProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { DEMO_PRODUCTS, type DemoProduct } from '@/data/demo-data';

vi.mock('@/integrations/supabase/client', () => ({ supabase: null, isBackendConfigured: false }));
vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

import { MaisonProductDetail } from '../MaisonProductDetail';

// Four untagged photos, plus the base product's colourways, so steps can't hide behind a wrap.
const base = DEMO_PRODUCTS.find(p => (p.colorways?.length ?? 0) > 1)!;
const photo = (name: string) => ({ thumb: `/${name}-t.webp`, medium: `/${name}-m.webp`, full: `/${name}-f.webp` });
const product: DemoProduct = { ...base, images: [photo('a'), photo('b'), photo('c'), photo('d')] };

function renderDetail(onClose: () => void = () => {}) {
  const utils = render(
    <ThemeProvider>
      <CartProvider>
        <StyleKitProvider>
          <MaisonProductDetail
            product={product}
            products={DEMO_PRODUCTS}
            allProducts={DEMO_PRODUCTS}
            onClose={onClose}
            onNavigate={() => {}}
            onBuildSet={() => {}}
          />
        </StyleKitProvider>
      </CartProvider>
    </ThemeProvider>,
  );
  const strip = utils.container.querySelector<HTMLElement>('.select-none')!.parentElement!;
  return { ...utils, strip };
}

// The "n" of the "n / 4" counter beside the photo.
const shown = () => Number(screen.getAllByText(/^\d$/)[0].textContent);
const settle = () => act(() => { vi.advanceTimersByTime(400); });

describe('MaisonProductDetail photo strip', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('steps one photo per chevron click, and never on hover', () => {
    renderDetail();
    const next = screen.getByRole('button', { name: 'Next photo' });
    fireEvent.mouseEnter(next);
    fireEvent.mouseLeave(next);
    fireEvent.mouseEnter(next);
    settle();
    expect(shown()).toBe(1);
    fireEvent.click(next);
    settle();
    expect(shown()).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
    settle();
    expect(shown()).toBe(1);
  });

  it('counts two quick clicks as two steps', () => {
    renderDetail();
    const next = screen.getByRole('button', { name: 'Next photo' });
    fireEvent.click(next);
    act(() => { vi.advanceTimersByTime(30); });
    fireEvent.click(next);
    settle();
    expect(shown()).toBe(3);
  });

  it('steps one photo per wheel swipe, momentum tail included', () => {
    const { strip } = renderDetail();
    const swipe = (direction: 1 | -1) => {
      for (let i = 0; i < 90; i++) {
        fireEvent.wheel(strip, { deltaX: 0, deltaY: direction * Math.max(4, 60 - i) });
        act(() => { vi.advanceTimersByTime(16); });
      }
    };
    swipe(1);
    settle();
    expect(shown()).toBe(2);
    swipe(1);
    settle();
    expect(shown()).toBe(3);
    swipe(-1);
    settle();
    expect(shown()).toBe(2);
  });

  it('steps one photo per mouse wheel notch', () => {
    const { strip } = renderDetail();
    fireEvent.wheel(strip, { deltaY: 100 });
    settle();
    expect(shown()).toBe(2);
  });

  it('steps at most one photo per drag, however far or fast', () => {
    const { strip } = renderDetail();
    fireEvent.mouseDown(strip, { clientY: 800 });
    for (let y = 800; y >= -1600; y -= 200) {
      fireEvent.mouseMove(window, { clientY: y });
      act(() => { vi.advanceTimersByTime(8); });
    }
    fireEvent.mouseUp(window);
    settle();
    expect(shown()).toBe(2);
    // A small nudge springs back.
    fireEvent.mouseDown(strip, { clientY: 400 });
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.mouseMove(window, { clientY: 390 });
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.mouseUp(window);
    settle();
    expect(shown()).toBe(2);
  });

  it('shows the first photo of a newly picked colour, matching the counter', () => {
    const { container } = renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    settle();
    fireEvent.click(screen.getByTitle(base.colorways![1].name));
    settle();
    expect(shown()).toBe(1);
    const inView = [...container.querySelectorAll<HTMLElement>('[style*="translateY"]')]
      .find(el => el.style.transform === 'translateY(0px)')!;
    expect(inView.querySelector('img')!.getAttribute('src')).toBe('/a-m.webp');
  });
});

describe('MaisonProductDetail first frames', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  });
  afterEach(() => { vi.useRealTimers(); });

  // The photo sitting in view after every commit, read while React commits it.
  function renderRecording(p: DemoProduct) {
    const inView: string[] = [];
    const record = () => {
      const slot = [...document.querySelectorAll<HTMLElement>('[style*="translateY"]')]
        .find(el => el.style.transform === 'translateY(0px)');
      inView.push(slot?.querySelector('img')?.getAttribute('src') ?? 'moving');
    };
    const tree = (current: DemoProduct) => (
      <Profiler id="detail" onRender={record}>
        <ThemeProvider>
          <CartProvider>
            <StyleKitProvider>
              <MaisonProductDetail product={current} products={DEMO_PRODUCTS} allProducts={DEMO_PRODUCTS} onClose={() => {}} onNavigate={() => {}} onBuildSet={() => {}} />
            </StyleKitProvider>
          </CartProvider>
        </ThemeProvider>
      </Profiler>
    );
    const utils = render(tree(p));
    return { ...utils, inView, swap: (next: DemoProduct) => utils.rerender(tree(next)) };
  }

  it("never paints a newly picked colour's photos at the old position", () => {
    const { inView } = renderRecording(product);
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    settle();
    inView.length = 0;
    fireEvent.click(screen.getByTitle(base.colorways![1].name));
    expect(inView).toEqual(inView.map(() => '/a-m.webp'));
  });

  it('never paints the next product at the old position', () => {
    const other: DemoProduct = { ...product, id: 'other', images: [photo('w'), photo('x'), photo('y'), photo('z')] };
    const { inView, swap } = renderRecording(product);
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    settle();
    inView.length = 0;
    swap(other);
    expect(inView).toEqual(inView.map(() => '/w-m.webp'));
  });
});

describe('MaisonProductDetail moving to another product', () => {
  it("shows the new product's own first colour, from \"you may also like\"", () => {
    const trench = DEMO_PRODUCTS.find(p => p.id === 'p2')!;
    const puffer = DEMO_PRODUCTS.find(p => p.id === 'p1')!;
    const detail = (p: DemoProduct) => (
      <ThemeProvider>
        <CartProvider>
          <StyleKitProvider>
            <MaisonProductDetail product={p} products={DEMO_PRODUCTS} allProducts={DEMO_PRODUCTS} onClose={() => {}} onNavigate={() => {}} onBuildSet={() => {}} />
          </StyleKitProvider>
        </CartProvider>
      </ThemeProvider>
    );
    const { rerender, container } = render(detail(trench));
    rerender(detail(puffer));
    const photos = [...container.querySelectorAll('.select-none img')].map(img => img.getAttribute('src'));
    expect(photos).toContain(puffer.images[0].medium);
    expect(screen.getByTitle(puffer.colorways![0].name).className).toContain('ring-2');
  });
});

describe('MaisonProductDetail closing', () => {
  it('leaves Escape to the waitlist while it is open', () => {
    const onClose = vi.fn();
    const outOfStock = { ...product, variants: product.variants.map(v => ({ ...v, inventory_count: 0 })) };
    render(
      <ThemeProvider>
        <CartProvider>
          <StyleKitProvider>
            <MaisonProductDetail product={outOfStock} products={DEMO_PRODUCTS} allProducts={DEMO_PRODUCTS} onClose={onClose} onNavigate={() => {}} onBuildSet={() => {}} />
          </StyleKitProvider>
        </CartProvider>
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'JOIN THE WAITLIST' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('MaisonProductDetail waitlist', () => {
  it('offers each size once for a product sold in several colours', () => {
    const puffer = DEMO_PRODUCTS.find(p => p.id === 'p1')!;
    const soldOut = { ...puffer, variants: puffer.variants.map(v => ({ ...v, inventory_count: 0 })) };
    render(
      <ThemeProvider>
        <CartProvider>
          <StyleKitProvider>
            <MaisonProductDetail product={soldOut} products={DEMO_PRODUCTS} allProducts={DEMO_PRODUCTS} onClose={() => {}} onNavigate={() => {}} onBuildSet={() => {}} />
          </StyleKitProvider>
        </CartProvider>
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'JOIN THE WAITLIST' }));
    const modal = screen.getByText('Size Preference').parentElement!;
    expect(within(modal).getAllByRole('button', { name: 'M' })).toHaveLength(1);
  });
});

describe('MaisonProductDetail also-like carousel', () => {
  it('scrolls on arrow click only, never on hover', () => {
    renderDetail();
    const row = screen.getByText('YOU MAY ALSO LIKE').parentElement!.nextElementSibling as HTMLElement;
    const scrollBy = vi.fn();
    row.scrollBy = scrollBy;
    const [left, right] = screen.getByText('YOU MAY ALSO LIKE').parentElement!.querySelectorAll('button');
    fireEvent.mouseEnter(left);
    fireEvent.mouseEnter(right);
    expect(scrollBy).not.toHaveBeenCalled();
    fireEvent.click(right);
    expect(scrollBy).toHaveBeenCalledTimes(1);
  });
});
