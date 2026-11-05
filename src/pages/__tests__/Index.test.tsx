import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: null, isBackendConfigured: false }));
for (const observer of ['IntersectionObserver', 'ResizeObserver']) {
  vi.stubGlobal(observer, class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
}

import Index from '../Index';

describe('Index storefront', () => {
  afterEach(() => localStorage.clear());

  it('shows one Build a Set in the SL template, the one in its modal', async () => {
    localStorage.setItem('cb-active-template', 'sl');
    render(<MemoryRouter><Index /></MemoryRouter>);
    const card = (await screen.findAllByText('Stealth Trench'))[0].closest<HTMLElement>('.group')!;
    fireEvent.mouseEnter(card);
    fireEvent.mouseEnter(screen.getAllByText('ADD TO CART')[0].parentElement!);
    fireEvent.click(await screen.findByRole('button', { name: 'BUILD A SET' }));
    expect(await screen.findAllByText('STYLE KIT')).toHaveLength(1);
  });
});
