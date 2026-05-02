import type { CSSProperties } from 'react';
import type { Colorway } from '@/data/demo-data';

/**
 * Returns the React CSSProperties object to apply to a swatch
 * circle for the given colorway. Handles three cases in priority
 * order:
 *
 * 1. swatch_image: render as background-image clipped to circle.
 * 2. component_hexes with >= 2 entries: soft linear gradient
 *    blend at 135deg, evenly distributed.
 * 3. Default: solid hex fill.
 */
export function getSwatchStyle(
  colorway: Pick<Colorway, 'hex' | 'swatch_image' | 'component_hexes'>
): CSSProperties {
  if (colorway.swatch_image) {
    return {
      backgroundImage: `url(${colorway.swatch_image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if (colorway.component_hexes && colorway.component_hexes.length >= 2) {
    const stops = colorway.component_hexes
      .map((hex, i, arr) => {
        const pct = arr.length === 1 ? 0 : (i / (arr.length - 1)) * 100;
        return `${hex} ${pct}%`;
      })
      .join(', ');
    return {
      backgroundImage: `linear-gradient(135deg, ${stops})`,
    };
  }
  return {
    backgroundColor: colorway.hex,
  };
}
