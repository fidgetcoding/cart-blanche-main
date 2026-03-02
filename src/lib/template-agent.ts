import type { ThemeSettings } from '@/contexts/ThemeContext';

export interface AgentResponse {
  message: string;
  themeUpdate?: Partial<ThemeSettings>;
  suggestions?: string[];
}

const DISPLAY_FONTS = [
  'Space Grotesk', 'Playfair Display', 'Instrument Serif', 'DM Sans',
  'Bebas Neue', 'Oswald', 'Cormorant Garamond', 'JetBrains Mono',
  'Abril Fatface', 'Archivo Black', 'Cinzel', 'Dela Gothic One',
  'Fraunces', 'Libre Baskerville', 'Lora', 'Merriweather',
  'Montserrat', 'Poppins', 'Raleway', 'Syne',
];

const BODY_FONTS = [
  'Inter', 'DM Sans', 'Nunito Sans', 'Work Sans', 'Lato', 'Source Sans 3',
  'Karla', 'Libre Franklin', 'Manrope', 'Outfit',
  'Plus Jakarta Sans', 'Public Sans', 'Roboto', 'Rubik',
  'Sora', 'Urbanist', 'Barlow', 'Figtree', 'Geist', 'Noto Sans',
];

const NUMERAL_FONTS = [
  'Inter', 'JetBrains Mono', 'Space Mono', 'DM Mono', 'IBM Plex Mono',
  'Fira Code', 'Source Code Pro', 'Roboto Mono', 'Ubuntu Mono',
  'Inconsolata', 'Overpass Mono', 'Red Hat Mono', 'Azeret Mono',
  'Cousine', 'Martian Mono', 'Noto Sans Mono', 'Oxygen Mono',
  'PT Mono', 'Share Tech Mono', 'Victor Mono',
];

const ALL_FONTS = [...new Set([...DISPLAY_FONTS, ...BODY_FONTS, ...NUMERAL_FONTS])];

const COLOR_MAP: Record<string, string> = {
  gold: '#e8c547', golden: '#e8c547', amber: '#e8c547',
  blue: 'hsla(210,80%,60%,0.25)', cyan: 'hsla(210,80%,60%,0.25)',
  rose: 'hsla(340,70%,55%,0.25)', pink: 'hsla(340,70%,55%,0.25)', red: 'hsla(340,70%,55%,0.25)',
  green: 'hsla(155,70%,45%,0.25)', emerald: 'hsla(155,70%,45%,0.25)', mint: 'hsla(155,70%,45%,0.25)',
  white: '#ffffff',
  'soft white': 'hsla(0,0%,100%,0.08)', soft: 'hsla(0,0%,100%,0.08)',
  none: 'transparent', off: 'transparent', remove: 'transparent',
};

const VIBE_PRESETS: Record<string, { update: Partial<ThemeSettings>; message: string; suggestions?: string[] }> = {
  luxury: {
    update: { displayFont: 'Playfair Display', tileHoverGlow: '#e8c547', displayFontSize: 13 },
    message: 'Going luxury — switched to Playfair Display at 13px with gold hover glow. Want me to also switch to a serif navigator font like Libre Baskerville?',
    suggestions: ['Use Libre Baskerville for navigation', 'Switch to light mode', 'Make prices bigger', 'Reset to defaults'],
  },
  editorial: {
    update: { displayFont: 'Playfair Display', tileHoverGlow: '#e8c547', displayFontSize: 13 },
    message: 'Editorial look applied — Playfair Display at 13px with gold glow. The preview should feel more high-end now.',
    suggestions: ['Use Cormorant Garamond instead', 'Switch to light mode', 'Make it even bigger', 'Reset to defaults'],
  },
  elegant: {
    update: { displayFont: 'Cormorant Garamond', tileHoverGlow: '#e8c547', displayFontSize: 13 },
    message: 'Elegant mode — Cormorant Garamond at 13px with gold glow. Refined and editorial.',
    suggestions: ['Use Playfair Display instead', 'Switch to light mode', 'Use serif for navigation too', 'Reset to defaults'],
  },
  minimal: {
    update: { displayFont: 'DM Sans', bodyFont: 'DM Sans', tileHoverGlow: 'hsla(0,0%,100%,0.08)', displayFontSize: 10 },
    message: 'Stripped it back — DM Sans across the board, subtle hover glow, compact sizing.',
    suggestions: ['Make titles a bit bigger', 'Switch to light mode', 'Use monospaced prices', 'Reset to defaults'],
  },
  clean: {
    update: { displayFont: 'DM Sans', bodyFont: 'DM Sans', tileHoverGlow: 'hsla(0,0%,100%,0.08)', displayFontSize: 10 },
    message: 'Clean and simple — DM Sans with subtle hover glow.',
    suggestions: ['Switch to light mode', 'Use Inter instead', 'Make prices monospaced', 'Reset to defaults'],
  },
  bold: {
    update: { displayFont: 'Bebas Neue', displayFontSize: 16, tileHoverScale: 1.1 },
    message: 'Bold statement — Bebas Neue at 16px with amplified hover scale. Big and loud.',
    suggestions: ['Use Archivo Black instead', 'Add gold hover glow', 'Make navigation match', 'Reset to defaults'],
  },
  loud: {
    update: { displayFont: 'Bebas Neue', displayFontSize: 16, tileHoverScale: 1.1 },
    message: 'Turned it up — Bebas Neue at 16px with dramatic hover zoom.',
    suggestions: ['Switch to Oswald', 'Gold hover glow', 'Dark mode', 'Reset to defaults'],
  },
  modern: {
    update: { displayFont: 'Space Grotesk', numeralFont: 'JetBrains Mono', tileHoverGlow: 'hsla(210,80%,60%,0.25)' },
    message: 'Modern tech vibe — Space Grotesk with JetBrains Mono numerals and blue hover glow.',
    suggestions: ['Switch to dark mode', 'Use Fira Code for prices', 'Make titles bigger', 'Reset to defaults'],
  },
  tech: {
    update: { displayFont: 'Space Grotesk', numeralFont: 'JetBrains Mono', tileHoverGlow: 'hsla(210,80%,60%,0.25)' },
    message: 'Tech aesthetic — Space Grotesk headings, JetBrains Mono prices, blue glow.',
    suggestions: ['Use DM Mono for prices instead', 'Dark mode', 'Make it bigger', 'Reset to defaults'],
  },
  warm: {
    update: { mode: 'light', displayFont: 'Lora', bodyFont: 'Work Sans', tileHoverGlow: '#e8c547' },
    message: 'Warm and inviting — light mode, Lora headings, Work Sans navigation, gold hover glow.',
    suggestions: ['Switch back to dark mode', 'Use Merriweather instead', 'Make prices bigger', 'Reset to defaults'],
  },
  cozy: {
    update: { mode: 'light', displayFont: 'Lora', bodyFont: 'Work Sans', tileHoverGlow: '#e8c547' },
    message: 'Cozy vibe — light background, serif headings with warm gold glow.',
    suggestions: ['Dark mode instead', 'Bigger titles', 'Use Fraunces', 'Reset to defaults'],
  },
};

function fuzzyMatchFont(input: string): string | null {
  const lower = input.toLowerCase();
  // Exact match first
  const exact = ALL_FONTS.find(f => f.toLowerCase() === lower);
  if (exact) return exact;
  // Starts with
  const starts = ALL_FONTS.find(f => f.toLowerCase().startsWith(lower));
  if (starts) return starts;
  // Contains
  const contains = ALL_FONTS.find(f => f.toLowerCase().includes(lower));
  if (contains) return contains;
  // Check individual words
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    const match = ALL_FONTS.find(f => f.toLowerCase().includes(word));
    if (match) return match;
  }
  return null;
}

function detectFontInInput(input: string): string | null {
  const lower = input.toLowerCase();
  // Try matching longest font names first
  const sorted = [...ALL_FONTS].sort((a, b) => b.length - a.length);
  for (const font of sorted) {
    if (lower.includes(font.toLowerCase())) return font;
  }
  // Try fuzzy on individual segments
  const segments = lower.replace(/[,.]/, '').split(/\s+/);
  // Try pairs
  for (let i = 0; i < segments.length - 1; i++) {
    const pair = `${segments[i]} ${segments[i + 1]}`;
    const match = fuzzyMatchFont(pair);
    if (match) return match;
  }
  // Try singles
  for (const seg of segments) {
    if (['the', 'to', 'for', 'use', 'with', 'and', 'a', 'an', 'make', 'set', 'change', 'switch', 'font', 'display', 'body', 'nav', 'numeral', 'price', 'heading', 'title', 'navigator', 'it', 'my', 'mode', 'dark', 'light'].includes(seg)) continue;
    const match = fuzzyMatchFont(seg);
    if (match) return match;
  }
  return null;
}

function detectColor(input: string): string | null {
  const lower = input.toLowerCase();
  // Hex code
  const hexMatch = input.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) return hexMatch[0];
  // Named colors
  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

function detectFontTarget(input: string): 'display' | 'body' | 'numeral' | null {
  const lower = input.toLowerCase();
  if (/\b(display|heading|title|product name|product title)\b/.test(lower)) return 'display';
  if (/\b(body|nav|navigator|navigation|ui|text|category|pill)\b/.test(lower)) return 'body';
  if (/\b(numeral|price|number|mono|monospace|tabular)\b/.test(lower)) return 'numeral';
  return null;
}

function detectSizeTarget(input: string): 'display' | 'body' | 'numeral' | null {
  const lower = input.toLowerCase();
  if (/\b(display|heading|title)\b/.test(lower)) return 'display';
  if (/\b(body|nav|navigator|navigation|ui|text)\b/.test(lower)) return 'body';
  if (/\b(numeral|price|number)\b/.test(lower)) return 'numeral';
  return null;
}

function clampSize(target: 'display' | 'body' | 'numeral', value: number): number {
  const max = target === 'display' ? 18 : 16;
  return Math.max(8, Math.min(max, value));
}

function describeSettings(s: ThemeSettings): string {
  const glowName = Object.entries(COLOR_MAP).find(([, v]) => v === s.tileHoverGlow)?.[0] || s.tileHoverGlow;
  return `Here's your current setup:\n• Mode: ${s.mode}\n• Display font: ${s.displayFont} at ${s.displayFontSize}px\n• Navigator font: ${s.bodyFont} at ${s.bodyFontSize}px\n• Numeral font: ${s.numeralFont} at ${s.numeralFontSize}px\n• Hover glow: ${glowName}\n• Hover scale: ${s.tileHoverScale}`;
}

export function processMessage(input: string, current: ThemeSettings): AgentResponse {
  const lower = input.toLowerCase().trim();

  // 1. Reset
  if (/\b(reset|defaults?|start over|undo (all|everything))\b/.test(lower)) {
    return {
      message: 'Reset everything to defaults — dark mode, Space Grotesk, Inter, standard sizes.',
      themeUpdate: {
        mode: 'dark', tileHoverGlow: 'hsla(0,0%,100%,0.08)', tileHoverScale: 1.04,
        displayFont: 'Space Grotesk', bodyFont: 'Inter', numeralFont: 'Inter',
        displayFontSize: 11, bodyFontSize: 10, numeralFontSize: 10,
      },
      suggestions: ['Give it a luxury feel', 'Switch to light mode', 'Use a bold display font', 'Try a modern tech vibe'],
    };
  }

  // 2. Status query
  if (/\b(current|what font|what are my|show settings|what('s| is) (the|my))\b/.test(lower)) {
    return {
      message: describeSettings(current),
      suggestions: ['Switch to light mode', 'Try a serif display font', 'Make everything bigger', 'Reset to defaults'],
    };
  }

  // 3. Background intent
  if (/\b(dark mode|light mode|dark background|light background|white background|black background)\b/.test(lower)) {
    const mode = lower.includes('light') || lower.includes('white') ? 'light' : 'dark';
    // Also check for other changes in the same message
    const update: Partial<ThemeSettings> = { mode };
    let msg = `Switched to ${mode} mode.`;

    // Check for additional intents in same message
    const color = detectColor(lower.replace(/dark|light|background|mode|white|black/g, ''));
    if (color) {
      update.tileHoverGlow = color;
      const colorName = Object.entries(COLOR_MAP).find(([, v]) => v === color)?.[0] || color;
      msg += ` Also set hover glow to ${colorName}.`;
    }
    const font = detectFontInInput(lower.replace(/dark|light|background|mode/g, ''));
    if (font) {
      const target = detectFontTarget(lower);
      if (target === 'body') { update.bodyFont = font; msg += ` Navigator font set to ${font}.`; }
      else if (target === 'numeral') { update.numeralFont = font; msg += ` Numeral font set to ${font}.`; }
      else { update.displayFont = font; msg += ` Display font set to ${font}.`; }
    }

    return { message: msg + ' Check the preview →', themeUpdate: update };
  }

  // Check for simple dark/light toggle
  if (/^(dark|light)$/.test(lower) || (lower.includes('switch') && /\b(dark|light)\b/.test(lower) && !lower.includes('font'))) {
    const mode = lower.includes('light') ? 'light' : 'dark';
    return {
      message: `Switched to ${mode} mode.`,
      themeUpdate: { mode },
    };
  }

  // 4. Hover glow intent
  if (/\b(hover|glow|highlight)\b/.test(lower) && !/\b(scale|zoom|size|bigger|smaller)\b/.test(lower)) {
    const color = detectColor(lower);
    if (color) {
      const colorName = Object.entries(COLOR_MAP).find(([, v]) => v === color)?.[0] || color;
      return {
        message: `Updated hover glow to ${colorName}. Check the preview →`,
        themeUpdate: { tileHoverGlow: color },
      };
    }
    return {
      message: 'What color do you want for the hover glow? I have gold, blue, rose, emerald, white, or you can give me a hex code like #ff5500.',
      suggestions: ['Gold hover glow', 'Blue hover glow', 'Rose hover glow', 'Remove hover glow'],
    };
  }

  // 5. Hover scale intent
  if (/\b(hover)\b/.test(lower) && /\b(scale|zoom|size|bigger|smaller|grow|animation)\b/.test(lower)) {
    const numMatch = lower.match(/\b(1\.?\d*)\b/);
    if (numMatch) {
      const val = Math.max(1.0, Math.min(1.15, parseFloat(numMatch[1])));
      return {
        message: `Set hover scale to ${val}. Tiles will ${val > 1.04 ? 'grow more' : val < 1.04 ? 'grow less' : 'use default zoom'} on hover.`,
        themeUpdate: { tileHoverScale: val },
      };
    }
    if (/\b(bigger|more|larger|dramatic|amplif)\b/.test(lower)) {
      const val = Math.min(1.15, current.tileHoverScale + 0.03);
      return { message: `Bumped hover scale from ${current.tileHoverScale} to ${val}.`, themeUpdate: { tileHoverScale: val } };
    }
    if (/\b(smaller|less|subtle|reduce|none|off)\b/.test(lower)) {
      const val = Math.max(1.0, current.tileHoverScale - 0.03);
      return { message: `Reduced hover scale from ${current.tileHoverScale} to ${val}.`, themeUpdate: { tileHoverScale: val } };
    }
    return {
      message: `Current hover scale is ${current.tileHoverScale}. Do you want it bigger (more zoom) or smaller (subtler)? Range is 1.0 to 1.15.`,
      suggestions: ['Bigger hover zoom', 'Subtler hover zoom', 'No hover zoom (1.0)', 'Dramatic hover zoom (1.15)'],
    };
  }

  // 8. Vibe intent (check before font to avoid false matches)
  for (const [keyword, preset] of Object.entries(VIBE_PRESETS)) {
    if (lower.includes(keyword)) {
      return {
        message: preset.message,
        themeUpdate: preset.update,
        suggestions: preset.suggestions,
      };
    }
  }
  // Extra vibe keywords
  if (/\b(luxur|high.?end|premium)\b/.test(lower)) {
    const p = VIBE_PRESETS.luxury;
    return { message: p.message, themeUpdate: p.update, suggestions: p.suggestions };
  }
  if (/\b(futurist)\b/.test(lower)) {
    const p = VIBE_PRESETS.modern;
    return { message: p.message, themeUpdate: p.update, suggestions: p.suggestions };
  }
  if (/\b(simple|strip)\b/.test(lower)) {
    const p = VIBE_PRESETS.minimal;
    return { message: p.message, themeUpdate: p.update, suggestions: p.suggestions };
  }
  if (/\b(organic)\b/.test(lower)) {
    const p = VIBE_PRESETS.warm;
    return { message: p.message, themeUpdate: p.update, suggestions: p.suggestions };
  }
  if (/\b(statement)\b/.test(lower)) {
    const p = VIBE_PRESETS.bold;
    return { message: p.message, themeUpdate: p.update, suggestions: p.suggestions };
  }

  // 6. Font intent
  const detectedFont = detectFontInInput(lower);
  if (detectedFont || /\b(font)\b/.test(lower)) {
    if (!detectedFont && /\b(change|switch|set|update)\b/.test(lower) && /\b(font)\b/.test(lower)) {
      // Ambiguous font change
      return {
        message: 'Which font do you want to change — Display (product titles), Navigator (nav labels), or Numeral (prices)? And what font should I use?',
        suggestions: ['Use Playfair Display for titles', 'Use DM Sans for navigation', 'Use JetBrains Mono for prices', 'Show current settings'],
      };
    }
    if (detectedFont) {
      const target = detectFontTarget(lower);
      if (!target) {
        // Check if font is only in one list
        const inDisplay = DISPLAY_FONTS.includes(detectedFont);
        const inBody = BODY_FONTS.includes(detectedFont);
        const inNumeral = NUMERAL_FONTS.includes(detectedFont);
        const onlyNumeral = inNumeral && !inDisplay && !inBody;
        if (onlyNumeral) {
          return {
            message: `Switched numeral font to ${detectedFont}. Your prices now use it.`,
            themeUpdate: { numeralFont: detectedFont },
          };
        }
        // Ambiguous - ask
        return {
          message: `I found ${detectedFont}. Which do you want to change — Display (product titles), Navigator (nav labels), or Numeral (prices)? Or all three?`,
          suggestions: [`${detectedFont} for display`, `${detectedFont} for navigator`, `${detectedFont} for numerals`, `${detectedFont} for everything`],
        };
      }
      const update: Partial<ThemeSettings> = {};
      let targetLabel = '';
      if (target === 'display') { update.displayFont = detectedFont; targetLabel = 'display'; }
      else if (target === 'body') { update.bodyFont = detectedFont; targetLabel = 'navigator'; }
      else { update.numeralFont = detectedFont; targetLabel = 'numeral'; }

      // Check for "everything" / "all"
      if (/\b(all|everything|every|across the board)\b/.test(lower)) {
        update.displayFont = detectedFont;
        update.bodyFont = detectedFont;
        update.numeralFont = detectedFont;
        return { message: `Set ${detectedFont} across all fonts — display, navigator, and numeral.`, themeUpdate: update };
      }

      return {
        message: `Switched ${targetLabel} font to ${detectedFont}. Check the preview →`,
        themeUpdate: update,
      };
    }
    // Font keyword but no recognized font
    const fontNameGuess = lower.replace(/\b(use|change|switch|set|the|font|to|for|display|body|nav|navigator|numeral|price|heading|title|my|a|an)\b/g, '').trim();
    if (fontNameGuess.length > 2) {
      return {
        message: `I don't have "${fontNameGuess}" in the library. You can upload a custom font (.woff2, .ttf, .otf) using the Upload button in the Theme Settings panel. Or want me to suggest something similar?`,
        suggestions: ['Use Poppins', 'Use Syne', 'Use Fraunces', 'Show available fonts'],
      };
    }
  }

  // Check for "all" / "everything" with a font
  if (/\b(all|everything|every)\b/.test(lower) && detectedFont) {
    return {
      message: `Set ${detectedFont} for all fonts.`,
      themeUpdate: { displayFont: detectedFont, bodyFont: detectedFont, numeralFont: detectedFont },
    };
  }

  // 7. Size intent
  if (/\b(bigger|smaller|larger|size|px)\b/.test(lower)) {
    const target = detectSizeTarget(lower);
    const specificNum = lower.match(/\b(\d{1,2})\s*(px)?\b/);

    if (specificNum && target) {
      const val = clampSize(target, parseInt(specificNum[1]));
      const key = target === 'display' ? 'displayFontSize' : target === 'body' ? 'bodyFontSize' : 'numeralFontSize';
      const label = target === 'display' ? 'Display' : target === 'body' ? 'Navigator' : 'Numeral';
      return {
        message: `Set ${label} font to ${val}px.`,
        themeUpdate: { [key]: val },
      };
    }

    if (specificNum && !target) {
      // Number but no target — could be continuing a conversation
      // Try to guess from context — for now ask
      const val = parseInt(specificNum[1]);
      return {
        message: `Got ${val}px — which font size should I change? Display (titles), Navigator (nav), or Numeral (prices)?`,
        suggestions: [`Display font to ${val}px`, `Navigator font to ${val}px`, `Numeral font to ${val}px`, `All fonts to ${val}px`],
      };
    }

    if (target) {
      const key = target === 'display' ? 'displayFontSize' : target === 'body' ? 'bodyFontSize' : 'numeralFontSize';
      const label = target === 'display' ? 'Display' : target === 'body' ? 'Navigator' : 'Numeral';
      const currentVal = current[key];
      const isMuch = /\b(much|way|lot|super|really|very)\b/.test(lower);
      const delta = isMuch ? 4 : 2;
      const direction = /\b(bigger|larger|increase|up|more)\b/.test(lower) ? 1 : -1;
      const newVal = clampSize(target, currentVal + delta * direction);
      return {
        message: `${direction > 0 ? 'Bumped' : 'Reduced'} ${label} font from ${currentVal}px to ${newVal}px.`,
        themeUpdate: { [key]: newVal },
      };
    }

    // No target
    if (/\b(everything|all)\b/.test(lower)) {
      const isMuch = /\b(much|way|lot|super|really|very)\b/.test(lower);
      const delta = isMuch ? 4 : 2;
      const direction = /\b(bigger|larger|increase|up|more)\b/.test(lower) ? 1 : -1;
      return {
        message: `${direction > 0 ? 'Increased' : 'Decreased'} all font sizes by ${delta}px.`,
        themeUpdate: {
          displayFontSize: clampSize('display', current.displayFontSize + delta * direction),
          bodyFontSize: clampSize('body', current.bodyFontSize + delta * direction),
          numeralFontSize: clampSize('numeral', current.numeralFontSize + delta * direction),
        },
      };
    }

    return {
      message: `Which size — Display (${current.displayFontSize}px), Navigator (${current.bodyFontSize}px), or Numeral (${current.numeralFontSize}px)? And how much?`,
      suggestions: ['Make titles bigger', 'Make navigation bigger', 'Make prices bigger', 'Make everything bigger'],
    };
  }

  // Standalone number (follow-up context)
  const standaloneNum = lower.match(/^(\d{1,2})\s*(px)?$/);
  if (standaloneNum) {
    const val = parseInt(standaloneNum[1]);
    if (val >= 8 && val <= 18) {
      return {
        message: `Got ${val} — which font size should I set? Display, Navigator, or Numeral?`,
        suggestions: [`Display font to ${val}px`, `Navigator font to ${val}px`, `Numeral font to ${val}px`, `All to ${val}px`],
      };
    }
  }

  // Color-only intent (without hover keyword)
  const color = detectColor(lower);
  if (color && /\b(color|glow|hover)\b/.test(lower)) {
    const colorName = Object.entries(COLOR_MAP).find(([, v]) => v === color)?.[0] || color;
    return {
      message: `Updated hover glow to ${colorName}.`,
      themeUpdate: { tileHoverGlow: color },
    };
  }

  // Background color misuse
  if (/\b(background)\b/.test(lower) && !/\b(dark|light)\b/.test(lower)) {
    return {
      message: "Background mode only supports Dark or Light right now. Want me to switch between them? If you're looking to add color, I can change the tile hover glow instead.",
      suggestions: ['Switch to dark mode', 'Switch to light mode', 'Change hover glow color', 'Show current settings'],
    };
  }

  // 9. Out of scope
  return {
    message: "I can't do that yet — right now I can adjust background mode, hover effects, fonts, and font sizes. What would you like to tweak?",
    suggestions: ['Show current settings', 'Give it a luxury feel', 'Switch to light mode', 'Reset to defaults'],
  };
}
