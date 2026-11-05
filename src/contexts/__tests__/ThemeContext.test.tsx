import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '../ThemeProvider';
import { DEFAULT_SETTINGS } from '../ThemeContext';
import { PAGE_FONT_FAMILIES } from '@/lib/theme-fonts';

const fontLinks = () => [...document.head.querySelectorAll<HTMLLinkElement>('link[href*="fonts.googleapis.com"]')];

const CSS_PATH = join(process.cwd(), 'src/index.css');
const FONT_DIR = join(process.cwd(), 'src/assets/fonts');
const SUBSETS = ['latin', 'latin-ext'] as const;
// Google's own ranges for these subsets, so a character loads the file Google would have sent.
const UNICODE_RANGES: Record<string, string> = {
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  'latin-ext': 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
};

/** Each @font-face in index.css, with the file its url() points at. */
function fontFaces() {
  const css = readFileSync(CSS_PATH, 'utf8');
  return [...css.matchAll(/@font-face \{([^}]*)\}/g)].map(([, body]) => {
    const family = body.match(/font-family: '([^']+)';/)![1];
    const url = body.match(/src: url\('([^']+)'\) format\('woff2'\);/)![1];
    const file = resolve(dirname(CSS_PATH), url);
    const subset = file.endsWith('-latin-ext.woff2') ? 'latin-ext' : 'latin';
    return { family, subset, file, body };
  });
}

/** The lines in a page's head that load fonts. */
const fontLines = (page: string) => readFileSync(join(process.cwd(), page), 'utf8')
  .split('\n').map(line => line.trim()).filter(line => /font|woff2/.test(line));

describe('theme fonts', () => {
  beforeEach(() => localStorage.clear());

  // The default fonts came from Google: a stylesheet added after the first paint (load CLS 0.18 on
  // Subscribers at 390px), then a render-blocking one that held the first paint ~850ms. They're
  // served from our own origin now, preloaded, so the first paint waits on nothing outside.
  it('serves the default fonts from the repo, declared once per family and subset', () => {
    const faces = fontFaces();
    expect(faces.map(f => `${f.family} ${f.subset}`).sort()).toEqual(
      PAGE_FONT_FAMILIES.flatMap(family => SUBSETS.map(subset => `${family} ${subset}`)).sort(),
    );
    for (const face of faces) {
      expect(existsSync(face.file)).toBe(true);
      expect(face.body).toContain('font-weight: 300 700;');
      expect(face.body).toContain('font-display: swap;');
      expect(face.body).toContain(`unicode-range: ${UNICODE_RANGES[face.subset]};`);
    }
    for (const license of ['OFL-Inter.txt', 'OFL-SpaceGrotesk.txt']) {
      expect(readFileSync(join(FONT_DIR, license), 'utf8')).toContain('SIL Open Font License, Version 1.1');
    }
  });

  // At low priority, so on a slow connection the fonts don't hold up the app's code: on emulated
  // slow 4G that put the first paint about 200ms earlier, with the load still not shifting.
  it('preloads exactly the latin files the stylesheet uses, at low priority, the same way in both heads', () => {
    const landing = fontLines('index.html');
    expect(fontLines('demo/index.html')).toEqual(landing);
    const preloaded = landing.map(line => {
      const match = line.match(/^<link rel="preload" href="(\/src\/assets\/fonts\/[\w-]+\.woff2)" as="font" type="font\/woff2" crossorigin fetchpriority="low" \/>$/);
      expect(match, line).not.toBeNull();
      return join(process.cwd(), match![1]);
    });
    const latin = fontFaces().filter(f => f.subset === 'latin').map(f => f.file);
    expect(preloaded.sort()).toEqual(latin.sort());
  });

  it('leaves nothing in either head that waits on Google', () => {
    for (const page of ['index.html', 'demo/index.html']) {
      expect(readFileSync(join(process.cwd(), page), 'utf8')).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    }
  });

  // Until the theme's effect ran, the font variables were unset and the first frame was in a serif.
  it('has the stylesheet set the default fonts before the theme runs', () => {
    const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');
    expect(css).toContain(`--font-display: ${DEFAULT_SETTINGS.displayFont}, sans-serif;`);
    expect(css).toContain(`--font-body: ${DEFAULT_SETTINGS.bodyFont}, sans-serif;`);
    expect(css).toContain(`--font-numeral: ${DEFAULT_SETTINGS.numeralFont}, monospace;`);
  });

  it('adds no stylesheet of its own for the default fonts', () => {
    const existing = fontLinks().length;
    const { unmount } = render(<ThemeProvider><span>Store</span></ThemeProvider>);
    expect(fontLinks().length).toBe(existing);
    unmount();
  });

  it('loads a font the theme changed to at runtime, alone, and removes it when a template preview unmounts', () => {
    localStorage.setItem('cb-theme-settings', JSON.stringify({ displayFont: 'Playfair Display' }));
    const existing = fontLinks().length;
    const { unmount } = render(<ThemeProvider><span>Preview</span></ThemeProvider>);
    const added = fontLinks().slice(existing);
    expect(added).toHaveLength(1);
    expect(added[0].href).toContain('family=Playfair+Display');
    expect(added[0].href).not.toContain('family=Inter');
    unmount();
    expect(fontLinks().length).toBe(existing);
  });
});
