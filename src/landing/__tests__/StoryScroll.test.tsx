import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Landing from '../Landing';
import { BEAT, STARTS, U, scrollStoryTo, stubStoryLayout } from './story-stubs';

stubStoryLayout();

describe('the story, scrolled end to end', () => {
  it('shows every chapter, the AI Manager on the Discounts page included, without taking the page down', async () => {
    render(<Landing />);
    for (let i = 0; i <= 120; i++) await scrollStoryTo((i / 120) * U);
    // The AI Manager's first beat walks its pages, ending on the real Discounts page.
    await scrollStoryTo(STARTS[4] + 0.85 * BEAT);
    expect(await screen.findByText('Discount Codes', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(document.body.textContent).toContain('Fashion commerce with AI on both sides of the counter.');
  }, 60000);
});
