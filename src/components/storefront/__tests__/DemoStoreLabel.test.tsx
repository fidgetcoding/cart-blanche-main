import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const isDemoMode = vi.hoisted(() => vi.fn());
vi.mock('@/lib/demo/client', () => ({ isDemoMode }));

import { DemoStoreLabel } from '../DemoStoreLabel';

describe('DemoStoreLabel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks a demo store', async () => {
    isDemoMode.mockResolvedValue(true);
    render(<DemoStoreLabel />);
    const label = await screen.findByText('Demo');
    expect(label.className).toContain('uppercase');
  });

  it('takes no space in the header, so it cannot push anything', async () => {
    isDemoMode.mockResolvedValue(true);
    render(<DemoStoreLabel />);
    const label = await screen.findByText('Demo');
    expect(label.className).toContain('absolute');
    expect(label.className).toContain('whitespace-nowrap');
  });

  it('stays off a real store', async () => {
    isDemoMode.mockResolvedValue(false);
    render(<DemoStoreLabel />);
    await waitFor(() => expect(isDemoMode).toHaveBeenCalled());
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText('Demo')).toBeNull();
  });
});
