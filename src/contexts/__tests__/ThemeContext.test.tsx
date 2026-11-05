import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ThemeProvider } from '../ThemeProvider';
it('removes its font stylesheet when a template preview unmounts', () => {
  localStorage.clear();
  const existing = document.head.querySelectorAll('link[href*="fonts.googleapis.com"]').length;
  const { unmount } = render(<ThemeProvider><span>Preview</span></ThemeProvider>);
  expect(document.head.querySelectorAll('link[href*="fonts.googleapis.com"]').length).toBe(existing + 1);
  unmount();
  expect(document.head.querySelectorAll('link[href*="fonts.googleapis.com"]').length).toBe(existing);
});
