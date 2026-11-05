import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

// index.css paints the body in the app's dark :root background, and the landing turns light only once React
// has rendered its .light shell. The landing's own stylesheet (linked in the built page's head, so it applies
// before any script runs) has to paint the page light from the first frame, overscroll included.
const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');

describe('the landing’s first frame', () => {
  it('is the light background, not the app’s dark one', () => {
    const light = read('../../index.css').match(/\.light\s*\{[^}]*--background:\s*([^;]+);/)?.[1].trim();
    expect(light).toBeTruthy();
    const css = read('../landing.css');
    expect(css).toMatch(new RegExp(`html,\\s*body\\s*\\{[^}]*background-color:\\s*hsl\\(${light!.replace(/%/g, '%')}\\)`));
    const main = read('../main.tsx');
    expect(main.indexOf('"./landing.css"')).toBeGreaterThan(main.indexOf('"../index.css"'));
  });
});
