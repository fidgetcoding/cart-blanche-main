/** A Google Fonts stylesheet URL for these families, at the weights the theme uses. Empty for none. */
export function googleFontsUrl(families: string[]): string {
  const unique = [...new Set(families)].filter(f => f && f !== 'system-ui');
  if (unique.length === 0) return '';
  const params = unique
    .map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/**
 * The default theme fonts. They're served from our own origin (@font-face in index.css, files in
 * src/assets/fonts) and preloaded in both pages' heads, so the theme only loads other fonts.
 */
export const PAGE_FONT_FAMILIES = ['Space Grotesk', 'Inter'];
