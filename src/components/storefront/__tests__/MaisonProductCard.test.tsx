import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CartProvider } from '@/contexts/CartProvider';
import { StyleKitProvider } from '@/contexts/StyleKitProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { DEMO_PRODUCTS } from '@/data/demo-data';
import { MaisonProductCard } from '../MaisonProductCard';

function stripStep(container: HTMLElement) {
  const strip = container.querySelector<HTMLElement>('[style*="translateX"]')!;
  const count = parseFloat(strip.style.width) / 100;
  const shift = parseFloat(strip.style.transform.replace('translateX(-', ''));
  return Math.round((shift / 100) * count);
}

function renderCard() {
  const product = DEMO_PRODUCTS.find(p => p.images.length > 2)!;
  const utils = render(
    <ThemeProvider>
      <CartProvider>
        <StyleKitProvider>
          <MaisonProductCard product={product} viewMode={3} onClick={() => {}} onBuildSet={() => {}} index={0} />
        </StyleKitProvider>
      </CartProvider>
    </ThemeProvider>,
  );
  const card = utils.container.firstElementChild as HTMLElement;
  const imageArea = utils.container.querySelector<HTMLElement>('[style*="translateX"]')!.parentElement!;
  return { ...utils, card, imageArea };
}

describe('MaisonProductCard', () => {
  it('steps one photo per arrow click, and never on hover', () => {
    const product = DEMO_PRODUCTS.find(p => p.images.length > 1)!;
    const { container } = render(
      <ThemeProvider>
        <CartProvider>
          <StyleKitProvider>
            <MaisonProductCard product={product} viewMode={3} onClick={() => {}} onBuildSet={() => {}} index={0} />
          </StyleKitProvider>
        </CartProvider>
      </ThemeProvider>,
    );
    fireEvent.mouseEnter(container.firstElementChild!);
    const next = screen.getByRole('button', { name: 'Next photo' });
    fireEvent.mouseEnter(next);
    expect(stripStep(container)).toBe(0);
    fireEvent.click(next);
    expect(stripStep(container)).toBe(1);
  });

  it('steps one photo per trackpad swipe, momentum tail included', () => {
    vi.useFakeTimers();
    try {
      const { container, imageArea } = renderCard();
      // A trackpad swipe: ~1.4s of wheel events every 16ms as the momentum decays.
      const swipe = () => {
        for (let i = 0; i < 90; i++) {
          fireEvent.wheel(imageArea, { deltaX: Math.max(20, 120 - i), deltaY: 0 });
          vi.advanceTimersByTime(16);
        }
      };
      swipe();
      expect(stripStep(container)).toBe(1);
      vi.advanceTimersByTime(400);
      swipe();
      expect(stripStep(container)).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stays one step per swipe when the page stalls mid-swipe', () => {
    vi.useFakeTimers();
    try {
      const { container, imageArea } = renderCard();
      // Late events keep the time the trackpad made them, 16ms apart, after a long stall.
      const wheelAt = (timeStamp: number) => {
        const event = new WheelEvent('wheel', { deltaX: 80, deltaY: 0, bubbles: true, cancelable: true });
        Object.defineProperty(event, 'timeStamp', { value: timeStamp });
        act(() => { imageArea.dispatchEvent(event); });
      };
      const start = performance.now();
      wheelAt(start);
      wheelAt(start + 16);
      vi.advanceTimersByTime(900);
      wheelAt(start + 32);
      wheelAt(start + 48);
      expect(stripStep(container)).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('steps one photo per key press, and not again while the key is held', () => {
    vi.useFakeTimers();
    try {
      const { container, card } = renderCard();
      fireEvent.keyDown(card, { key: 'ArrowRight' });
      // Two repeats, spaced past the click cooldown: one step with four photos is index 1, three would be 3.
      for (let i = 0; i < 2; i++) {
        act(() => { vi.advanceTimersByTime(200); });
        fireEvent.keyDown(card, { key: 'ArrowRight', repeat: true });
      }
      expect(stripStep(container)).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

