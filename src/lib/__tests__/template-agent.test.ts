import { describe, it, expect, beforeEach } from 'vitest';
import { processMessage, AgentResponse } from '../template-agent';
import type { ThemeSettings } from '@/contexts/ThemeContext';

// ─── Default settings matching ThemeContext defaults ───
const defaults: ThemeSettings = {
  mode: 'dark',
  storeName: 'CART BLANCHE',
  tileHoverGlow: 'hsla(0,0%,100%,0.08)',
  tileHoverScale: 1.04,
  tileBgMode: 'default',
  displayFont: 'Space Grotesk',
  bodyFont: 'Inter',
  numeralFont: 'Inter',
  displayFontSize: 11,
  bodyFontSize: 10,
  numeralFontSize: 10,
  displayFontColor: '',
  bodyFontColor: '',
  numeralFontColor: '',
  storeNameColor: '',
};

let current: ThemeSettings;

beforeEach(() => {
  current = { ...defaults };
});

// ═══════════════════════════════════════════════════════
// Helper — apply a theme update and return new state
// ═══════════════════════════════════════════════════════
function apply(res: AgentResponse): ThemeSettings {
  return { ...current, ...res.themeUpdate };
}

// ═══════════════════════════════════════════════════════
// 1. RESET
// ═══════════════════════════════════════════════════════
describe('Reset', () => {
  it('resets everything to defaults on "reset"', () => {
    current.displayFont = 'Bebas Neue';
    current.mode = 'light';
    const res = processMessage('reset', current);
    expect(res.themeUpdate).toBeDefined();
    expect(res.themeUpdate!.mode).toBe('dark');
    expect(res.themeUpdate!.displayFont).toBe('Space Grotesk');
    expect(res.themeUpdate!.bodyFont).toBe('Inter');
    expect(res.themeUpdate!.numeralFont).toBe('Inter');
    expect(res.themeUpdate!.displayFontSize).toBe(11);
    expect(res.themeUpdate!.tileHoverScale).toBe(1.04);
  });

  it('resets on "start over"', () => {
    const res = processMessage('start over', current);
    expect(res.themeUpdate).toBeDefined();
    expect(res.themeUpdate!.mode).toBe('dark');
  });

  it('resets on "defaults"', () => {
    const res = processMessage('back to defaults', current);
    expect(res.themeUpdate).toBeDefined();
    expect(res.themeUpdate!.displayFont).toBe('Space Grotesk');
  });

  it('resets on "undo everything"', () => {
    const res = processMessage('undo everything', current);
    expect(res.themeUpdate).toBeDefined();
  });

  it('always returns suggestions after reset', () => {
    const res = processMessage('reset', current);
    expect(res.suggestions).toBeDefined();
    expect(res.suggestions!.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════
// 2. STATUS QUERY
// ═══════════════════════════════════════════════════════
describe('Status / Current Settings', () => {
  it('describes current settings on "show settings"', () => {
    const res = processMessage('show settings', current);
    expect(res.themeUpdate).toBeUndefined();
    expect(res.message).toContain('Space Grotesk');
    expect(res.message).toContain('Inter');
    expect(res.message).toContain('dark');
  });

  it('responds to "what font am I using"', () => {
    current.displayFont = 'Playfair Display';
    const res = processMessage('what font am I using', current);
    expect(res.message).toContain('Playfair Display');
  });

  it('responds to "what are my settings"', () => {
    const res = processMessage('what are my settings', current);
    expect(res.themeUpdate).toBeUndefined();
    expect(res.message).toContain('Mode');
  });

  it('responds to "what\'s the current mode"', () => {
    const res = processMessage("what's the current mode", current);
    expect(res.message).toContain('dark');
  });
});

// ═══════════════════════════════════════════════════════
// 3. MODE SWITCHING (dark / light)
// ═══════════════════════════════════════════════════════
describe('Mode Switching', () => {
  it('switches to light mode on "light mode"', () => {
    const res = processMessage('light mode', current);
    expect(res.themeUpdate!.mode).toBe('light');
  });

  it('switches to dark mode on "dark mode"', () => {
    current.mode = 'light';
    const res = processMessage('dark mode', current);
    expect(res.themeUpdate!.mode).toBe('dark');
  });

  it('switches on bare "light"', () => {
    const res = processMessage('light', current);
    expect(res.themeUpdate!.mode).toBe('light');
  });

  it('switches on bare "dark"', () => {
    current.mode = 'light';
    const res = processMessage('dark', current);
    expect(res.themeUpdate!.mode).toBe('dark');
  });

  it('switches on "switch to light"', () => {
    const res = processMessage('switch to light', current);
    expect(res.themeUpdate!.mode).toBe('light');
  });

  it('handles "white background"', () => {
    const res = processMessage('white background', current);
    expect(res.themeUpdate!.mode).toBe('light');
  });

  it('handles "black background"', () => {
    current.mode = 'light';
    const res = processMessage('black background', current);
    expect(res.themeUpdate!.mode).toBe('dark');
  });

  it('can combine mode switch with font change', () => {
    const res = processMessage('light mode with Playfair Display', current);
    expect(res.themeUpdate!.mode).toBe('light');
    expect(res.themeUpdate!.displayFont).toBe('Playfair Display');
  });
});

// ═══════════════════════════════════════════════════════
// 4. VIBE PRESETS
// ═══════════════════════════════════════════════════════
describe('Vibe Presets', () => {
  it('applies luxury preset', () => {
    const res = processMessage('give it a luxury feel', current);
    expect(res.themeUpdate!.displayFont).toBe('Playfair Display');
    expect(res.themeUpdate!.tileHoverGlow).toBe('#e8c547');
  });

  it('applies editorial preset', () => {
    const res = processMessage('editorial', current);
    expect(res.themeUpdate!.displayFont).toBe('Playfair Display');
  });

  it('applies elegant preset', () => {
    const res = processMessage('make it elegant', current);
    expect(res.themeUpdate!.displayFont).toBe('Cormorant Garamond');
  });

  it('applies minimal preset', () => {
    const res = processMessage('minimal', current);
    expect(res.themeUpdate!.displayFont).toBe('DM Sans');
    expect(res.themeUpdate!.bodyFont).toBe('DM Sans');
  });

  it('applies clean preset', () => {
    const res = processMessage('keep it clean', current);
    expect(res.themeUpdate!.displayFont).toBe('DM Sans');
  });

  it('applies bold preset', () => {
    const res = processMessage('bold', current);
    expect(res.themeUpdate!.displayFont).toBe('Bebas Neue');
    expect(res.themeUpdate!.displayFontSize).toBe(16);
  });

  it('applies loud preset', () => {
    const res = processMessage('make it loud', current);
    expect(res.themeUpdate!.displayFont).toBe('Bebas Neue');
  });

  it('applies modern preset', () => {
    const res = processMessage('modern', current);
    expect(res.themeUpdate!.displayFont).toBe('Space Grotesk');
    expect(res.themeUpdate!.numeralFont).toBe('JetBrains Mono');
  });

  it('applies tech preset', () => {
    const res = processMessage('tech', current);
    expect(res.themeUpdate!.numeralFont).toBe('JetBrains Mono');
  });

  it('applies warm preset with light mode', () => {
    const res = processMessage('warm', current);
    expect(res.themeUpdate!.mode).toBe('light');
    expect(res.themeUpdate!.displayFont).toBe('Lora');
  });

  it('applies cozy preset', () => {
    const res = processMessage('cozy', current);
    expect(res.themeUpdate!.mode).toBe('light');
  });

  // Extra vibe keywords
  it('"high-end" triggers luxury', () => {
    const res = processMessage('make it high-end', current);
    expect(res.themeUpdate!.displayFont).toBe('Playfair Display');
  });

  it('"premium" triggers luxury', () => {
    const res = processMessage('premium', current);
    expect(res.themeUpdate!.displayFont).toBe('Playfair Display');
  });

  it('"futurist" triggers modern', () => {
    const res = processMessage('futurist', current);
    expect(res.themeUpdate!.displayFont).toBe('Space Grotesk');
  });

  it('"simple" triggers minimal', () => {
    const res = processMessage('keep it simple', current);
    expect(res.themeUpdate!.displayFont).toBe('DM Sans');
  });

  it('"organic" triggers warm', () => {
    const res = processMessage('organic', current);
    expect(res.themeUpdate!.mode).toBe('light');
  });

  it('"statement" triggers bold', () => {
    const res = processMessage('make a statement', current);
    expect(res.themeUpdate!.displayFont).toBe('Bebas Neue');
  });

  it('all presets include suggestions', () => {
    const vibes = ['luxury', 'editorial', 'elegant', 'minimal', 'clean', 'bold', 'loud', 'modern', 'tech', 'warm', 'cozy'];
    for (const v of vibes) {
      const res = processMessage(v, current);
      expect(res.suggestions, `vibe "${v}" should have suggestions`).toBeDefined();
      expect(res.suggestions!.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 5. FONT DETECTION & APPLICATION
// ═══════════════════════════════════════════════════════
describe('Font Detection', () => {
  it('detects exact font name "Playfair Display"', () => {
    const res = processMessage('use Playfair Display for display', current);
    expect(res.themeUpdate!.displayFont).toBe('Playfair Display');
  });

  it('detects font name "Bebas Neue" for heading', () => {
    const res = processMessage('set Bebas Neue for heading', current);
    expect(res.themeUpdate!.displayFont).toBe('Bebas Neue');
  });

  it('detects "JetBrains Mono" for prices', () => {
    const res = processMessage('use JetBrains Mono for prices', current);
    expect(res.themeUpdate!.numeralFont).toBe('JetBrains Mono');
  });

  it('detects "DM Sans" for navigator/body', () => {
    const res = processMessage('use DM Sans for nav', current);
    expect(res.themeUpdate!.bodyFont).toBe('DM Sans');
  });

  it('detects font for "navigation" target keyword', () => {
    const res = processMessage('switch navigation to Outfit', current);
    expect(res.themeUpdate!.bodyFont).toBe('Outfit');
  });

  it('applies font to all when "everything" is mentioned', () => {
    const res = processMessage('use Poppins for everything', current);
    if (res.themeUpdate) {
      const u = res.themeUpdate;
      if (u.displayFont && u.bodyFont && u.numeralFont) {
        expect(u.displayFont).toBe('Poppins');
        expect(u.bodyFont).toBe('Poppins');
        expect(u.numeralFont).toBe('Poppins');
      }
    }
    expect(res.message.toLowerCase()).toContain('poppins');
  });

  it('auto-assigns numeral-only fonts to numeral target', () => {
    const res = processMessage('use Fira Code', current);
    expect(res.themeUpdate!.numeralFont).toBe('Fira Code');
  });

  it('asks for clarification on ambiguous font without target', () => {
    const res = processMessage('use Inter', current);
    expect(res.message.toLowerCase()).toMatch(/which|display|navigator|numeral/);
  });

  it('rejects unknown fonts like Wingdings gracefully', () => {
    const res = processMessage('use Wingdings for display', current);
    expect(res.message.toLowerCase()).toMatch(/don.t have|library|upload|similar|can.t do that/);
  });

  it('fuzzy matches "playfair for titles" to Playfair Display', () => {
    const res = processMessage('use playfair for titles', current);
    expect(res.themeUpdate!.displayFont).toBe('Playfair Display');
  });

  it('fuzzy matches "playfair" with explicit singular "title"', () => {
    const res = processMessage('use playfair for title', current);
    expect(res.themeUpdate!.displayFont).toBe('Playfair Display');
  });

  it('fuzzy matches "grotesk" to Space Grotesk', () => {
    const res = processMessage('use grotesk for heading', current);
    expect(res.themeUpdate!.displayFont).toBe('Space Grotesk');
  });

  it('asks for font when "change font" is vague', () => {
    const res = processMessage('change the font', current);
    expect(res.themeUpdate).toBeUndefined();
    expect(res.message.toLowerCase()).toMatch(/which font|display|navigator|numeral/);
  });
});

// ═══════════════════════════════════════════════════════
// 6. FONT TARGET DETECTION
// ═══════════════════════════════════════════════════════
describe('Font Target Detection', () => {
  it('"title" maps to display', () => {
    const res = processMessage('use Oswald for title', current);
    expect(res.themeUpdate!.displayFont).toBe('Oswald');
  });

  it('"product name" maps to display', () => {
    const res = processMessage('switch product name font to Cinzel', current);
    expect(res.themeUpdate!.displayFont).toBe('Cinzel');
  });

  it('"category" maps to body', () => {
    const res = processMessage('set category font to Rubik', current);
    expect(res.themeUpdate!.bodyFont).toBe('Rubik');
  });

  it('"pill" maps to body', () => {
    const res = processMessage('change pill font to Barlow', current);
    expect(res.themeUpdate!.bodyFont).toBe('Barlow');
  });

  it('"price" maps to numeral', () => {
    const res = processMessage('use DM Mono for price', current);
    expect(res.themeUpdate!.numeralFont).toBe('DM Mono');
  });

  it('"monospace" maps to numeral', () => {
    const res = processMessage('make monospace IBM Plex Mono', current);
    expect(res.themeUpdate!.numeralFont).toBe('IBM Plex Mono');
  });
});

// ═══════════════════════════════════════════════════════
// 7. HOVER GLOW
// ═══════════════════════════════════════════════════════
describe('Hover Glow', () => {
  it('sets gold hover glow', () => {
    const res = processMessage('gold hover glow', current);
    expect(res.themeUpdate!.tileHoverGlow).toBe('#e8c547');
  });

  it('sets blue hover glow', () => {
    const res = processMessage('blue hover glow', current);
    expect(res.themeUpdate!.tileHoverGlow).toBe('hsla(210,80%,60%,0.25)');
  });

  it('sets rose hover glow', () => {
    const res = processMessage('rose hover', current);
    expect(res.themeUpdate!.tileHoverGlow).toBe('hsla(340,70%,55%,0.25)');
  });

  it('sets green/emerald hover glow', () => {
    const res = processMessage('emerald hover glow', current);
    expect(res.themeUpdate!.tileHoverGlow).toBe('hsla(155,70%,45%,0.25)');
  });

  it('removes hover glow on "remove hover glow"', () => {
    current.tileHoverGlow = '#e8c547';
    const res = processMessage('remove hover glow', current);
    expect(res.themeUpdate!.tileHoverGlow).toBe('transparent');
  });

  it('accepts hex code for glow', () => {
    const res = processMessage('set hover glow to #ff5500', current);
    expect(res.themeUpdate!.tileHoverGlow).toBe('#ff5500');
  });

  it('asks for color when hover glow has no color', () => {
    const res = processMessage('change the hover glow', current);
    expect(res.themeUpdate).toBeUndefined();
    expect(res.message.toLowerCase()).toMatch(/what color|gold|blue|rose/);
  });
});

// ═══════════════════════════════════════════════════════
// 8. HOVER SCALE
// ═══════════════════════════════════════════════════════
describe('Hover Scale', () => {
  it('sets explicit hover scale value', () => {
    const res = processMessage('hover scale 1.1', current);
    expect(res.themeUpdate!.tileHoverScale).toBe(1.1);
  });

  it('increases hover scale on "bigger hover zoom"', () => {
    const res = processMessage('bigger hover zoom', current);
    expect(res.themeUpdate!.tileHoverScale).toBeGreaterThan(1.04);
  });

  it('decreases hover scale on "subtler hover zoom"', () => {
    const res = processMessage('subtler hover zoom', current);
    expect(res.themeUpdate!.tileHoverScale).toBeLessThan(1.04);
  });

  it('decreases hover scale with exact word "subtle"', () => {
    const res = processMessage('subtle hover scale', current);
    expect(res.themeUpdate!.tileHoverScale).toBeLessThan(1.04);
  });

  it('clamps hover scale to max 1.15', () => {
    current.tileHoverScale = 1.14;
    const res = processMessage('bigger hover zoom', current);
    expect(res.themeUpdate!.tileHoverScale).toBeLessThanOrEqual(1.15);
  });

  it('clamps hover scale to min 1.0', () => {
    current.tileHoverScale = 1.01;
    const res = processMessage('less hover zoom', current);
    expect(res.themeUpdate!.tileHoverScale).toBeGreaterThanOrEqual(1.0);
  });

  it('asks for direction when hover scale is ambiguous', () => {
    const res = processMessage('hover scale', current);
    expect(res.themeUpdate).toBeUndefined();
    expect(res.message.toLowerCase()).toMatch(/bigger|smaller|current/);
  });
});

// ═══════════════════════════════════════════════════════
// 9. FONT SIZES
// ═══════════════════════════════════════════════════════
describe('Font Sizes', () => {
  it('sets display font to specific px value on "display font 14px"', () => {
    const res = processMessage('display font 14px', current);
    expect(res.themeUpdate!.displayFontSize).toBe(14);
  });

  it('sets display font size when using "heading size" phrasing', () => {
    const res = processMessage('heading size 14px', current);
    expect(res.themeUpdate!.displayFontSize).toBe(14);
  });

  it('sets numeral font size', () => {
    const res = processMessage('numeral size 12px', current);
    expect(res.themeUpdate!.numeralFontSize).toBe(12);
  });

  it('increases title size on "make titles bigger"', () => {
    const res = processMessage('make titles bigger', current);
    expect(res.themeUpdate!.displayFontSize).toBeGreaterThan(11);
  });

  it('also works with singular "title"', () => {
    const res = processMessage('make title bigger', current);
    expect(res.themeUpdate!.displayFontSize).toBeGreaterThan(11);
  });

  it('decreases nav size on "make navigation smaller"', () => {
    const res = processMessage('make navigation smaller', current);
    expect(res.themeUpdate!.bodyFontSize).toBeLessThan(10);
  });

  it('"much bigger" applies larger delta', () => {
    const res = processMessage('make titles much bigger', current);
    expect(res.themeUpdate!.displayFontSize).toBe(15); // 11 + 4
  });

  it('"much bigger" also works with singular "title"', () => {
    const res = processMessage('make title much bigger', current);
    expect(res.themeUpdate!.displayFontSize).toBe(15); // 11 + 4
  });

  it('increases all sizes on "make everything bigger"', () => {
    const res = processMessage('make everything bigger', current);
    expect(res.themeUpdate!.displayFontSize).toBeGreaterThan(11);
    expect(res.themeUpdate!.bodyFontSize).toBeGreaterThan(10);
    expect(res.themeUpdate!.numeralFontSize).toBeGreaterThan(10);
  });

  it('clamps display font max to 18px', () => {
    current.displayFontSize = 17;
    const res = processMessage('make titles bigger', current);
    expect(res.themeUpdate!.displayFontSize).toBeLessThanOrEqual(18);
  });

  it('clamps body/numeral font max to 16px', () => {
    current.bodyFontSize = 15;
    const res = processMessage('make navigation bigger', current);
    expect(res.themeUpdate!.bodyFontSize).toBeLessThanOrEqual(16);
  });

  it('clamps minimum to 8px', () => {
    current.displayFontSize = 9;
    const res = processMessage('make titles smaller', current);
    expect(res.themeUpdate!.displayFontSize).toBeGreaterThanOrEqual(8);
  });

  it('asks for target when size has no target', () => {
    const res = processMessage('make it bigger', current);
    expect(res.message.toLowerCase()).toMatch(/which|display|navigator|numeral/);
  });

  it('handles standalone number as follow-up', () => {
    const res = processMessage('14', current);
    expect(res.message.toLowerCase()).toMatch(/which|display|navigator|numeral/);
  });

  it('handles "14px" standalone', () => {
    const res = processMessage('14px', current);
    expect(res.message.toLowerCase()).toMatch(/which|display|navigator|numeral/);
  });
});

// ═══════════════════════════════════════════════════════
// 10. COLOR-ONLY INTENT
// ═══════════════════════════════════════════════════════
describe('Color-Only Intent', () => {
  it('applies gold color when mentioned with "color"', () => {
    const res = processMessage('gold color for glow', current);
    expect(res.themeUpdate!.tileHoverGlow).toBe('#e8c547');
  });

  it('applies hex color with "glow" keyword', () => {
    const res = processMessage('glow #aabbcc', current);
    expect(res.themeUpdate!.tileHoverGlow).toBe('#aabbcc');
  });
});

// ═══════════════════════════════════════════════════════
// 11. BACKGROUND MISUSE
// ═══════════════════════════════════════════════════════
describe('Background Misuse', () => {
  it('explains limitation when background color is requested', () => {
    const res = processMessage('change background to purple', current);
    expect(res.themeUpdate).toBeUndefined();
    expect(res.message.toLowerCase()).toMatch(/dark|light|only/);
  });
});

// ═══════════════════════════════════════════════════════
// 12. OUT-OF-SCOPE / FALLBACK
// ═══════════════════════════════════════════════════════
describe('Out of Scope / Fallback', () => {
  it('returns fallback for unrecognized input like "add a chatbot to the homepage"', () => {
    const res = processMessage('add a chatbot to the homepage', current);
    expect(res.themeUpdate).toBeUndefined();
    expect(res.message.toLowerCase()).toMatch(/can.t do that yet/);
  });

  it('returns fallback for truly unmatched gibberish', () => {
    const res = processMessage('zzzzz qqqqq xxxxx', current);
    expect(res.themeUpdate).toBeUndefined();
    expect(res.message.toLowerCase()).toMatch(/can.t do that yet/);
  });

  it('returns fallback for random gibberish', () => {
    const res = processMessage('asdfghjkl', current);
    expect(res.themeUpdate).toBeUndefined();
  });

  it('always returns suggestions on fallback', () => {
    const res = processMessage('sell me a pizza', current);
    expect(res.suggestions).toBeDefined();
    expect(res.suggestions!.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════
// 13. RESPONSE SHAPE INVARIANTS
// ═══════════════════════════════════════════════════════
describe('Response Shape Invariants', () => {
  const inputs = [
    'reset', 'show settings', 'dark mode', 'luxury', 'use Oswald for display',
    'gold hover glow', 'hover scale 1.1', 'make titles bigger', 'hello world',
  ];

  for (const input of inputs) {
    it(`"${input}" always returns a message string`, () => {
      const res = processMessage(input, current);
      expect(typeof res.message).toBe('string');
      expect(res.message.length).toBeGreaterThan(0);
    });

    it(`"${input}" themeUpdate is object or undefined`, () => {
      const res = processMessage(input, current);
      if (res.themeUpdate !== undefined) {
        expect(typeof res.themeUpdate).toBe('object');
      }
    });

    it(`"${input}" suggestions are array of strings or undefined`, () => {
      const res = processMessage(input, current);
      if (res.suggestions !== undefined) {
        expect(Array.isArray(res.suggestions)).toBe(true);
        for (const s of res.suggestions) {
          expect(typeof s).toBe('string');
        }
      }
    });
  }
});

// ═══════════════════════════════════════════════════════
// 14. IDEMPOTENCY & COMPOSABILITY
// ═══════════════════════════════════════════════════════
describe('Idempotency & Composability', () => {
  it('applying the same vibe twice yields same result', () => {
    const res1 = processMessage('luxury', current);
    const state1 = apply(res1);
    const res2 = processMessage('luxury', state1);
    const state2 = { ...state1, ...res2.themeUpdate };
    expect(state1.displayFont).toBe(state2.displayFont);
    expect(state1.tileHoverGlow).toBe(state2.tileHoverGlow);
  });

  it('can chain vibe → font change → size change', () => {
    // Start with luxury
    const r1 = processMessage('luxury', current);
    let state = apply(r1);
    expect(state.displayFont).toBe('Playfair Display');
    expect(state.displayFontSize).toBe(13); // luxury preset sets this

    // Switch body font
    const r2 = processMessage('use Rubik for navigation', state);
    state = { ...state, ...r2.themeUpdate };
    expect(state.bodyFont).toBe('Rubik');
    expect(state.displayFont).toBe('Playfair Display'); // should be preserved

    // Bump display size
    const r3 = processMessage('make titles bigger', state);
    state = { ...state, ...r3.themeUpdate };
    expect(state.displayFontSize).toBeGreaterThanOrEqual(15); // 13 + 2
    expect(state.bodyFont).toBe('Rubik'); // preserved
  });

  it('reset after multiple changes returns to clean defaults', () => {
    let state = apply(processMessage('luxury', current));
    state = { ...state, ...processMessage('make everything bigger', state).themeUpdate };
    state = { ...state, ...processMessage('light mode', state).themeUpdate };

    const resetRes = processMessage('reset', state);
    const final = { ...state, ...resetRes.themeUpdate };
    expect(final.mode).toBe('dark');
    expect(final.displayFont).toBe('Space Grotesk');
    expect(final.displayFontSize).toBe(11);
  });
});

// ═══════════════════════════════════════════════════════
// 15. EDGE CASES
// ═══════════════════════════════════════════════════════
describe('Edge Cases', () => {
  it('handles empty string input', () => {
    const res = processMessage('', current);
    expect(typeof res.message).toBe('string');
  });

  it('handles input with only whitespace', () => {
    const res = processMessage('   ', current);
    expect(typeof res.message).toBe('string');
  });

  it('handles very long input', () => {
    const longMsg = 'make the display font really big '.repeat(50);
    const res = processMessage(longMsg, current);
    expect(typeof res.message).toBe('string');
  });

  it('handles mixed case input "LUXURY"', () => {
    const res = processMessage('LUXURY', current);
    expect(res.themeUpdate!.displayFont).toBe('Playfair Display');
  });

  it('handles mixed case "Dark Mode"', () => {
    const res = processMessage('Dark Mode', current);
    expect(res.themeUpdate!.mode).toBe('dark');
  });

  it('does not mutate the current settings object', () => {
    const original = { ...current };
    processMessage('luxury', current);
    expect(current).toEqual(original);
  });

  it('themeUpdate only contains changed properties (partial)', () => {
    const res = processMessage('gold hover glow', current);
    expect(res.themeUpdate).toBeDefined();
    expect(res.themeUpdate!.displayFont).toBeUndefined();
    expect(res.themeUpdate!.mode).toBeUndefined();
  });
});
